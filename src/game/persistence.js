import {demoState,makeFish,MAX_FISH,SPECIES,PERSONALITIES} from './defaults.js';
import {clamp,advanceState} from './rules.js';
export const STORAGE_KEY='fishFriends:v1';
const text=(value,max=160)=>typeof value==='string'?value.slice(0,max):'';
const number=(value,fallback,min=0,max=100)=>Number.isFinite(value)?clamp(value,min,max):fallback;
export const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const timestamp=(v,fallback)=>Number.isFinite(v)&&v>=0?v:fallback;
function events(value,limit){
 if(!Array.isArray(value))return [];
 return value.filter(e=>e&&typeof e.id==='string'&&['joined','edited','removed','fed','refused','growth'].includes(e.type)&&Number.isFinite(e.at)&&e.at>=0).slice(0,limit).map(e=>({id:text(e.id,100),fishId:text(e.fishId,100),name:text(e.name,24),type:e.type,at:e.at,...(e.type==='refused'?{reason:text(e.reason)}:{}),...(e.type==='growth'?{stage:text(e.stage,40)}:{})}));
}
export function sanitizeState(raw,now=Date.now()){
 if(!raw||raw.version!==1||!Array.isArray(raw.fish)||raw.fish.length>MAX_FISH)return null;
 const ids=new Set(),fish=[];
 for(const value of raw.fish){
  if(!value||typeof value.id!=='string'||!value.id.length||value.id.length>100||ids.has(value.id)||typeof value.name!=='string'||value.name.trim().length<2)return null;
  ids.add(value.id);
  const f=makeFish({name:value.name.trim().slice(0,24),species:Object.hasOwn(SPECIES,value.species)?value.species:'puffer',color:validColor(value.color)?value.color:'#ffad70',accent:validColor(value.accent)?value.accent:'#ffe0a3',personality:Object.hasOwn(PERSONALITIES,value.personality)?value.personality:'Sweet',tagline:text(value.tagline,50)},timestamp(value.createdAt,now),value.id);
  Object.assign(f,{hunger:number(value.hunger,40),health:number(value.health,95,40),happiness:number(value.happiness,75),xp:number(value.xp,0,0,1e9),totalFeeds:Math.floor(number(value.totalFeeds,0,0,1e9)),totalRefusals:Math.floor(number(value.totalRefusals,0,0,1e9)),lastFed:value.lastFed===null?null:timestamp(value.lastFed,null),history:events(value.history,40)});fish.push(f);
 }
 return {version:1,fish,activity:events(raw.activity,100),lastSimulatedAt:timestamp(raw.lastSimulatedAt,now),preferences:{night:raw.preferences?.night===true}};
}
export function parseSave(value,now=Date.now()){if(typeof value!=='string')return null;try{return sanitizeState(JSON.parse(value),now);}catch{return null;}}
function migrateLegacy(value,now){
 try{const old=JSON.parse(value);if(!old||!Array.isArray(old.fish))return null;
 const fish=old.fish.slice(0,MAX_FISH).filter(f=>typeof f?.name==='string'&&f.name.trim()).map((f,i)=>({...makeFish({name:f.name.trim().length<2?f.name.trim()+'!':f.name.slice(0,24),species:['puffer','guppy','angel'][i%3],color:validColor(f.color)?f.color:'#ffad70',personality:['Sweet','Dramatic','Sleepy'][i%3]},now,typeof f.id==='string'?f.id:undefined),hunger:number(f.hunger,40),health:number(f.health,95,40),xp:number(f.feeds,0,0,1e6)*15,totalFeeds:number(f.feeds,0,0,1e6),lastFed:timestamp(f.lastFed,null)}));
 return sanitizeState({version:1,fish,activity:[],lastSimulatedAt:timestamp(old.lastUpdated,now),preferences:{night:false}},now);
 }catch{return null;}
}
export function loadState(storage,now=Date.now()){
 let error=null,state=null,migrated=false;
 try{state=parseSave(storage.getItem(STORAGE_KEY),now);if(!state){const legacy=storage.getItem('guppy-gang-v1');if(legacy){state=migrateLegacy(legacy,now);migrated=!!state;}}}catch(e){error=e;}
 return {state:advanceState(state||demoState(now),now),error,migrated};
}
export function saveState(storage,state){try{storage.setItem(STORAGE_KEY,JSON.stringify(state));return true;}catch{return false;}}
