import {HUNGER_GAIN_PER_HOUR,MAX_OFFLINE_PROGRESS_HOURS,FEED_HUNGER_REDUCTION,FEED_HAPPINESS_GAIN,FEED_HEALTH_GAIN,FEED_XP_GAIN,REFUSAL_HAPPINESS_LOSS,GROWTH_STAGES,HUNGRY_THRESHOLD,CRITICAL_HUNGER_THRESHOLD} from './defaults.js';
export const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));
export function elapsedHours(from,to){
 if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to<from)return 0;
 return Math.min(MAX_OFFLINE_PROGRESS_HOURS,(to-from)/3600000);
}
export function progressFish(fish,hours){
 const elapsed=Number.isFinite(hours)?clamp(hours,0,MAX_OFFLINE_PROGRESS_HOURS):0;
 const hunger=clamp(fish.hunger+elapsed*HUNGER_GAIN_PER_HOUR);
 // Count only the time spent above 90 hunger. Fish remain recoverable.
 const criticalHours=Math.max(0,elapsed-Math.max(0,CRITICAL_HUNGER_THRESHOLD-fish.hunger)/HUNGER_GAIN_PER_HOUR);
 return {...fish,hunger,health:clamp(fish.health-criticalHours*.7,40,100),happiness:clamp(fish.happiness-criticalHours)};
}
export function advanceState(state,now){
 const hours=elapsedHours(state.lastSimulatedAt,now);
 return {...state,fish:state.fish.map(f=>progressFish(f,hours)),lastSimulatedAt:Number.isFinite(now)&&now>=0?now:state.lastSimulatedAt};
}
export const canFeed=fish=>Boolean(fish&&fish.hunger>=10);
export const validReason=reason=>typeof reason==='string'&&reason.trim().length>=3&&reason.length<=160;
export function applyFeed(fish,at,eventId){
 if(!canFeed(fish)||fish.history.some(e=>e.id===eventId))return fish;
 const event={id:eventId,fishId:fish.id,name:fish.name,type:'fed',at};
 return {...fish,hunger:clamp(fish.hunger-FEED_HUNGER_REDUCTION),happiness:clamp(fish.happiness+FEED_HAPPINESS_GAIN),health:clamp(fish.health+FEED_HEALTH_GAIN),xp:fish.xp+FEED_XP_GAIN,totalFeeds:fish.totalFeeds+1,lastFed:at,history:[event,...fish.history].slice(0,40)};
}
export function applyRefusal(fish,reason,at,eventId){
 if(!validReason(reason)||fish.hunger<HUNGRY_THRESHOLD||fish.history.some(e=>e.id===eventId))return fish;
 const event={id:eventId,fishId:fish.id,name:fish.name,type:'refused',reason,at};
 return {...fish,happiness:clamp(fish.happiness-REFUSAL_HAPPINESS_LOSS),totalRefusals:fish.totalRefusals+1,history:[event,...fish.history].slice(0,40)};
}
export function growthScale(xp){return 1+Math.min(.55,Math.max(0,Number.isFinite(xp)?xp:0)/200*.55);}
export function growthStage(xp){return [...GROWTH_STAGES].reverse().find(s=>xp>=s.minXP)||GROWTH_STAGES[0];}
export function growthProgress(xp){const stage=growthStage(xp),next=GROWTH_STAGES.find(s=>s.minXP>xp);return {stage,next,percent:next?clamp((xp-stage.minXP)/(next.minXP-stage.minXP)*100):100};}
export function hungerLabel(hunger){return hunger>=90?'Starving':hunger>=65?'Hungry':hunger>=35?'Peckish':hunger>=10?'Content':'Already full';}
export function fishStatus(fish,runtime){
 if(runtime==='approachingFood')return 'Snack incoming';if(runtime==='eating')return 'Nom nom';if(runtime==='celebrating')return 'Delighted';if(runtime==='sulking')return 'Sulking';if(runtime==='sleeping')return 'Sleepy';
 if(fish.hunger>=65)return 'Hungry';if(fish.happiness<40)return 'Grumpy';return fish.personality==='Sleepy'?'Sleepy':'Happy';
}
