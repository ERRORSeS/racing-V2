import { horse } from './core.js';
import { seed } from './random.js';
import { COUNTRIES } from './rules.js';

// Separate deterministic stream: viewing or selecting a prospect cannot reroll it.
export function prepareStarters({country='USA',worldSeed='first-light',count=5}={}) {
  if(!COUNTRIES[country]||!Number.isSafeInteger(count)||count<1)throw Error('Invalid prospect catalog.');
  const key=seed(`${worldSeed}:prospects:${country}`),w={day:0,rng:key,sequence:0,horses:{},owners:{player:{name:'Prospect selection',country},archive:{name:'Historical breeding archive',country}}};
  const roots=[];for(let i=0;i<count;i++)roots.push(horse(w,'player',country,{},2).id);
  const remap=id=>id?`prospect-${key}-${id}`:null;
  const horses={};for(const h of Object.values(w.horses)){const x=structuredClone(h);x.id=remap(h.id);x.sire=remap(h.sire);x.dam=remap(h.dam);if(x.youngstock)x.youngstock.companions=x.youngstock.companions.map(remap);x.historyRecorded=roots.includes(h.id);horses[x.id]=x;}
  return {country,worldSeed,count,ids:roots.map(remap),horses};
}
export function prospectCards(catalog) {
  return catalog.ids.map((id,i)=>{const h=catalog.horses[id];return {catalogId:id,selected:i<3,name:h.name,sex:h.sex,potential:h.potential.speed,ability:h.skills.speed,temperament:h.temperament,spookiness:h.spookiness,surface:h.surface,distance:h.distance,base:h.coat.extension==='ee'?'chestnut':h.coat.agouti==='aa'?'black':'bay',shade:h.coat.shade,gray:h.coat.gray,tobiano:h.coat.tobiano,face:h.coat.face,identity:h};});
}
