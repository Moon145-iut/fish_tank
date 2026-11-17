import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createEffects } from './effects.js';
import { disposeObject } from './fishFactory.js';

export function createAquarium(container, onError) {
  let renderer;
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}
  catch(error){onError('This aquarium needs WebGL 2. Enable hardware acceleration or try a current browser. Your saved fish are safe.');return null;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<600?1.5:2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
  container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#104454');scene.fog=new THREE.Fog('#104454',17,38);
  const camera=new THREE.PerspectiveCamera(42,1,.1,70);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.enableZoom=true;
  controls.minAzimuthAngle=-.18;controls.maxAzimuthAngle=.18;controls.minPolarAngle=1.34;controls.maxPolarAngle=1.60;
  controls.target.set(0,.05,0);controls.enableRotate=window.innerWidth>=600;
  const bounds={halfWidth:6,minY:-2.1,maxY:2.4,minZ:-1.5,maxZ:1.5};
  const hemi=new THREE.HemisphereLight('#d2fff4','#58694e',2.1);scene.add(hemi);
  const key=new THREE.DirectionalLight('#ffebc9',2.4);key.position.set(-4,7,8);scene.add(key);
  const fill=new THREE.DirectionalLight('#75cddd',1.5);fill.position.set(5,2,-2);scene.add(fill);
  const decor=new THREE.Group();scene.add(decor);const plants=[];
  const bgMaterial=new THREE.ShaderMaterial({
    uniforms:{night:{value:0},time:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv; uniform float night; uniform float time;
      void main(){float h=clamp((vUv.y-.35)*3.2,0.,1.);vec3 bottom=mix(vec3(.016,.095,.14),vec3(.018,.045,.11),night);vec3 top=mix(vec3(.10,.37,.42),vec3(.07,.15,.28),night);vec3 c=mix(bottom,top,h);
      float ray=pow(max(0.,sin(vUv.x*68.+vUv.y*17.+sin(time*.14)*.3)),22.)*.08*h; c+=vec3(.40,.70,.63)*ray*(1.-night*.7);gl_FragColor=vec4(c,1.);}`
  });
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(32,22),bgMaterial);backdrop.position.set(0,0,-5);scene.add(backdrop);
  const sandMat=new THREE.MeshStandardMaterial({color:'#c2b78d',roughness:1});
  const sand=new THREE.Mesh(new THREE.BoxGeometry(12.3,.38,5.6),sandMat);sand.position.set(0,-3.17,0);decor.add(sand);
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(12.1,5.2),new THREE.MeshBasicMaterial({color:'#9ee9d8',transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false}));surface.rotation.x=-Math.PI/2;surface.position.y=3.4;decor.add(surface);
  const edgeGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(12.2,6.8,5.3));const edges=new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:'#b7f3e5',transparent:true,opacity:.13}));edges.position.y=.0;decor.add(edges);
  const pebbleGeo=new THREE.IcosahedronGeometry(1,1);
  const stones=new THREE.InstancedMesh(pebbleGeo,new THREE.MeshStandardMaterial({color:'#718f89',roughness:.95,flatShading:true}),55);
  const dummy=new THREE.Object3D();const color=new THREE.Color();
  const seed=i=>{const v=Math.sin(i*127.1)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<55;i++){const r=.05+seed(i+8)*.15;dummy.position.set((seed(i+19)-.5)*11.8,-2.96,(seed(i+90)-.5)*4.9);dummy.scale.set(r*1.6,r*.6,r);dummy.rotation.set(seed(i),seed(i+3),0);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);stones.setColorAt(i,color.setHSL(.12+seed(i)*.06,.12,.3+seed(i+18)*.25));}decor.add(stones);
  function rock(x,z,scale){const mesh=new THREE.Mesh(pebbleGeo,new THREE.MeshStandardMaterial({color:'#547e7b',roughness:1,flatShading:true}));mesh.position.set(x,-3+scale*.34,z);mesh.scale.set(scale,scale*.64,scale*.8);mesh.rotation.set(.15,x*.8,.1);decor.add(mesh);}
  rock(-4.6,-1.1,.95);rock(-3.85,-1.2,.55);rock(4.7,-1.6,1.1);rock(3.9,-1.3,.58);rock(1.8,-2.2,.7);
  function plant(x,z,height,shade,index){
    const group=new THREE.Group();group.position.set(x,-3,z);decor.add(group);plants.push({group,phase:index*1.7});
    const mat=new THREE.MeshStandardMaterial({color:shade,roughness:.75,side:THREE.DoubleSide});
    for(let j=0;j<5;j++){
      const h=height*(.65+j*.09),dx=(j-2)*.20;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(dx,0,0),new THREE.Vector3(dx-.1,h*.35,.03),new THREE.Vector3(dx+(j-2)*.11,h*.75,0),new THREE.Vector3(dx+(j-2)*.18,h,0)]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,9,.028,5,false),mat));
      for(let k=1;k<5;k++){const p=curve.getPoint(k/5),leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),mat);leaf.position.copy(p);leaf.position.x+=(k%2?1:-1)*.12;leaf.scale.set(.13,h*.16,.045);leaf.rotation.z=(k%2?-.55:.55);group.add(leaf);}
    }
  }
  // Each plant sways as one object. Merge its static leaves and stems to
  // avoid hundreds of separate draw calls on small devices.

  plant(-5.1,-1.5,2.65,'#469b82',0);plant(-3.7,-2.1,1.7,'#286f6f',1);plant(-1.8,-2.35,1.1,'#3a8c7f',2);plant(2.5,-2.15,1.6,'#397a76',3);plant(4.7,-2.0,2.5,'#5ba787',4);plant(5.3,.1,1.35,'#7aa98a',5);
  for(const {group} of plants){
    const geometries=[];
    for(const child of group.children){child.updateMatrix();geometries.push(child.geometry.clone().applyMatrix4(child.matrix));}
    const material=group.children[0].material,merged=mergeGeometries(geometries);
    for(const child of group.children)child.geometry.dispose();
    geometries.forEach(g=>g.dispose());group.clear();group.add(new THREE.Mesh(merged,material));
  }
  function coral(x,z,c){
    const group=new THREE.Group();group.position.set(x,-2.98,z);decor.add(group);const mat=new THREE.MeshStandardMaterial({color:c,roughness:.8});
    for(let j=0;j<7;j++){const dx=(j-3)*.15,h=.5+seed(j+80)*.65;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(dx*.7,h*.45,j*.02),new THREE.Vector3(dx,h,j*.02)]);group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,7,.07,6),mat));const tip=new THREE.Mesh(new THREE.SphereGeometry(.074,8,6),mat);tip.position.set(dx,h,j*.02);group.add(tip);}
  }
  coral(-4.3,.8,'#df9589');coral(3.8,.6,'#d4a2b7');
  // A tiny ceramic house: the one resident who never asks for snacks.
  const house=new THREE.Group();house.position.set(.9,-2.93,-1.9);decor.add(house);
  const houseMat=new THREE.MeshStandardMaterial({color:'#ceb78d',roughness:.9});
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.40,.50,.72,14),houseMat);pot.position.y=.36;house.add(pot);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(.65,.48,12),new THREE.MeshStandardMaterial({color:'#bb8573',roughness:.85}));roof.position.y=.93;house.add(roof);
  const door=new THREE.Mesh(new THREE.CircleGeometry(.17,16),new THREE.MeshBasicMaterial({color:'#153f45'}));door.position.set(0,.26,.46);house.add(door);
  const effects=createEffects(scene);
  let baseDistance=16,night=false,elapsed=0,last=0,tick=()=>{},disposed=false;
  function reset(){camera.position.set(0,2.0,baseDistance);controls.target.set(0,.05,0);controls.update();}
  function resize(){
    const {width,height}=container.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    bounds.halfWidth=camera.aspect<1?3.7:6;decor.scale.x=bounds.halfWidth/6;
    baseDistance=Math.max(11.8,bounds.halfWidth/(Math.tan(THREE.MathUtils.degToRad(21))*camera.aspect)+3.0);
    controls.minDistance=baseDistance*.9;controls.maxDistance=baseDistance*1.2;
    controls.enableRotate=width>=600;renderer.domElement.style.touchAction=width>=600?'none':'pan-y';reset();
  }
  const observer=new ResizeObserver(resize);observer.observe(container);resize();
  function setNight(value){night=value;hemi.intensity=value?1.1:2.1;key.intensity=value?.9:2.4;key.color.set(value?'#afc8ff':'#ffebc9');fill.intensity=value?1.1:1.5;scene.fog.color.set(value?'#102c49':'#104454');}
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);onError('The aquarium graphics paused. Reload to reconnect; your saved fish are safe.');});
  renderer.setAnimationLoop(ms=>{
    if(disposed)return;const dt=Math.min(.05,last?(ms-last)/1000:1/60);last=ms;elapsed+=dt;
    bgMaterial.uniforms.time.value=elapsed;bgMaterial.uniforms.night.value=THREE.MathUtils.damp(bgMaterial.uniforms.night.value,night?1:0,2,dt);
    for(const p of plants)p.group.rotation.z=Math.sin(elapsed*.65+p.phase)*.055;
    effects.update(dt,elapsed,bounds.halfWidth/6);tick(dt,elapsed);controls.update();renderer.render(scene,camera);
  });
  return {scene,camera,renderer,controls,bounds,effects,reset,setNight,setTick(fn){tick=fn;},dispose(){disposed=true;renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();effects.dispose();disposeObject(scene);renderer.dispose();renderer.domElement.remove();}};
}





