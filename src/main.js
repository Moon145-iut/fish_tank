import './styles.css';
import {loadState} from './game/persistence.js';
import {createStore} from './game/store.js';
import {dialogue} from './game/dialogue.js';
import {createAquarium} from './scene/aquarium.js';
import {createSchool} from './scene/fishController.js';
import {bindInteraction} from './scene/interaction.js';
import {createDashboard} from './ui/dashboard.js';
import {createFishPanel} from './ui/fishPanel.js';
import {createModals} from './ui/modals.js';
import {createOverlays} from './ui/overlays.js';
import {$,el,button} from './ui/dom.js';

let storage;
try{storage=window.localStorage;}catch{storage={getItem(){throw new Error('Storage blocked');},setItem(){throw new Error('Storage blocked');},removeItem(){}};}
const loaded=loadState(storage),store=createStore(loaded.state,storage),overlays=createOverlays(store);
let aquarium=null,school=null,graphicsReady=false,render=()=>{},destroyPicking=()=>{};
function graphicsError(message){
 graphicsReady=false;const loading=$('#sceneLoading');loading.hidden=false;loading.replaceChildren(el('span','loading-fish','◌'),el('strong','','The water needs a little help.'),el('p','',message),button('Reload aquarium','button primary',()=>location.reload()));
 $('#resetCamera').disabled=true;
 if(school){for(const id of school.controllers.keys()){aquarium.effects.cancelFood(id);if(store.isFeeding(id))store.cancelFeed(id);}}
 render();
}
const actions={
 canAnimate:()=>graphicsReady,
 select(id){
  if(!store.find(id))return;store.select(id);school?.notice(id);overlays.speech(id,dialogue(store.find(id),'clicked'));
  if(window.innerWidth<1100)$('#fishPanel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
 },
 close(){store.select(null);},
 feed(id){
  if(!graphicsReady){overlays.toast('Reconnect the aquarium graphics to serve a snack.');return;}
  const fish=store.find(id);if(!fish)return;if(store.isFeeding(id))return;
  if(fish.hunger<10){overlays.toast(fish.name+' is already full. Give that little belly a break.');return;}
  store.select(id);const token=store.beginFeed(id);
  if(token&&!school.feed(id,token)){store.cancelFeed(id);overlays.toast('That snack couldn’t reach the water. Please try again.');}
 },
 refuse(id){modals.refuse(id);},
 submitRefusal(id,reason){
  if(!store.refuse(id,reason))return false;store.select(id);school?.refuse(id);overlays.speech(id,dialogue(store.find(id),'refused'));return true;
 },
 edit(id){modals.fishEditor(id);},remove(id){modals.remove(id);},
 reset(){overlays.clear();store.reset();aquarium?.reset();}
};
const modals=createModals(store,actions,overlays.toast);
const dashboard=createDashboard(store,actions),panel=createFishPanel(store,actions);
render=()=>{
 const focused=document.activeElement,focusKey=focused?.dataset.key,wasDialog=$('#modal').open;
 school?.sync();aquarium?.setNight(store.state.preferences.night);
 dashboard.render();panel.render();overlays.sync();
 // Keep keyboard focus when a real state update refreshes the UI.
 if(focusKey&&!wasDialog){const replacement=document.querySelector('[data-key="'+CSS.escape(focusKey)+'"]');if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});}
};
aquarium=createAquarium($('#sceneContainer'),graphicsError);
if(aquarium){
 graphicsReady=true;
 school=createSchool(aquarium,store,(id,token)=>{
  const result=store.completeFeed(id,token);if(!result)return;
  overlays.speech(id,dialogue(result.fish,'fed'));
  overlays.toast(result.grewStage?result.fish.name+' leveled up! '+result.fish.xp+' XP.':result.fish.name+' enjoyed a snack. +15 XP, a little more fish.');
  if(result.grewStage){const c=school.controllers.get(id);if(c)aquarium.effects.burst(c.root.position,'growth',28);}
 });
 let ambientTimer=7;
 aquarium.setTick((dt,time)=>{
  school.update(dt,time);overlays.update(aquarium.camera,school.controllers);ambientTimer-=dt;
  if(ambientTimer<=0){ambientTimer=13+Math.random()*7;const candidates=store.state.fish.filter(f=>!store.isFeeding(f.id)&&!['sulking','celebrating'].includes(store.runtime(f.id)));
   if(candidates.length){const hungry=candidates.filter(f=>f.hunger>=65),pool=hungry.length?hungry:candidates,fish=pool[Math.floor(Math.random()*pool.length)];overlays.speech(fish.id,dialogue(fish,fish.hunger>=65?'hungry':'idle'),false);}
  }
 });
 destroyPicking=bindInteraction(aquarium.renderer.domElement,aquarium.camera,school,actions.select,overlays.hover);
 $('#sceneLoading').hidden=true;
}
const unsubscribe=store.subscribe(render);render();
for(const id of ['#addFishTop','#addFishBottom','#addFishEmpty'])$(id).addEventListener('click',()=>modals.fishEditor());
for(const id of ['#dayToggle','#tankNight'])$(id).addEventListener('click',()=>store.toggleNight());
$('#resetCamera').addEventListener('click',()=>{aquarium?.reset();overlays.toast('Back to the best seat in the house.');});
$('#settingsButton').addEventListener('click',()=>modals.settings());
const interval=setInterval(()=>store.tick(),30000);
const visibility=()=>{if(document.visibilityState==='visible')store.tick();else store.save();};
const pagehide=()=>store.save();
document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);
if(loaded.error||!store.storageOK)overlays.toast('Browser storage is blocked. You can play, but changes won’t survive a reload.');
else if(loaded.migrated)overlays.toast('Your previous fish moved into the new aquarium. Names, meals, and stats came along.');
// Read-only QA diagnostics make picking and bounded motion verifiable without
// exposing a second way to alter game state.
if(import.meta.env.DEV){
 window.__aquariumDiagnostics=()=>({ready:graphicsReady,fish:[...(school?.controllers.values()||[])].map(c=>{
  const position=c.root.position.clone().project(aquarium.camera),rect=aquarium.renderer.domElement.getBoundingClientRect();
  return {id:c.data.id,name:c.data.name,species:c.data.species,state:c.mode,scale:c.scale,position:c.root.position.toArray(),screen:{x:rect.left+(position.x*.5+.5)*rect.width,y:rect.top+(-position.y*.5+.5)*rect.height}};
 }),foodCount:aquarium?.effects.foods.size||0,drawCalls:aquarium?.renderer.info.render.calls||0});
}
if(import.meta.hot)import.meta.hot.dispose(()=>{clearInterval(interval);unsubscribe();destroyPicking();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);school?.dispose();aquarium?.dispose();overlays.dispose();});

