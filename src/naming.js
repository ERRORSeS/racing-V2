import {pick} from './random.js';
export const NAMING_PRESETS=['Short / Classic','Long OXO','Extra Long / Poetic','Official Registry Naming'];
export function nameLimit(w,country=w.country){return w.settings?.namingPreset==='Official Registry Naming'?18:120;}
const nouns=('Wildflowers Horizon Sunrise Skies Stardust Symphony Moonlight Promises Thunder Meadows Ocean Rivers Mountains Willow Rainfall Snowfall Embers Orchard Starlight Constellations Planets Comets Kingdom Crown Fortune Wishes Dreamers Echoes Whispers Heartbeats Memories Tomorrow Midnight Dawn Twilight Spring Summer Autumn Winter Silver Copper Bronze Gold Sapphire Emerald Opal Ruby Diamond Aurora Phoenix Pegasus Artemis Apollo Atlas Harmony Melody Sonata Overture Cadence Footsteps Journey Gallop Flight Hope Courage Wonder Solace Joy Serenity Longing').split(' ');
const adjectives=('Northern Southern Silver Golden Copper Crimson Violet Azure Emerald Scarlet Quiet Wandering Forgotten Unfinished Restless Fearless Distant Endless Timeless Gentle Daring Hidden Sacred Secret Last First Final Waking Dreaming Dancing Falling Rising Shining Burning Laughing Lonely Brave Tender Lucky Royal Ancient Celestial Misty Stormy Sunlit Moonlit Winter Summer Velvet Wild Coastal Mountain Saffron').split(' ');
const movement=('Sleep Dance Wander Wait Run Return Rise Sing Shine Dream Fly Whisper Roam Bloom Wake Drift Race').split(' ');
const verbs=('Dancing Wandering Dreaming Running Drifting Flying Racing Sailing Singing Whispering Wishing Searching Chasing Remembering').split(' ');
const countable='Chance Promise Dream Memory Echo Fortune Kingdom Journey Symphony Melody Wish Star Comet Horizon River Mountain Orchard Jewel Crown Overture Sonata Footstep Flight Secret Whisper Ballad Garden Season'.split(' ');
const plurals='Wishes Dreams Memories Echoes Promises Stars Comets Horizons Rivers Mountains Orchards Jewels Crowns Footsteps Secrets Whispers Ballads Gardens Seasons Wildflowers Heartbeats Journeys Symphonies Melodies'.split(' ');
const pluralSubjects=new Set('Wildflowers Skies Promises Rivers Mountains Embers Constellations Planets Comets Wishes Dreamers Echoes Whispers Heartbeats Memories Footsteps'.split(' '));
const singularVerb=verb=>verb==='Fly'?'Flies':/s$/.test(verb)?`${verb}es`:`${verb}s`;
export function composedName(w,preset='Long OXO'){
 const n=()=>pick(w,nouns),count=()=>pick(w,countable),many=()=>pick(w,plurals),a=()=>pick(w,adjectives),v=()=>pick(w,verbs),link=()=>pick(w,['Beyond','Beneath','Across','Before','After','Through','Beside','Within','Under']);
 const pattern=pick(w,[0,1,2,3,4,5,6,7]);let text;
 switch(pattern){
 case 0:{const adjective=a(),noun=n(),verb=pick(w,movement);text=`Where the ${adjective} ${noun} ${pluralSubjects.has(noun)?verb:singularVerb(verb)}`;break;}
 case 1:text=`An Echo ${link()} the ${a()} ${n()}`;break;
 case 2:text=`A Thousand ${many()} ${link()} ${n()}`;break;
 case 3:text=`The ${a()} Promise of ${a()} ${n()}`;break;
 case 4:text=`${v()} ${link()} Another ${a()} ${count()}`;break;
 case 5:{const subject=n();text=`If ${subject} ${pluralSubjects.has(subject)?'Belong':'Belongs'} to ${n()}`;break;}
 case 6:text=`All the ${many()} We Left ${link()} ${n()}`;break;
 default:text=`Another ${count()} ${link()} the ${a()} ${n()}`;
 }
 if(preset==='Extra Long / Poetic')text=`${v()} ${link()} the ${a()} ${n()} of ${a()} ${n()}`;
 return text;
}
