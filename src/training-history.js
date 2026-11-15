// NPC records retain every recorded field as packed JSON. Decode only the horse
// being inspected; avoid retaining millions of nested session objects in memory.
export function horseTrainingHistory(w,h,limit=30){
 const recent=w.sessions.filter(s=>s.horseId===h.id).slice(-limit),packed=(h.npcTrainingArchive||[]).slice(-limit).map(s=>JSON.parse(s));
 return [...packed,...recent].sort((a,b)=>a.day-b.day).slice(-limit);
}
