import {demoState,makeFish,newId,MAX_FISH,HUNGRY_THRESHOLD,SPECIES,PERSONALITIES} from './defaults.js';
import {advanceState,applyFeed,applyRefusal,canFeed,growthStage,validReason} from './rules.js';
import {STORAGE_KEY,saveState,validColor} from './persistence.js';

// Persistent stats change only here. Transient tokens guard animation completions.
export function createStore(initial,storage){
 let state=initial,selectedId=null,storageOK=true;const listeners=new Set(),feeding=new Map(),runtime=new Map();
 const find=id=>state.fish.find(f=>f.id===id);
 function notify(){for(const fn of listeners)fn(state);}
 function persist(){storageOK=saveState(storage,state);return storageOK;}
 function log(event){state={...state,activity:[event,...state.activity].slice(0,100)};}
 function advance(now=Date.now()){state=advanceState(state,now);}
 function changed(){persist();notify();}
 const api={
  get state(){return state;},get selectedId(){return selectedId;},get storageOK(){return storageOK;},find,
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  select(id){selectedId=find(id)?id:null;notify();},
  isFeeding:id=>feeding.has(id),runtime:id=>runtime.get(id),
  setRuntime(id,value){if(find(id)&&runtime.get(id)!==value){runtime.set(id,value);notify();}},
  beginFeed(id){advance();const fish=find(id);if(!canFeed(fish)||feeding.has(id))return null;const token=newId();feeding.set(id,token);runtime.set(id,'approachingFood');notify();return token;},
  completeFeed(id,token,now=Date.now()){
   if(!token||feeding.get(id)!==token||!find(id))return null;
   feeding.delete(id);advance(now);const fish=find(id),before=growthStage(fish.xp),fed=applyFeed(fish,now,token);
   state={...state,fish:state.fish.map(f=>f.id===id?fed:f)};runtime.set(id,'celebrating');log(fed.history[0]);
   const after=growthStage(fed.xp);if(before.name!==after.name)log({id:newId(),fishId:id,name:fed.name,type:'growth',stage:after.name,at:now});
   changed();return {fish:fed,grewStage:before.name!==after.name};
  },
  cancelFeed(id){feeding.delete(id);runtime.delete(id);notify();},
  refuse(id,reason,now=Date.now()){
   advance(now);const fish=find(id);if(!fish||feeding.has(id)||fish.hunger<HUNGRY_THRESHOLD||!validReason(reason))return false;
   const next=applyRefusal(fish,reason,now,newId());state={...state,fish:state.fish.map(f=>f.id===id?next:f)};runtime.set(id,'sulking');log(next.history[0]);changed();return true;
  },
  saveFish(input,id=null,now=Date.now()){
   const name=typeof input.name==='string'?input.name.trim():'';
   if(name.length<2||name.length>24)throw new Error('Use a name between 2 and 24 characters.');
   if(!Object.hasOwn(SPECIES,input.species)||!Object.hasOwn(PERSONALITIES,input.personality)||!validColor(input.color)||!validColor(input.accent))throw new Error('Choose a species, personality, and valid colors.');
   if(typeof input.tagline!=='string'||input.tagline.length>50)throw new Error('Keep the tagline to 50 characters.');
   if(id&&!find(id))throw new Error('This fish has already left the tank.');
   if(id&&feeding.has(id))throw new Error('Let this snack finish before editing.');
   if(!id&&state.fish.length>=MAX_FISH)throw new Error('Twelve friends is a full house! Make some room first.');
   advance(now);const clean={name,species:input.species,color:input.color,accent:input.accent,personality:input.personality,tagline:input.tagline.trim()};
   const fish=id?{...find(id),...clean}:makeFish(clean,now);state={...state,fish:id?state.fish.map(f=>f.id===id?fish:f):[...state.fish,fish]};selectedId=fish.id;
   log({id:newId(),fishId:fish.id,name:fish.name,type:id?'edited':'joined',at:now});changed();return fish;
  },
  remove(id){const fish=find(id);if(!fish)return false;advance();feeding.delete(id);runtime.delete(id);state={...state,fish:state.fish.filter(f=>f.id!==id)};if(selectedId===id)selectedId=null;log({id:newId(),fishId:id,name:fish.name,type:'removed',at:Date.now()});changed();return true;},
  toggleNight(){state={...state,preferences:{...state.preferences,night:!state.preferences.night}};changed();},
  tick(now=Date.now()){advance(now);changed();},save(){advance();persist();},
  reset(now=Date.now()){feeding.clear();runtime.clear();selectedId=null;try{storage.removeItem(STORAGE_KEY);}catch{}state=demoState(now);changed();}
 };
 persist();return api;
}
