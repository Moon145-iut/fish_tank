import * as THREE from 'three';
import {createFish} from './fishFactory.js';
import {growthScale,clamp} from '../game/rules.js';

const TAU=Math.PI*2;
function seedFor(id){let h=2166136261;for(const c of id)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function randomSource(id){let s=seedFor(id);return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
const angleDamp=(a,b,rate,dt)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*(1-Math.exp(-rate*dt));

class FishController {
 constructor(data,index,aquarium,store,onFeedComplete){
  this.data=data;this.aquarium=aquarium;this.store=store;this.onFeedComplete=onFeedComplete;
  this.model=createFish(data);this.root=this.model.root;aquarium.scene.add(this.root);
  this.random=randomSource(data.id);this.phase=this.random()*TAU;this.scale=growthScale(data.xp);this.root.scale.setScalar(this.scale);
  this.root.position.set(index===0?-2.6:index===1?2.3:index===2?.1:(index%3-1)*2.3,index===0?.7:index===1?.1:-.7,(index%3-1)*.45);
  this.target=this.root.position.clone();this.velocity=new THREE.Vector3();this.direction=new THREE.Vector3();this.start=new THREE.Vector3();this.destination=new THREE.Vector3();
  this.mode='idle';this.age=0;this.duration=2+this.random()*2;this.feed=null;this.hovered=false;this.selected=false;this.disposed=false;
  this.root.rotation.y=-.5;
 }
 limits(){
  const s=this.scale,angel=this.data.species==='angel',guppy=this.data.species==='guppy';
  return {x:Math.max(.7,this.aquarium.bounds.halfWidth-(guppy?1.8:1.3)*s),bottom:-3+(angel?1.45:.9)*s,top:3.15-(angel?1.45:.95)*s,z:Math.max(.05,2.5-(guppy?1.8:1.3)*s)};
 }
 constrain(v){const b=this.limits();v.x=clamp(v.x,-b.x,b.x);v.y=clamp(v.y,b.bottom,b.top);v.z=clamp(v.z,-b.z,b.z);return v;}
 state(mode,duration=3){this.mode=mode;this.age=0;this.duration=duration;this.store.setRuntime(this.data.id,mode);}
 wander(){
  const p=this.data.personality,b=this.limits(),rand=this.random;
  let mode=this.data.hunger>=65?'hungry':'wandering';
  if(p==='Sleepy'&&rand()<.38)mode='sleeping';
  this.state(mode,p==='Chaotic'?1.2+rand()*1.6:3.4+rand()*3);
  this.target.set((rand()*2-1)*b.x,b.bottom+.25+rand()*(b.top-b.bottom-.5),(rand()*2-1)*b.z);
  if(p==='Sleepy')this.target.y=b.bottom+.3;
  if(p==='Greedy'&&this.data.hunger>=65)this.target.z=b.z;
  if(p==='Chaotic'&&rand()<.5){this.target.x=(rand()<.5?-1:1)*Math.min(b.x,2.8);this.target.y=Math.min(b.top,1.8);}
  if(mode==='sleeping')this.target.copy(this.root.position);
 }
 notice(){
  if(this.feed||this.mode==='sulking')return;
  this.state('curious',this.selected?4:this.data.personality==='Sweet'?2.8:1.8);
  this.target.copy(this.root.position);if(this.selected&&window.innerWidth>=1100)this.target.x=-this.aquarium.bounds.halfWidth*.25;if(this.data.personality==='Sweet')this.target.z=this.limits().z;
 }
 beginFeed(token){
  if(this.feed||this.disposed)return false;
  this.start.copy(this.root.position);
  const b=this.limits();
  // The fish faces the viewer for its bite; food sits exactly at its mouth,
  // rather than disappearing somewhere above its back.
  const x=clamp(window.innerWidth>=1100?Math.min(-.5,this.root.position.x*.75):this.root.position.x*.75,-b.x,b.x),z=clamp(this.root.position.z,-b.z,b.z);
  const mouthOffset=this.model.size[0]*this.scale;
  const food=this.aquarium.effects.spawnFood(this.data.id,x,z+mouthOffset);
  const duration=this.data.personality==='Greedy'?1.45:2.25;
  food.userData.startY=Math.min(2.85,b.top+.53*duration-.1);
  food.position.y=food.userData.startY;
  this.feed={token,food,elapsed:0,duration,biting:false};
  this.destination.set(x,1.0,z);this.state('approachingFood',10);return true;
 }
 refuse(){
  if(this.feed)return;
  this.state('sulking',this.data.personality==='Dramatic'?4.8:3.5);
  const b=this.limits();this.target.set((this.root.position.x>=0?1:-1)*b.x*.82,b.bottom+.24,-b.z*.5);
  this.aquarium.effects.burst(this.root.position,'sad',7);
 }
 update(dt,time,controllers){
  if(this.disposed)return;
  this.age+=dt;
  const targetScale=growthScale(this.data.xp);this.scale=THREE.MathUtils.damp(this.scale,targetScale,2.6,dt);
  const {model,root}=this;
  let speed=this.data.personality==='Sleepy'?.42:this.data.personality==='Chaotic'?1.25:.68;
  if(this.feed){
   const f=this.feed;f.elapsed+=dt;const p=Math.min(1,f.elapsed/f.duration);
   this.destination.y=clamp(f.food.position.y+.10,this.limits().bottom,this.limits().top);
   this.constrain(this.destination);
   if(!f.biting){
    // Smoothstep intercept is time-based and always reaches food, even at low FPS.
    root.position.lerpVectors(this.start,this.destination,p*p*(3-2*p));
    root.rotation.y=angleDamp(root.rotation.y,-Math.PI/2,6,dt);
    if(p>=1){f.biting=true;f.elapsed=0;this.state('eating',.65);}
   }else{
    root.position.copy(this.destination);const bite=Math.min(1,f.elapsed/.65);
    this.aquarium.effects.eatFood(this.data.id,bite);model.mouthHole.visible=true;model.mouth.visible=false;
    model.mouthHole.scale.y=.07+Math.abs(Math.sin(bite*Math.PI*3))*.10;
    if(bite>=1){
     const token=f.token;this.feed=null;this.aquarium.effects.cancelFood(this.data.id);
     this.state('celebrating',2.7);this.target.copy(root.position);this.aquarium.effects.burst(root.position,'happy',18);
     this.onFeedComplete(this.data.id,token);
    }
   }
   speed=2.4;
  }else{
   model.mouth.visible=true;model.mouthHole.visible=false;
   if(this.age>=this.duration)this.wander();
   const resting=['sleeping','idle','celebrating'].includes(this.mode);
   this.direction.subVectors(this.target,root.position);
   if(this.mode==='sleeping')speed=.08;
   if(this.mode==='curious'&&this.selected)speed=1.3;
   if(this.mode==='sulking')speed=.65;
   if(resting)this.direction.multiplyScalar(.1);
   if(this.direction.lengthSq()>.01)this.direction.normalize();
   this.direction.multiplyScalar(speed);
   // Soft separation is skipped for interactions; it never steals the food path.
   if(['wandering','hungry'].includes(this.mode)){
    for(const other of controllers.values()){
     if(other===this)continue;
     const dx=root.position.x-other.root.position.x,dy=root.position.y-other.root.position.y,dz=root.position.z-other.root.position.z;
     const d2=dx*dx+dy*dy+dz*dz;
     if(d2<1.5&&d2>.001){const force=(1.5-d2)*.45;this.direction.x+=dx*force;this.direction.y+=dy*force;this.direction.z+=dz*force;}
    }
   }
   this.velocity.lerp(this.direction,1-Math.exp(-2.3*dt));root.position.addScaledVector(this.velocity,dt);
   if(this.mode==='curious'||this.hovered||this.mode==='celebrating')root.rotation.y=angleDamp(root.rotation.y,-Math.PI/2,3,dt);
   else if(this.mode==='sulking')root.rotation.y=angleDamp(root.rotation.y,Math.PI/2,2,dt);
   else if(this.velocity.lengthSq()>.02)root.rotation.y=angleDamp(root.rotation.y,Math.atan2(-this.velocity.z,this.velocity.x),1.7,dt);
   if(this.data.personality==='Dramatic'&&this.mode==='hungry'&&Math.sin(time*.7+this.phase)>.87)root.rotation.y=angleDamp(root.rotation.y,-Math.PI/2,3,dt);
  }
  this.constrain(root.position);
  const pulse=this.mode==='celebrating'?Math.sin(this.age*6)*.04*Math.max(0,1-this.age/2.7):0;
  root.scale.setScalar(this.scale*(1+pulse+(this.hovered?.025:0)));
  const swim=time*(this.mode==='sleeping'?2:5+speed*5)+this.phase;
  model.tail.rotation.y=Math.sin(swim)*(.2+speed*.10);
  model.fins.forEach((fin,i)=>{fin.rotation.x=Math.sin(swim+i*Math.PI)*.3;fin.rotation.y=Math.sin(swim)*.13;});
  model.rig.position.y=Math.sin(time*1.8+this.phase)*.045;
  model.rig.rotation.z=this.mode==='sulking'?-.13:this.mode==='celebrating'?Math.sin(time*7)*.10:Math.sin(time*1.2+this.phase)*.035;
  const blink=(time+this.phase)%5.4<.14;
  const expression=this.mode==='sleeping'?.18:this.mode==='sulking'?.48:this.mode==='eating'?1.23:this.data.hunger>=65?.82:1;
  model.eyes.forEach(eye=>eye.scale.y=blink?.1:expression);
  model.pupils.forEach(pupil=>pupil.position.y=.015+Math.sin(time*.6+this.phase)*.025);
  model.mouth.rotation.z=this.mode==='sulking'?0:Math.PI;
  model.bodyMaterial.emissive.set(this.hovered||this.selected?'#3b786c':'#000000');model.bodyMaterial.emissiveIntensity=this.hovered?.22:.12;
 }
 dispose(){this.disposed=true;this.aquarium.effects.cancelFood(this.data.id);this.model.dispose();}
}

export function createSchool(aquarium,store,onFeedComplete){
 const controllers=new Map();let encounterClock=0;
 function sync(){
  const ids=new Set(store.state.fish.map(f=>f.id));
  for(const [id,c] of controllers)if(!ids.has(id)){c.dispose();controllers.delete(id);}
  store.state.fish.forEach((data,index)=>{
   let c=controllers.get(data.id);
   if(c&&(c.data.species!==data.species||c.data.color!==data.color||c.data.accent!==data.accent)){
    const position=c.root.position.clone(),yaw=c.root.rotation.y;c.dispose();c=new FishController(data,index,aquarium,store,onFeedComplete);c.root.position.copy(position);c.root.rotation.y=yaw;controllers.set(data.id,c);
   }
   if(!c){c=new FishController(data,index,aquarium,store,onFeedComplete);controllers.set(data.id,c);}
   c.data=data;c.selected=store.selectedId===data.id;
  });
 }
 sync();
 return {controllers,sync,feed(id,token){return controllers.get(id)?.beginFeed(token)||false;},refuse(id){controllers.get(id)?.refuse();},notice(id){controllers.get(id)?.notice();},hover(id){for(const [key,c] of controllers)c.hovered=key===id;},
 update(dt,time){
  for(const c of controllers.values())c.update(dt,time,controllers);
  encounterClock+=dt;
  if(encounterClock>9){encounterClock=0;const free=[...controllers.values()].filter(c=>['wandering','hungry'].includes(c.mode));for(let i=0;i<free.length;i++){const a=free[i],b=free[(i+1)%free.length];if(a!==b&&a.root.position.distanceToSquared(b.root.position)<5){a.state('curious',2);a.target.copy(b.root.position);a.target.x-=.8;a.constrain(a.target);break;}}}
 },dispose(){controllers.forEach(c=>c.dispose());controllers.clear();}};
}






