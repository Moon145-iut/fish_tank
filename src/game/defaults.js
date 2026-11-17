export const HUNGER_MIN=0, HUNGER_MAX=100, HUNGRY_THRESHOLD=65, CRITICAL_HUNGER_THRESHOLD=90;
export const HUNGER_GAIN_PER_HOUR=5, FEED_HUNGER_REDUCTION=35, FEED_HAPPINESS_GAIN=12, FEED_HEALTH_GAIN=4, FEED_XP_GAIN=15, REFUSAL_HAPPINESS_LOSS=8;
export const MAX_OFFLINE_PROGRESS_HOURS=24, MAX_FISH=12;
export const GROWTH_STAGES=[{minXP:0,name:'Tiny Fry'},{minXP:45,name:'Growing Buddy'},{minXP:105,name:'Absolute Unit'}];
export const SPECIES={puffer:'Pufferfish',guppy:'Guppy',angel:'Angelfish'};
export const PERSONALITIES={
  Greedy:'A snack enthusiast. First to the food, last to stop asking.',
  Dramatic:'Tiny fins. Award-winning feelings. Every meal is an event.',
  Sleepy:'Slow swims, long naps, and snacks worth waking up for.',
  Chaotic:'Darts, bubble chases, and absolutely no five-year plan.',
  Sweet:'A gentle little friend who is always happy to see you.'
};
export const COLORS=['#ffad70','#f48fa8','#b7a0ed','#75bff0','#6dd7c0','#f1d07d','#e98a70','#a0d48c'];
export const newId=()=>globalThis.crypto?.randomUUID?.()??'fish-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function makeFish(input,now=Date.now(),id=newId()){
 return {id,name:input.name.trim(),species:input.species||'puffer',color:input.color||COLORS[0],accent:input.accent||'#ffe0a3',personality:input.personality||'Sweet',tagline:input.tagline?.trim()||'',hunger:40,health:95,happiness:75,xp:0,totalFeeds:0,totalRefusals:0,lastFed:null,createdAt:now,history:[]};
}
export function demoState(now=Date.now()){
 const fish=[
  {...makeFish({name:'Rafi',species:'puffer',color:'#ffad70',accent:'#ffe3a5',personality:'Dramatic',tagline:'Professionally underfed. Allegedly.'},now),hunger:82},
  {...makeFish({name:'Sami',species:'guppy',color:'#75bff0',accent:'#aedbf2',personality:'Chaotic',tagline:'No thoughts. Just bubbles.'},now),hunger:43},
  {...makeFish({name:'Nila',species:'angel',color:'#b7a0ed',accent:'#eeaed5',personality:'Sleepy',tagline:'Five more minutes, please.'},now),hunger:24}
 ];
 return {version:1,fish,activity:fish.map(f=>({id:newId(),fishId:f.id,name:f.name,type:'joined',at:now})),lastSimulatedAt:now,preferences:{night:false}};
}
