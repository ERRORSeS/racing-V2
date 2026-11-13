export const RULES = Object.freeze({schema:1,monthDays:30,yearDays:360,trainingGain:0.45,trainingFatigue:9,restRecovery:7,marketPriceBase:250000,saveKey:'thoroughbred-racing.world.v1'});
export const COUNTRIES = {
USA:{surface:'dirt',track:'Liberty Downs',ageMonth:1}, UK:{surface:'turf',track:'Willow Heath',ageMonth:1}, Ireland:{surface:'turf',track:'Emerald Park',ageMonth:1}, France:{surface:'turf',track:'Val de Lune',ageMonth:1}, Japan:{surface:'turf',track:'Hoshikawa',ageMonth:1}, Australia:{surface:'turf',track:'Southern Reach',ageMonth:8}, UAE:{surface:'dirt',track:'Desert Crown',ageMonth:1}, International:{surface:'synthetic',track:'Meridian Park',ageMonth:1}};
export const SKILLS=['speed','stamina','gate','focus','handling','recovery'];
export const MOODS=['Motivated','Happy','Try-Hard','Neutral','Uncomfortable','Distress','Overly-Active','No Energy','Bad Mood','Grumpy'];
export function date(day){return {year:Math.floor(day/360)+1,month:Math.floor((day%360)/30)+1,day:day%30+1};}
export function dateLabel(day){const d=date(day);return `Year ${d.year} · Month ${d.month} · Day ${d.day}`;}
export function age(h,day){const boundary=(COUNTRIES[h.country].ageMonth-1)*30;return Math.floor((day-boundary)/360)-Math.floor((h.born-boundary)/360);}
export function cents(value){if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw Error('Enter a non-negative amount with at most two decimal places.');const [a,b='']=String(value).split('.');return (BigInt(a)*100n+BigInt(b.padEnd(2,'0'))).toString();}
export function money(value){const n=BigInt(value);return `${n<0n?'-':''}$${(n<0n?-n:n)/100n}`.replace(/\B(?=(\d{3})+(?!\d))/g,',')+`.${String((n<0n?-n:n)%100n).padStart(2,'0')}`;}
