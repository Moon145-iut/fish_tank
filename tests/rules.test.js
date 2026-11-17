import test from 'node:test';
import assert from 'node:assert/strict';
import {makeFish,demoState} from '../src/game/defaults.js';
import {progressFish,elapsedHours,advanceState,applyFeed,applyRefusal,growthStage,growthScale,validReason} from '../src/game/rules.js';
import {createStore} from '../src/game/store.js';
const fish=()=>makeFish({name:'Test Fish'},1000,'fish-1');
const memory=()=>({getItem(){return null;},setItem(){},removeItem(){}});
test('one elapsed hour adds exactly five hunger, capped at 100',()=>{assert.equal(progressFish(fish(),1).hunger,45);assert.equal(progressFish({...fish(),hunger:98},1).hunger,100);});
test('offline progress caps at 24 hours; negative/invalid deltas cannot reduce hunger',()=>{
 assert.equal(elapsedHours(1000,1000+48*3600000),24);
 for(const [from,to]of [[2000,1000],[NaN,1000],[1000,NaN],[-1,1000],[Infinity,1000]])assert.equal(elapsedHours(from,to),0);
 const s=demoState(1000);assert.equal(advanceState(s,0).fish[0].hunger,82);assert.equal(advanceState(s,1000+3600000).fish[1].hunger,48);
});
test('a completed feed applies all exact increments and duplicate event IDs are idempotent',()=>{
 const before={...fish(),hunger:82,health:99,happiness:95};const after=applyFeed(before,2000,'meal-1');
 assert.equal(after.hunger,47);assert.equal(after.xp,15);assert.equal(after.totalFeeds,1);assert.equal(after.health,100);assert.equal(after.happiness,100);assert.equal(after.history.length,1);assert.equal(after.lastFed,2000);
 assert.equal(applyFeed(after,3000,'meal-1'),after);assert.equal(before.hunger,82);assert.equal(applyFeed({...fish(),hunger:9},3000,'full').totalFeeds,0);
});
test('refusal stores exact reason and never changes hunger or XP',()=>{
 const before={...fish(),hunger:82};const reason='  He stole my fries <script>  ';const after=applyRefusal(before,reason,2000,'no-1');
 assert.equal(after.hunger,82);assert.equal(after.xp,0);assert.equal(after.happiness,67);assert.equal(after.totalRefusals,1);assert.equal(after.history[0].reason,reason);
 assert.equal(applyRefusal(after,reason,3000,'no-1'),after);assert.equal(applyRefusal(before,'  ',2000,'no-2'),before);assert.ok(!validReason('x'.repeat(161)));
});
test('growth thresholds and permanent size ceiling',()=>{
 for(const [xp,name]of [[0,'Tiny Fry'],[44,'Tiny Fry'],[45,'Growing Buddy'],[104,'Growing Buddy'],[105,'Absolute Unit']])assert.equal(growthStage(xp).name,name);
 assert.equal(growthScale(0),1);assert.equal(growthScale(15),1.04125);assert.equal(growthScale(200),1.55);assert.equal(growthScale(2000),1.55);
});
test('critical hunger can never kill fish and recovery heals',()=>{let f={...fish(),hunger:100};for(let i=0;i<100;i++)f=progressFish(f,24);assert.equal(f.health,40);assert.equal(f.happiness,0);assert.equal(applyFeed(f,2000,'heal').health,44);});
test('store grants no stats during approach; commits once; cancel/removal cannot grant orphan meals',()=>{
 const initial=demoState(Date.now()),store=createStore(initial,memory()),id=initial.fish[0].id;
 const token=store.beginFeed(id);assert.ok(token);assert.equal(store.beginFeed(id),null);assert.equal(store.find(id).xp,0);
 assert.ok(store.completeFeed(id,token));assert.equal(store.completeFeed(id,token),null);assert.equal(store.find(id).xp,15);
 const second=store.beginFeed(id);store.cancelFeed(id);assert.equal(store.completeFeed(id,second),null);assert.equal(store.find(id).xp,15);
 const third=store.beginFeed(id);store.remove(id);assert.equal(store.completeFeed(id,third),null);assert.equal(store.find(id),undefined);
});
test('rename keeps ID and history, reset clears only app key, roster limit is enforced',()=>{
 const keys=[],storage={...memory(),removeItem(key){keys.push(key);}},store=createStore(demoState(Date.now()),storage),f=store.state.fish[0];
 store.refuse(f.id,'He stole my fries');const edited=store.saveFish({...f,name:'Renamed'},f.id);assert.equal(edited.id,f.id);assert.equal(edited.history.length,1);
 for(let i=store.state.fish.length;i<12;i++)store.saveFish({...f,name:'Fish '+i});
 assert.throws(()=>store.saveFish({...f,name:'Overflow'}),/full house/);store.reset();assert.deepEqual(keys,['fishFriends:v1']);assert.equal(store.state.fish.length,3);
});

