import { advanceWorld } from './world.js';
self.onmessage=({data})=>{try{advanceWorld(data.world,data.days);self.postMessage({world:data.world});}catch(error){self.postMessage({error:error.message});}};
