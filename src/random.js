export function random(w){let x=w.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;w.rng=x>>>0;return w.rng/4294967296;}
export const pick=(w,a)=>a[Math.floor(random(w)*a.length)];
export const integer=(w,a,b)=>a+Math.floor(random(w)*(b-a+1));
export function seed(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)||1;}
export function id(w,prefix){return `${prefix}-${++w.sequence}`;}
const first='Silver Lunar Northern Midnight Eclipse Willow Winter Ember River Royal Velvet Chasing Reckless Almost Wild Copper Quiet Scarlet Golden Hidden Ocean Autumn Bright Distant Rising Dancing Summer Western Eastern Gentle Bold Crimson Amber Cloud Mist Lucky Silent'.split(' ');
const last='Victory Echo Secret Promise Trouble Fortune Storm Glory Crown Dream Light Song Moon Tide Fire Road Wind Dawn Heart Sky Star Wish Rain Sun Valley Meadow Harbor Flight Spark Whisper Rhythm Wonder Journey Memory Legend'.split(' ');
export function name(w){const used=new Set(Object.values(w.horses).map(h=>h.name.toLowerCase()));for(let i=0;i<10000;i++){const a=pick(w,first),b=pick(w,last),n=pick(w,[`${a} ${b}`,`${b} of ${pick(w,last)}`,`${a} in ${pick(w,last)}`]);if(n.length<=18&&!used.has(n.toLowerCase()))return n;}throw Error('Name pool exhausted; choose a registered name.');}
