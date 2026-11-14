// FIFO advancement: rapid clicks are retained, conflicting mutations wait, and
// navigation can keep reading the latest committed UI snapshot.
export function createAdvanceQueue(run,{onChange=()=>{}}={}){
 const jobs=[];let running=false;
 async function drain(){if(running)return;running=true;
  while(jobs.length){const job=jobs[0];try{job.resolve(await run(job.days));}catch(error){job.reject(error);for(const pending of jobs.slice(1))pending.reject(Error('Queued skips stopped after an error; check the last saved date.'));jobs.length=0;break;}jobs.shift();onChange(jobs.length);}
  running=false;onChange(0);
 }
 return {enqueue(days){return new Promise((resolve,reject)=>{jobs.push({days,resolve,reject});onChange(jobs.length);void drain();});},get active(){return running||jobs.length>0;},get length(){return jobs.length;}};
}
