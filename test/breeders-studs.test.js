import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../src/world.js';
import {content} from '../src/ui.js';
import {recruitAccomplishedSires} from '../src/stud.js';
import {career} from '../src/career.js';
import {validate} from '../src/storage.js';
test('Breeder stock opens a dedicated sale view with purchase actions and parent profiles',()=>{
 const w=createWorld({country:'USA',seed:'breeder-stock',historyYears:0,starters:[{}]});
 const l=w.listings.find(l=>l.kind==='private'),h=w.horses[l.horseId];
 const html=content(w,{tab:'Breeders',breeder:l.seller,query:'',page:0,countryFilter:'All',sexFilter:'All',sort:'name'});
 assert.ok(html.includes('All breeders'));assert.ok(html.includes(h.name));assert.ok(html.includes(`data-id="${l.id}"`));assert.ok(html.includes('View career &amp; parents')||html.includes('View career & parents'));assert.ok(!html.includes('Breeders & stable dynasties'));
 l.closed=true;assert.ok(!content(w,{tab:'Breeders',breeder:l.seller,query:'',page:0,countryFilter:'All',sexFilter:'All',sort:'name'}).includes(`data-id="${l.id}"`));
});
test('Stud inventory exposes actual stakes achievements and recruits recorded successful runners',()=>{
 const w=createWorld({country:'USA',seed:'first-light',historyYears:10,starters:[{}]});
 const studs=Object.values(w.horses).filter(h=>h.brood&&h.sex==='colt'&&h.owner!=='archive');
 assert.ok(studs.filter(h=>career(h).stakesWins>0).length>=24);
 assert.ok(studs.some(h=>h.studSince===w.day&&career(h).stakesWins>0));
 const starts=Object.values(w.horses).reduce((n,h)=>n+h.starts.length,0),balance=w.balance;
 recruitAccomplishedSires(w);
 assert.equal(Object.values(w.horses).reduce((n,h)=>n+h.starts.length,0),starts);assert.equal(w.balance,balance);
 const html=content(w,{tab:'Stud'});assert.ok(html.includes('G1:'));assert.ok(html.includes('Verified linked racing results'));
 validate(w);
});
