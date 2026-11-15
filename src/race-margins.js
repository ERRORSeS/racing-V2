// Synthetic flat-racing conversions, recorded with each new result. Never applied
// retrospectively to a completed race. These are jurisdiction approximations.
export function lengthsPerSecond(f){
 if(['UK','Ireland','France'].includes(f.country))return f.going==='soft'?5:f.surface==='synthetic'?6:5.5;
 if(f.country==='USA')return f.surface==='dirt'?6:5.5;
 return f.going==='soft'?5:5.5;
}
export function beatenLengths(time,winnerTime,f){return Math.max(0,time-winnerTime)*lengthsPerSecond(f);}
export function marginText(lengths){
 if(lengths==null)return 'Pulled up';if(lengths===0)return 'Dead heat / level';
 if(lengths<=.06)return 'Nose';if(lengths<=.12)return 'Short head';if(lengths<=.2)return 'Head';if(lengths<=.3)return 'Neck';
 if(lengths<=.4)return '¼ length';if(lengths<=.625)return '½ length';if(lengths<=.875)return '¾ length';
 return `${Number(lengths.toFixed(2))} lengths`;
}
export function finishAwards(runners,f,shares){
 const awards=[];let at=0;
 while(at<runners.length){const first=runners[at];if(first.time==null){for(;at<runners.length;at++)awards.push({place:null,margin:null,prize:'0',deadHeat:false});break;}
  let end=at+1;while(end<runners.length&&runners[end].time!=null&&runners[end].time-first.time<=.005)end++;
  let pool=0n;for(let i=at;i<end;i++)pool+=BigInt(f.purse)*BigInt(Math.round((shares[i]||0)*100))/100n;
  const count=BigInt(end-at),each=pool/count,remainder=pool%count;
  for(let i=at;i<end;i++)awards.push({place:at+1,margin:at===0?0:beatenLengths(first.time,runners[0].time,f),prize:String(each+(BigInt(i-at)<remainder?1n:0n)),deadHeat:end-at>1});at=end;
 }return awards;
}

export function replayPosition(result,position){const row=result.rows.find(row=>row.horseId===position.horseId);return {...position,finishTime:row?.time??null,officialMargin:row?.margin??null,officialPlace:row?.place??null,officialDeadHeat:!!row?.deadHeat};}
