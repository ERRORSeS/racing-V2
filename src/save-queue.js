// Coalesces rapid actions, serializes writes and lets time skips await durability.
export function createSaveQueue(persist,{delay=700,retryDelays=[],onStatus=()=>{}}={}){
 let latest=null,revision=0,saved=0,inFlight=null,timer=null,failures=0;
 function schedule(world){latest=world;revision++;clearTimeout(timer);onStatus(delay===null?'Unsaved changes':'Changes pending');if(delay!==null)timer=setTimeout(()=>flush().catch(()=>{}),delay);}
 async function flush(){
  clearTimeout(timer);
  if(inFlight){await inFlight;return saved<revision?flush():undefined;}
  if(saved===revision)return;
  const target=revision,snapshot=latest;onStatus('Saving…');
  inFlight=Promise.resolve().then(()=>persist(snapshot));
  try{await inFlight;failures=0;saved=target;if(saved===revision)latest=null;onStatus(saved===revision?'Saved':'Changes pending');}catch(error){onStatus('Save failed: '+error.message);if(failures<retryDelays.length&&!/another tab|revision|snapshot differs/i.test(error.message)){const delay=retryDelays[failures++];timer=setTimeout(()=>flush().catch(()=>{}),delay);}throw error;}finally{inFlight=null;}
  if(saved<revision)return flush();
 }
 return {schedule,flush,async wait(){while(inFlight)await inFlight;},get dirty(){return saved<revision;}};
}
