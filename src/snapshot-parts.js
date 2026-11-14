// Bounded JSON records: never stringify an entire career or its growing archives.
const APPEND=new Set(['events','ledger','sessions']);
const MERGE=new Set(['horses','results','fixtures']);
export function snapshotHash(text){let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return (n>>>0).toString(16);}
const keep=v=>v!==undefined&&typeof v!=='function'&&typeof v!=='symbol';
export function* snapshotParts(snapshot,{delta=false,maxChars=512*1024}={}){
 const scalars={},collections=[];
 for(const [field,value]of Object.entries(snapshot)){
  if(value&&typeof value==='object')collections.push({field,shape:Array.isArray(value)?'array':'object',count:Array.isArray(value)?value.length:Object.values(value).filter(keep).length});
  else if(keep(value))scalars[field]=value;
 }
 yield {kind:'parts-start',payload:JSON.stringify({version:1,delta,scalars,collections})};
 for(const {field,shape}of collections){
  const value=snapshot[field];let tokens=[],size=2;
  const entries=shape==='array'?value.entries():Object.entries(value);
  for(const [key,item]of entries){
   const json=JSON.stringify(item);if(json===undefined&&shape==='object')continue;
   const token=shape==='array'?(json??'null'):`${JSON.stringify(key)}:${json}`;
   if(tokens.length&&size+token.length+1>maxChars){yield {kind:'parts-data',field,shape,payload:(shape==='array'?'[':'{')+tokens.join(',')+(shape==='array'?']':'}')};tokens=[];size=2;}
   tokens.push(token);size+=token.length+1;
  }
  if(tokens.length)yield {kind:'parts-data',field,shape,payload:(shape==='array'?'[':'{')+tokens.join(',')+(shape==='array'?']':'}')};
 }
}
export function beginSnapshotParts(w,header){
 if(header.version!==1||!Array.isArray(header.collections)||!header.scalars||typeof header.delta!=='boolean')throw Error('Invalid partitioned save header.');
 if(header.delta&&!w)throw Error('Snapshot patch has no base.');
 w=header.delta?Object.assign(w,header.scalars):{...header.scalars};
 const fields=new Map();for(const c of header.collections){if(fields.has(c.field)||!['array','object'].includes(c.shape)||!Number.isSafeInteger(c.count)||c.count<0)throw Error('Invalid partitioned collection.');fields.set(c.field,{...c,read:0});if(!header.delta||!APPEND.has(c.field)&&!MERGE.has(c.field))w[c.field]=c.shape==='array'?[]:{};else w[c.field]??=c.shape==='array'?[]:{};}
 return {world:w,delta:header.delta,fields,fixtureIndexes:null};
}
export function applySnapshotPart(state,record,part){
 const c=state.fields.get(record.field),w=state.world;
 if(!c||c.shape!==record.shape||c.shape==='array'&&!Array.isArray(part)||c.shape==='object'&&(!part||Array.isArray(part)||typeof part!=='object'))throw Error('Invalid partitioned save data.');
 const values=c.shape==='array'?part:Object.entries(part);c.read+=values.length;
 if(c.read>c.count)throw Error('Partitioned save contains extra records.');
 if(c.field==='fixtures'&&state.delta){state.fixtureIndexes??=new Map(w.fixtures.map((f,i)=>[f.id,i]));for(const f of part){const index=state.fixtureIndexes.get(f.id);if(index==null){state.fixtureIndexes.set(f.id,w.fixtures.length);w.fixtures.push(f);}else w.fixtures[index]=f;}return;}
 if(c.shape==='array'){for(const value of part)w[c.field].push(value);return;}
 for(const [key,value]of values){
  if(c.field==='horses'&&state.delta&&value._historyAppend){const {_historyAppend,...next}=value,previous=w.horses[key];for(const name of ['starts','ownership','soundnessHistory','durabilityEvents','valuationHistory'])if(Array.isArray(value[name]))next[name]=[...(previous?.[name]||[]),...value[name]];w.horses[key]=next;}
  else Object.defineProperty(w[c.field],key,{value,enumerable:true,writable:true,configurable:true});
 }
}
export function finishSnapshotParts(state){if([...state.fields.values()].some(c=>c.read!==c.count))throw Error('Partitioned save is incomplete. Original autosave has not been changed.');return state.world;}
export function portableSnapshotBlob(w){return new Blob([JSON.stringify({format:'first-light-portable-parts-v1',version:1})+'\n',...Array.from(snapshotParts(w),record=>new Blob([JSON.stringify({...record,checksum:snapshotHash(record.payload)})+'\n']))],{type:'application/x-ndjson'});}
export async function readPortableSnapshot(file){
 let state=null,header=false,buffer='';const reader=file.stream().pipeThrough(new TextDecoderStream()).getReader();
 function checkedParse(text){const value=JSON.parse(text),pending=[value];while(pending.length){const item=pending.pop();if(typeof item==='string'&&/[<>]/.test(item))throw Error('Save contains unsupported markup.');if(item&&typeof item==='object')for(const nested of Object.values(item))pending.push(nested);}return value;}
 function line(text){if(!text.trim())return;const record=JSON.parse(text);if(!header){if(record.format!=='first-light-portable-parts-v1')throw Error('Unsupported portable save format.');header=true;return;}if(record.checksum!==snapshotHash(record.payload||''))throw Error('Portable save checksum failed. Original career is unchanged.');if(record.kind==='parts-start'){if(state)throw Error('Portable save contains multiple careers.');state=beginSnapshotParts(null,checkedParse(record.payload));if(state.delta)throw Error('Portable save is missing its full base.');}else if(record.kind==='parts-data'&&state)applySnapshotPart(state,record,checkedParse(record.payload));else throw Error('Invalid portable save record.');}
 try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=value;let index;while((index=buffer.indexOf('\n'))>=0){line(buffer.slice(0,index));buffer=buffer.slice(index+1);}}if(buffer.trim())line(buffer);if(!state)throw Error('Portable save is empty.');return finishSnapshotParts(state);}finally{reader.releaseLock();}
}
