import { runBackgroundJob } from './background-jobs.js';
let chain=Promise.resolve();
self.onmessage=({data})=>{chain=chain.then(()=>runBackgroundJob(data,message=>self.postMessage(message)));};
