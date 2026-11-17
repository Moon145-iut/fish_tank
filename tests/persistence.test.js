import test from 'node:test';
import assert from 'node:assert/strict';
import {demoState} from '../src/game/defaults.js';
import {applyRefusal,applyFeed} from '../src/game/rules.js';
import {STORAGE_KEY,sanitizeState,parseSave,loadState,saveState} from '../src/game/persistence.js';
function memory(value=null){const map=new Map(value===null?[]:[[STORAGE_KEY,value]]);return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('invalid JSON/schema falls back safely and valid empty stays empty',()=>{
 for(const raw of ['garbage','null','{}','{"version":1,"fish":[{}]}']){assert.equal(parseSave(raw,1000),null);assert.equal(loadState(memory(raw),1000).state.fish.length,3);}
 const empty={...demoState(1000),fish:[],activity:[]};assert.equal(loadState(memory(JSON.stringify(empty)),1000).state.fish.length,0);
});
test('save round-trip preserves exact history, customization, preferences, and growth',()=>{
 const state=demoState(1000);state.preferences.night=true;state.fish[0]=applyRefusal(state.fish[0],' He stole my fries <img> ',1100,'reason');state.fish[0]=applyFeed(state.fish[0],1200,'meal');state.lastSimulatedAt=1200;
 const storage=memory();assert.equal(saveState(storage,state),true);assert.deepEqual(loadState(storage,1200).state,state);
});
test('sanitization handles hostile colors, malformed stats, duplicate IDs, and oversized histories',()=>{
 const s=demoState(1000);s.fish[0].color='url(javascript:bad)';s.fish[0].hunger=999;s.fish[0].health=-5;s.fish[0].xp=NaN;s.fish[0].personality='__proto__';s.fish[0].species='constructor';
 const clean=sanitizeState(s,1000);assert.equal(clean.fish[0].color,'#ffad70');assert.equal(clean.fish[0].hunger,100);assert.equal(clean.fish[0].health,40);assert.equal(clean.fish[0].xp,0);assert.equal(clean.fish[0].personality,'Sweet');assert.equal(clean.fish[0].species,'puffer');
 s.fish[1].id=s.fish[0].id;assert.equal(sanitizeState(s,1000),null);
});
test('blocked localStorage is survivable and reports save failure',()=>{const storage={getItem(){throw new Error('blocked');},setItem(){throw new Error('full');}};const result=loadState(storage,1000);assert.equal(result.state.fish.length,3);assert.ok(result.error);assert.equal(saveState(storage,result.state),false);});
test('elapsed time is applied only once on a successful load/save cycle',()=>{const s=demoState(1000),storage=memory(JSON.stringify(s));const first=loadState(storage,3601000).state;saveState(storage,first);assert.equal(loadState(storage,3601000).state.fish[1].hunger,48);});
test('previous prototype roster is migrated without resetting it',()=>{const storage=memory();storage.setItem('guppy-gang-v1',JSON.stringify({fish:[{id:'old-1',name:'Mia',color:'#75bff0',hunger:21,health:89,feeds:3}],lastUpdated:1000}));const result=loadState(storage,1000);assert.ok(result.migrated);assert.equal(result.state.fish[0].name,'Mia');assert.equal(result.state.fish[0].xp,45);assert.equal(result.state.fish[0].totalFeeds,3);});

