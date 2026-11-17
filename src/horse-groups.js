import {ownedHorse} from './core.js';
import {id} from './random.js';
export function createHorseGroup(w,name){
 name=String(name||'').trim();if(!name||name.length>60||/[<>]/.test(name))throw Error('Use a tab name of 1–60 plain-text characters.');
 if(['All horses','Memorial'].some(n=>n.toLowerCase()===name.toLowerCase())||(w.horseGroups||[]).some(g=>g.name.toLowerCase()===name.toLowerCase()))throw Error('Choose a unique tab name.');
 const group={id:id(w,'horse-group'),name};(w.horseGroups??=[]).push(group);return group;
}
export function addHorseToGroup(w,horseId,groupId){
 const h=ownedHorse(w,horseId);if(!(w.horseGroups||[]).some(g=>g.id===groupId))throw Error('Choose an existing horse tab.');
 h.horseGroupIds=[...new Set([...(h.horseGroupIds||[]),groupId])];return h;
}
export function validateHorseGroups(w){
 if(w.horseGroups===undefined)return;
 if(!Array.isArray(w.horseGroups))throw Error('Invalid horse tabs.');const ids=new Set(),names=new Set();
 for(const g of w.horseGroups){if(typeof g.id!=='string'||typeof g.name!=='string'||!g.name.trim()||g.name.length>60||/[<>]/.test(g.name)||ids.has(g.id)||names.has(g.name.toLowerCase()))throw Error('Invalid horse tab.');ids.add(g.id);names.add(g.name.toLowerCase());}
 for(const h of Object.values(w.horses))if(h.horseGroupIds&&(!Array.isArray(h.horseGroupIds)||h.horseGroupIds.some(id=>!ids.has(id))))throw Error('Invalid horse tab membership.');
}
