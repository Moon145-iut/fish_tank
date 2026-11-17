import * as THREE from 'three';
import {el,$} from './dom.js';
import {fishStatus} from '../game/rules.js';
import {forgetDialogue} from '../game/dialogue.js';

export function createOverlays(store){
 const labels=new Map(),speeches=new Map(),vector=new THREE.Vector3();let hovered=null,toastTimer;
 const labelLayer=$('#labelsLayer'),speechLayer=$('#speechLayer'),wrapper=$('#aquariumShell');
 function toast(message){const node=$('#toast');node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),3500);}
 function removeSpeech(id){const speech=speeches.get(id);if(speech){speech.node.remove();speeches.delete(id);}}
 function speech(id,message,priority=true){
  if(!store.find(id))return;
  if(!priority&&[...speeches.values()].some(s=>s.priority))return;
  if(priority){for(const [key,s]of speeches)if(!s.priority)removeSpeech(key);}
  if(speeches.size>=2)removeSpeech(speeches.keys().next().value);
  removeSpeech(id);const node=el('div','speech-bubble',message);speechLayer.append(node);speeches.set(id,{node,until:performance.now()+3000,priority});
 }
 function sync(){
  const ids=new Set(store.state.fish.map(f=>f.id));for(const [id,label]of labels)if(!ids.has(id)){label.remove();labels.delete(id);removeSpeech(id);forgetDialogue(id);}
  for(const fish of store.state.fish){
   let node=labels.get(fish.id);if(!node){node=el('div','fish-label');node.append(el('strong'),el('small'));labelLayer.append(node);labels.set(fish.id,node);}
   node.classList.toggle('selected',store.selectedId===fish.id);node.classList.toggle('hover',hovered===fish.id);node.firstChild.textContent=fish.name;
   const mood=fishStatus(fish,store.runtime(fish.id));node.lastChild.textContent=hovered===fish.id?mood:fish.hunger>=65?'♡ snack, please?':store.selectedId===fish.id?mood:'';
  }
 }
 function update(camera,controllers){
  const width=wrapper.clientWidth,height=wrapper.clientHeight,now=performance.now();
  for(const [id,c]of controllers){
   const label=labels.get(id);if(label){vector.copy(c.root.position);vector.y-=(c.data.species==='angel'?1.42:.92)*c.scale;vector.project(camera);label.style.left=((vector.x*.5+.5)*width)+'px';label.style.top=((-vector.y*.5+.5)*height)+'px';label.hidden=vector.z>1||vector.x<-.95||vector.x>.95;}
   const s=speeches.get(id);if(!s)continue;if(s.until<now){removeSpeech(id);continue;}
   vector.copy(c.root.position);vector.y+=(c.data.species==='angel'?1.4:.95)*c.scale;vector.project(camera);
   const half=s.node.offsetWidth/2+10;s.node.style.left=Math.max(half,Math.min(width-half,(vector.x*.5+.5)*width))+'px';s.node.style.top=Math.max(s.node.offsetHeight+50,Math.min(height-80,(-vector.y*.5+.5)*height))+'px';
  }
 }
 sync();return {toast,speech,sync,hover(id){hovered=id;sync();},update,clear(){for(const id of speeches.keys())removeSpeech(id);},dispose(){clearTimeout(toastTimer);labels.forEach(n=>n.remove());for(const id of speeches.keys())removeSpeech(id);}};
}
