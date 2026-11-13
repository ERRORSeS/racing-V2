import { SKILL_IDS } from './skill-definitions.js';
export const RULES = Object.freeze({
  schema: 5, monthDays: 30, yearDays: 360, trainingGain: 0.45,
  trainingFatigue: 9, restRecovery: 7, marketPriceBase: 250000,
  saveKey: 'thoroughbred-racing.world.v1', // Retain original key for automatic migration.
  minRaceSoundness: 80, maxRaceFatigue: 55, minRaceRest: 5,
  fieldSize: 8, raceFormVariation: .22, injuryRisk: 0.00012, farrierCycle: 45,
  gestation: [320, 340], postFoalingRest: 45,
  purseShares: [0.60, 0.22, 0.12, 0.04, 0.02],
  vetFee: '15000', farrierFee: '12000', rehabFee: '50000', inspectionFee: '25000',
  transportFee: '100000', collectionFee: '25000',
});
export const COUNTRIES = {
  USA: { surface: 'dirt', track: 'Liberty Downs', ageMonth: 1, currency: 'USD', grade: 'Grade' },
  UK: { surface: 'turf', track: 'Willow Heath', ageMonth: 1, currency: 'GBP', grade: 'Group' },
  Ireland: { surface: 'turf', track: 'Emerald Park', ageMonth: 1, currency: 'EUR', grade: 'Group' },
  France: { surface: 'turf', track: 'Val de Lune', ageMonth: 1, currency: 'EUR', grade: 'Group' },
  Japan: { surface: 'turf', track: 'Hoshikawa', ageMonth: 1, currency: 'JPY', grade: 'Grade' },
  Australia: { surface: 'turf', track: 'Southern Reach', ageMonth: 8, currency: 'AUD', grade: 'Group' },
  UAE: { surface: 'dirt', track: 'Desert Crown', ageMonth: 1, currency: 'AED', grade: 'Group' },
  International: { surface: 'synthetic', track: 'Meridian Park', ageMonth: 1, currency: 'USD', grade: 'Grade' },
};
export const SKILLS = SKILL_IDS;
export const MOODS = ['Motivated', 'Happy', 'Try-Hard', 'Neutral', 'Uncomfortable', 'Distress', 'Overly-Active', 'No Energy', 'Bad Mood', 'Grumpy'];
export const MOOD_FACTORS = { Motivated: 1.035, Happy: 1.025, 'Try-Hard': 1.03, Neutral: 1, Uncomfortable: .97, Distress: .90, 'Overly-Active': .96, 'No Energy': .94, 'Bad Mood': .96, Grumpy: .98 };
export const FEEDS = ['Balanced', 'Young Horse', 'Performance', 'High Energy', 'Calm & Easy', 'Weight Gain', 'Recovery', 'Senior', 'Broodmare'];
export const TACTICS = ['front', 'pace', 'stalk', 'close'];
export const TRAITS = ['Bold Starter', 'Slow Breaker', 'Strong Finisher', 'Front Runner', 'Patient Closer', 'Loves Soft Ground', 'Quick Learner', 'Quick Recovery', 'Travel Anxiety', 'Needs Turnout', 'Easygoing', 'Gate Anxious'];
export const SEVERITIES = { Easy: [30, 60], Medium: [60, 120], 'More Than Medium': [120, 210], Severe: [240, 360], 'Very Severe': [361, 540] };
export function date(day) { return { year: Math.floor(day / 360) + 1, month: Math.floor(((day % 360 + 360) % 360) / 30) + 1, day: ((day % 30 + 30) % 30) + 1 }; }
export function dateLabel(day) { const d = date(day); return `Year ${d.year} · Month ${d.month} · Day ${d.day}`; }
export function age(h, day) { const boundary = (COUNTRIES[h.country].ageMonth - 1) * 30; return Math.floor((day - boundary) / 360) - Math.floor((h.born - boundary) / 360); }
export function cents(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(String(value))) throw Error('Enter a non-negative amount with at most two decimal places.');
  const [a, b = ''] = String(value).split('.'); return (BigInt(a) * 100n + BigInt(b.padEnd(2, '0'))).toString();
}
export function decimal(value) { const n = BigInt(value), a = n < 0n ? -n : n; return `${n < 0n ? '-' : ''}${a / 100n}.${String(a % 100n).padStart(2, '0')}`; }
export function money(value) { const [a, b] = decimal(value).split('.'); return `${a.startsWith('-') ? '-' : ''}$${a.replace('-', '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${b}`; }
export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
