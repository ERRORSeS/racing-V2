import { LOCI, coatFromGenome, incompatibleGenotypes } from './genetics.js';
import { SKILL_IDS } from './skill-definitions.js';
import { ownedHorse, event, charge } from './core.js';
export function editGenetics(w,horseId,changes,acknowledge=false){
 if(!w.settings.creativeMode)throw Error('Enable explicit Creative Mode to edit genes or innate caps.');
 const h=ownedHorse(w,horseId),children=Object.values(w.horses).filter(c=>c.sire===h.id||c.dam===h.id);if(children.length&&!acknowledge)throw Error('Acknowledge that existing offspring retain their original genomes.');
 const next=structuredClone(h.genome);
 for(const [key,alleles]of Object.entries(changes.loci||{})){if(!LOCI[key]||alleles.length!==2||alleles.some(a=>!LOCI[key].alleles.includes(a)))throw Error('Invalid allele.');if(LOCI[key].mode==='expanded'&&!w.settings.expandedGenetics&&alleles.some(a=>a!==h.genome.loci[key].alleles[alleles.indexOf(a)]))throw Error('Enable expanded coat genetics before editing creative-only variants.');next.loci[key]={alleles:[...alleles],confidence:'verified',mode:LOCI[key].mode};}
 const risk=incompatibleGenotypes(next);if(risk)throw Error(risk);
 for(const [key,value]of Object.entries(changes.caps||{}))if(!SKILL_IDS.includes(key)||!Number.isFinite(value)||value<0||value>100)throw Error('Caps must be 0–100.');
 w.geneticEdits??=[];w.geneticEdits.push({horseId,day:w.day,before:structuredClone(h.genome),previousCaps:structuredClone(h.potential),note:'Explicit creative edit; existing descendants and historical results preserved.'});
 h.genome=next;h.genome.parentageStatus='creativeEdited';h.originRules.creativeEdited=true;h.coat=coatFromGenome(next,{face:h.coat.face,legs:h.coat.legs});for(const [key,value]of Object.entries(changes.caps||{})){h.potential[key]=value;h.skills[key]=Math.min(h.skills[key],value);}event(w,'genetics',`${h.name}: explicit creative genome/cap revision; existing offspring unchanged.`,h.id);
}
export function dnaPanel(w,horseId){const h=ownedHorse(w,horseId);charge(w,h,'25000','Coat genotype panel',h.id);h.genome.knownGeneticTests.push({day:w.day,loci:Object.keys(h.genome.loci),report:'Supported stored loci recorded. Unknown historical variants remain unknown where no materialized DNA exists; complex athletic markers are simulation-only.'});event(w,'genetics',`${h.name}: coat genotype panel recorded with uncertainty preserved.`,h.id);}
