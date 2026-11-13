// Coalesces rapid actions, serializes writes and lets time skips await durability.
export function createSaveQueue(persist,{delay=700,onStatus=()=>{}}={}){
 let latest=null,revision=0,saved=0,inFlight=null,timer=null;
 function schedule(world){latest=world;revision++;clearTimeout(timer);onStatus('Changes pending');timer=setTimeout(()=>flush().catch(()=>{}),delay);}
 async function flush(){
  clearTimeout(timer);
  if(inFlight){await inFlight;return saved<revision?flush():undefined;}
  if(saved===revision)return;
  const target=revision,snapshot=latest;onStatus('Saving…');
  inFlight=Promise.resolve().then(()=>persist(snapshot));
  try{await inFlight;saved=target;onStatus(saved===revision?'Saved':'Changes pending');}catch(error){onStatus('Save failed: '+error.message);throw error;}finally{inFlight=null;}
  if(saved<revision)return flush();
 }
 return {schedule,flush,get dirty(){return saved<revision;}};
}
