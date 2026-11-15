import { runBackgroundJob } from './background-jobs.js';
let chain=Promise.resolve();
self.onmessage=({data})=>{chain=chain.then(()=>runBackgroundJob(data,message=>self.postMessage(message))).catch(error=>self.postMessage({requestId:data.requestId,error:error.message||'Background work failed.'}));};
