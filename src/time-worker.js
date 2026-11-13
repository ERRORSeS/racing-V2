import { seedPedigreeCareers } from './history.js';
import { advanceWorld, createWorld } from './world.js';
import { saveCareer, loadCareer, decode } from './storage.js';
let chain=Promise.resolve();
self.onmessage=({data})=>{chain=chain.then(async()=>{
 try{
  if(data.type==='load'){const world=await loadCareer();if(world&&!world.pedigreeHistoryVersion&&world.settings.historyYears>0){seedPedigreeCareers(world);await saveCareer(world);}self.postMessage({requestId:data.requestId,world});return;}
  if(data.type==='save'){await saveCareer(data.world);self.postMessage({requestId:data.requestId,saved:true});return;}
  const world=data.type==='create'?createWorld(data.config):data.type==='import'?decode(data.text):data.world;
  if(data.type==='import'&&!world.pedigreeHistoryVersion&&world.settings.historyYears>0)seedPedigreeCareers(world);
  if(data.type==='advance'||!data.type){advanceWorld(world,data.days);if(world.settings.historyYears>0)seedPedigreeCareers(world);}
  await saveCareer(world);self.postMessage({requestId:data.requestId,world,saved:true});
 }catch(error){self.postMessage({requestId:data.requestId,error:error.message});}
});};
