import { GENETIC_MODEL, SKILL_IDS } from './skill-definitions.js';
import { clamp } from './rules.js';
import { pick, random, integer, seed } from './random.js';
export const LOCI=Object.freeze({
 MC1R:{label:'Extension / MC1R',alleles:['E','e'],mode:'realistic',normal:['EE','Ee','ee']},
 ASIP:{label:'Agouti / ASIP',alleles:['A','a'],mode:'realistic'},
 GRAY:{label:'Progressive gray',alleles:['G','g'],mode:'realistic'},
 SLC45A2:{label:'Cream / pearl (same locus)',alleles:['N','Cr','Prl'],mode:'expanded'},
 DUN:{label:'Dun',alleles:['D','nd1','nd2'],mode:'expanded'},
 SILVER:{label:'Silver',alleles:['Z','z'],mode:'expanded'},
 CHAMPAGNE:{label:'Champagne',alleles:['Ch','ch'],mode:'expanded'},
 MUSHROOM:{label:'Mushroom',alleles:['Mu','mu'],mode:'expanded'},
 KIT:{label:'KIT variant haplotypes',alleles:['N','SB1','W20','W5'],mode:'expanded',linked:true},
 SPLASH:{label:'Splashed white SW1',alleles:['N','SW1'],mode:'expanded'},
 TOBIANO:{label:'Tobiano',alleles:['T','t'],mode:'expanded'},
 FRAME:{label:'Frame / EDNRB',alleles:['N','O'],mode:'expanded'},
 MSTN:{label:'MSTN distance association',alleles:['C','T'],mode:'realistic'},
});
const normal={MC1R:['E','e'],ASIP:['A','a'],GRAY:['g','g'],SLC45A2:['N','N'],DUN:['nd2','nd2'],SILVER:['z','z'],CHAMPAGNE:['ch','ch'],MUSHROOM:['Mu','Mu'],KIT:['N','N'],SPLASH:['N','N'],TOBIANO:['t','t'],FRAME:['N','N'],MSTN:['C','T']};
const pair=(a,confidence='verified',mode='realistic')=>({alleles:[...a],confidence,mode});
export function founderGenome(w,expanded=false){
 const loci={};for(const [key,def]of Object.entries(LOCI)){
  let a=[...normal[key]];if(key==='MC1R')a=[pick(w,['E','E','e']),pick(w,['E','e','e'])];if(key==='ASIP')a=[pick(w,['A','A','a']),pick(w,['A','a'])];if(key==='GRAY'&&random(w)<.18)a=['G','g'];if(key==='MSTN')a=[pick(w,['C','T']),pick(w,['C','T'])];
  if(expanded&&def.mode==='expanded'&&random(w)<.08)a=[pick(w,def.alleles),normal[key][1]];
  loci[key]=pair(a,'verified',def.mode);
 }
 const quantitativeHaplotypes={};for(let b=0;b<GENETIC_MODEL.blocks;b++){
  const quality=[pick(w,[0,1,1,2,2,2,2,2,2,3,3,4]),pick(w,[0,1,1,2,2,2,2,2,2,3,3,4])];
  quantitativeHaplotypes[`SIM_BLOCK_${b}`]=quality.map(q=>Array.from({length:GENETIC_MODEL.markers},()=>clamp(q+pick(w,[-1,0,0,0,1]),0,4)));
 }
 const deviations=Object.fromEntries(SKILL_IDS.map(k=>[k,integer(w,-GENETIC_MODEL.developmentDeviation,GENETIC_MODEL.developmentDeviation)]));
 return {version:1,parentageStatus:'founder_prior_unobserved',sourceConfidence:'modeled',modeAtBirth:expanded?'expanded':'realistic',loci,quantitativeHaplotypes,developmentalModifiers:deviations,modifierAlleles:{shade:integer(w,0,100),white:integer(w,0,100),grayRate:integer(w,70,130)},knownGeneticTests:[],healthVariantFlags:[],novelMutationEvents:[]};
}
export function legacyGenome(h,worldSeed='legacy'){
 const stream={rng:seed(`${worldSeed}:${h.id}:legacy-genome`)};const g=founderGenome(stream,false);
 const coat=h.coat;g.loci.MC1R=pair(coat.extension.split(''),'inferred');g.loci.ASIP=pair(coat.agouti.split(''),'inferred');g.loci.GRAY=pair((coat.grayGene|| (coat.gray?'Gg':'gg')).split(''),'inferred');g.loci.TOBIANO=pair((coat.tobianoGene||(coat.tobiano?'Tt':'tt')).split(''),'inferred','expanded');
 for(const key of Object.keys(g.loci))if(!['MC1R','ASIP','GRAY','TOBIANO'].includes(key))g.loci[key]=pair([null,null],'unknown',LOCI[key].mode);
 g.parentageStatus='legacyInferred';g.sourceConfidence='approximate';g.modeAtBirth=coat.tobiano?'expanded':'realistic';return g;
}
function gamete(w,haps){let side=integer(w,0,1);return haps[0].map((_,i)=>{if(i>0&&random(w)<GENETIC_MODEL.recombination)side=1-side;return haps[side][i];});}
export function inheritGenome(w,sire,dam){
 const loci={};for(const [key,def]of Object.entries(LOCI)){
  const a=sire.loci[key],b=dam.loci[key];loci[key]=pair([a?pick(w,a.alleles):null,b?pick(w,b.alleles):null],a?.confidence==='verified'&&b?.confidence==='verified'?'verified':a?.confidence==='unknown'||b?.confidence==='unknown'?'unknown':'inferred',def.mode);
 }
 // KIT-region haplotypes retain phase; the small recombination default is a game approximation.
 for(const [parent,position]of [[sire,0],[dam,1]]){let side=integer(w,0,1);loci.KIT.alleles[position]=parent.loci.KIT.alleles[side];if(random(w)<.02)side=1-side;loci.TOBIANO.alleles[position]=parent.loci.TOBIANO.alleles[side];}
 const quantitativeHaplotypes={};for(const key of Object.keys(sire.quantitativeHaplotypes))quantitativeHaplotypes[key]=[gamete(w,sire.quantitativeHaplotypes[key]),gamete(w,dam.quantitativeHaplotypes[key])];
 return {version:1,parentageStatus:'inherited',sourceConfidence:sire.sourceConfidence==='approximate'||dam.sourceConfidence==='approximate'?'approximate':'modeled',modeAtBirth:sire.modeAtBirth==='realistic'&&dam.modeAtBirth==='realistic'?'realistic':'expanded',loci,quantitativeHaplotypes,developmentalModifiers:Object.fromEntries(SKILL_IDS.map(k=>[k,integer(w,-5,5)])),modifierAlleles:{shade:clamp(Math.round((sire.modifierAlleles.shade+dam.modifierAlleles.shade)/2)+integer(w,-20,20)),white:clamp(Math.round((sire.modifierAlleles.white+dam.modifierAlleles.white)/2)+integer(w,-20,20)),grayRate:clamp(Math.round((sire.modifierAlleles.grayRate+dam.modifierAlleles.grayRate)/2)+integer(w,-15,15),50,150)},knownGeneticTests:[],healthVariantFlags:[],novelMutationEvents:[]};
}
export function geneticCeilings(g){
 const out={};for(let i=0;i<SKILL_IDS.length;i++){
  const k=SKILL_IDS[i],shared=g.quantitativeHaplotypes.SIM_BLOCK_0,own=g.quantitativeHaplotypes[`SIM_BLOCK_${1+i%3}`];let sum=0;
  for(let m=0;m<8;m++)sum+=(shared[0][m]+shared[1][m]-4)*.4+(own[0][(m+i)%8]+own[1][(m+i)%8]-4)*.6;
  out[k]=clamp(Math.round(GENETIC_MODEL.populationMean+sum*GENETIC_MODEL.alleleWeight+(g.developmentalModifiers[k]||0)),GENETIC_MODEL.minimum,100);
 }return out;
}
export function incompatibleGenotypes(g){const a=g.loci.FRAME?.alleles||[],kit=g.loci.KIT?.alleles||[];return a.every(x=>x==='O')?'EDNRB O/O is incompatible with a viable foal.':kit.every(x=>x==='W5')?'This modeled KIT W5/W5 combination is incompatible.':null;}
export function matingGeneticRisk(sire,dam){for(const [key,allele]of [['FRAME','O'],['KIT','W5']])if(sire.genome?.loci[key]?.alleles.includes(allele)&&dam.genome?.loci[key]?.alleles.includes(allele))return `Both carry ${allele}; incompatible homozygous outcomes are possible. This mating is blocked in the welfare-safe game model.`;return null;}
export function coatFromGenome(g,markings=null){
 const a=k=>g.loci[k]?.alleles||[null,null],count=(key,allele)=>a(key).filter(x=>x===allele).length;
 const extension=a('MC1R').includes(null)?markings?.extension||'Ee':a('MC1R').includes('E')?count('MC1R','E')===2?'EE':'Ee':'ee';
 const agouti=a('ASIP').includes(null)?markings?.agouti||'Aa':a('ASIP').includes('A')?count('ASIP','A')===2?'AA':'Aa':'aa';
 const white=g.modifierAlleles.white,pattern= count('TOBIANO','T')?'Tobiano':count('KIT','SB1')?'Sabino 1':count('KIT','W5')?'Dominant white W5':count('KIT','W20')?'W20 white spotting':count('SPLASH','SW1')?'Splashed white':count('FRAME','O')?'Frame carrier':null;
 const extent=pattern?(white<34?'Minimal':white<67?'Medium':'Maximal'):'Ordinary markings';
 return {extension,agouti,gray:a('GRAY').includes('G'),grayGene:a('GRAY').filter(Boolean).join('')||'unknown',tobiano:!!count('TOBIANO','T'),tobianoGene:a('TOBIANO').filter(Boolean).join('')||'unknown',shade:g.modifierAlleles.shade<34?'Light':g.modifierAlleles.shade<67?'Medium':'Dark',face:markings?.face||(white>75?'Broad blaze':white>50?'Blaze':white>25?'Star':'None'),legs:markings?.legs||[0,1,2,3].map(i=>white+i*4>75?'Stocking':white+i*4>50?'Sock':white+i*4>25?'Pastern':'None'),pattern,expression:extent,whiteExpression:white,creamCopies:count('SLC45A2','Cr'),pearlCopies:count('SLC45A2','Prl'),dun:a('DUN').includes('D'),primitiveMarkings:!a('DUN').includes('D')&&a('DUN').includes('nd1'),silver:a('SILVER').includes('Z'),champagne:a('CHAMPAGNE').includes('Ch'),mushroom:count('MUSHROOM','mu')===2};
}
export function phenotypeDescription(h,day=0){
 const c=h.coat,base=c.extension==='ee'?'chestnut':c.agouti==='aa'?'black':'bay';let display=base;
 if(c.champagne)display={chestnut:'gold champagne',bay:'amber champagne',black:'classic champagne'}[base];
 if(c.creamCopies===2)display={chestnut:'cremello',bay:'perlino',black:'smoky cream'}[base];else if(c.creamCopies===1&&c.pearlCopies===1)display=`cream-pearl diluted ${base}`;else if(c.creamCopies===1)display={chestnut:'palomino',bay:'buckskin',black:'smoky black'}[base];else if(c.pearlCopies===2)display=`pearl diluted ${base}`;
 if(c.dun)display=`dun ${display}`;if(c.silver&&base!=='chestnut')display=`silver ${display}`;if(c.mushroom&&base==='chestnut')display=`mushroom ${display}`;
 const years=(day-h.born)/360,gray=c.gray?` • ${years>=8?'light gray':years>=4?'dapple gray':'early gray'} overlay (base ${base})`:'';
 return `${c.shade.toLowerCase()} ${display}${gray}${c.pattern?` • ${c.expression} ${c.pattern}`:c.tobiano?' • fictional tobiano':''}`;
}
export function locusOutcomes(sire,dam,key){const a=sire.genome?.loci[key],b=dam.genome?.loci[key];if(!a||!b||a.confidence==='unknown'||b.confidence==='unknown'||[...a.alleles,...b.alleles].includes(null))return {unknown:true,message:'Unknown alleles: exact probabilities are unavailable.'};const counts={};for(const x of a.alleles)for(const y of b.alleles){const k=[x,y].sort().join('/');counts[k]=(counts[k]||0)+.25;}return {unknown:false,confidence:a.confidence==='verified'&&b.confidence==='verified'?'verified':'conditional on inferred legacy alleles',outcomes:counts};}
export function breedingPreview(sire,dam,samples=128){const stream={rng:seed(`preview:${sire.id}:${dam.id}:${sire.genome.version}:${dam.genome.version}`)},values=[];for(let n=0;n<samples;n++)values.push(geneticCeilings(inheritGenome(stream,sire.genome,dam.genome)));const range=key=>{const a=values.map(v=>v[key]).sort((a,b)=>a-b);return {low:a[Math.floor(samples*.1)],high:a[Math.floor(samples*.9)],mean:Math.round(a.reduce((s,n)=>s+n,0)/samples)};};return {speed:range('speed'),stamina:range('stamina'),kick:range('kick'),loci:Object.fromEntries(Object.keys(LOCI).map(k=>[k,locusOutcomes(sire,dam,k)])),warning:'Simulated polygenic ranges, not guaranteed class or a real DNA prediction. Preview uses a separate RNG stream.'};}
