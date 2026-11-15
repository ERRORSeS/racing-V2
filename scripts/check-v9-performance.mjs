import {performance} from 'node:perf_hooks';
import {createWorld,advanceWorld} from '../src/world.js';
import {horse} from '../src/core.js';
import {validate} from '../src/storage.js';
const w=createWorld({country:'USA',seed:'v9-population-benchmark',historyYears:0,creativeMode:true,starterEducation:'race_ready',starters:[{}]});w.settings.injuryFrequency=0;
const owners=Object.keys(w.owners).filter(id=>!['player','archive'].includes(id));
for(const extra of [0,1000,2000]){
 for(let i=0;i<extra;i++){const owner=owners[i%owners.length];horse(w,owner,w.owners[owner].country,{},1,w.day-1080);}
 const before=Object.keys(w.horses).length,start=performance.now();advanceWorld(w,7);const ms=performance.now()-start;validate(w);
 console.log(JSON.stringify({days:7,startingHorses:before,endingHorses:Object.keys(w.horses).length,simulationMs:Math.round(ms),results:Object.keys(w.results).length,heapMB:Math.round(process.memoryUsage().heapUsed/1024/1024)}));
}
