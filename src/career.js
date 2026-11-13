import { age } from './rules.js';
import { phenotype } from './core.js';

const careerCache=new WeakMap();
// Career totals are selectors over committed starts, never mutable display counters.
export function career(h) {
  const cached=careerCache.get(h);if(cached?.starts===h.starts&&cached.length===h.starts.length)return cached.value;
  const starts = h.starts.filter(s => s.status !== 'scratched');
  const wins = starts.filter(s => s.place === 1).length;
  const seconds = starts.filter(s => s.place === 2).length;
  const thirds = starts.filter(s => s.place === 3).length;
  const value={
    starts: starts.length, wins, seconds, thirds,
    record: `${starts.length}(${wins}-${seconds}-${thirds})`,
    earnings: starts.reduce((n, s) => n + BigInt(s.prize || '0'), 0n).toString(),
    stakesWins: starts.filter(s=>s.place===1&&(s.tier||0)>=4).length,blackType:starts.some(s=>s.blackType&&s.place!=null&&s.place<=3),highestGrade:starts.slice().sort((a,b)=>(b.tier||0)-(a.tier||0))[0]?.grade||null,lastFive:starts.slice(-5).map(s=>s.place??'PU'),
    best: starts.some(s=>s.place!=null) ? Math.min(...starts.filter(s=>s.place!=null).map(s=>s.place)) : null,
  };
  careerCache.set(h,{starts:h.starts,length:h.starts.length,value});return value;
}
export function description(h, day) {
  const years = age(h, day), c = career(h);
  const stage = years < 2 ? 'youngstock' : h.status === 'retired' ? 'retired breeding prospect' : c.starts ? 'raced Thoroughbred' : 'unstarted prospect';
  const behavior = h.temperament >= 70 ? 'steady to handle' : h.temperament < 35 ? 'spirited and demanding' : 'moderately reactive';
  return `A ${phenotype(h, day)} ${years}-year-old ${h.sex}, ${stage}. Best suited to ${h.surface} over ${h.distance}m; ${behavior}${h.spookiness > 70 ? ' and sensitive to surprises' : ''}. ${h.traits?.slice(0, 2).join(' and ') || 'Individual strengths are still being assessed'}.`;
}
export function relatives(w, h) {
  return Object.values(w.horses).filter(x => x.id !== h.id && ((h.sire && x.sire === h.sire) || (h.dam && x.dam === h.dam)));
}
// Numerator relationship matrix over all reachable ancestors. Unknown founders are unrelated.
export function kinship(w, first, second) {
  const nodes = new Map();
  function visit(id,depth=0) { if (!id || nodes.has(id)||depth>12) return; const h = w.horses[id]; if (!h) return; nodes.set(id, h); visit(h.sire,depth+1); visit(h.dam,depth+1); }
  visit(first); visit(second);
  const sorted = [...nodes.values()].sort((a,b) => a.born-b.born || a.id.localeCompare(b.id));
  const rows = new Map();
  const relation = (a,b) => rows.get(a)?.get(b) || rows.get(b)?.get(a) || 0;
  for (const h of sorted) {
    const row = new Map(); rows.set(h.id,row);
    for (const other of sorted) { if(other.id===h.id) break; row.set(other.id, .5*(relation(h.sire,other.id)+relation(h.dam,other.id))); }
    row.set(h.id,1+.5*relation(h.sire,h.dam));
  }
  return relation(first,second)/2;
}
export function pedigreeComplete(w, id, depth=4) {
  if(depth===0)return true; const h=w.horses[id];return !!h?.sire&&!!h?.dam&&pedigreeComplete(w,h.sire,depth-1)&&pedigreeComplete(w,h.dam,depth-1);
}
