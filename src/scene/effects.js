import * as THREE from 'three';

export function createEffects(scene) {
  const dummy=new THREE.Object3D();
  const bubbleGeometry=new THREE.SphereGeometry(1,8,6);
  const bubbleMaterial=new THREE.MeshStandardMaterial({color:'#b7f7ef',transparent:true,opacity:.29,roughness:.2,metalness:.15,depthWrite:false});
  const bubbles=new THREE.InstancedMesh(bubbleGeometry,bubbleMaterial,52);bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(bubbles);
  const seeds=Array.from({length:52},(_,i)=>({x:((i%4)-1.5)*2.9,z:-1.5+(i%3)*1.1,y:-3+(i/52)*6.5,speed:.28+(i%7)*.07,r:.025+(i%4)*.013,phase:i*1.7}));
  const particleMaterial=new THREE.MeshBasicMaterial({color:'#a5f9d7',transparent:true,opacity:.8,depthWrite:false});
  const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),particleMaterial,96);particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(particles);
  const pool=Array.from({length:96},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,r:.06}));
  const foods=new Map();
  const foodGeometry=new THREE.DodecahedronGeometry(.105,0);
  const foodMaterial=new THREE.MeshStandardMaterial({color:'#ffd094',emissive:'#a84816',emissiveIntensity:.12,roughness:.7});
  const colors={happy:new THREE.Color('#abffd6'),sad:new THREE.Color('#94d9ff'),food:new THREE.Color('#ffcf91'),growth:new THREE.Color('#dcc0ff')};
  function burst(position,kind='happy',count=14){
    let used=0;
    for(let i=0;i<pool.length&&used<count;i++){
      const p=pool[i];if(p.life>0)continue;
      const angle=used*2.4;
      Object.assign(p,{life:1,x:position.x,y:position.y,z:position.z,vx:Math.cos(angle)*.65,vy:.3+(used%5)*.13,vz:Math.sin(angle)*.4,r:kind==='growth'?.075:.05});
      particles.setColorAt(i,colors[kind]);used++;
    }
    if(particles.instanceColor)particles.instanceColor.needsUpdate=true;
  }
  function spawnFood(id,x,z){
    cancelFood(id);
    const group=new THREE.Group();group.position.set(x,2.85,z);
    for(let i=0;i<3;i++){const m=new THREE.Mesh(foodGeometry,foodMaterial);m.position.set((i-1)*.17,i*.14,(i%2)*.12);group.add(m);}
    scene.add(group);foods.set(id,{group,age:0,lastTrail:0});return group;
  }
  function cancelFood(id){const food=foods.get(id);if(food){food.group.removeFromParent();foods.delete(id);}}
  function eatFood(id,progress){const f=foods.get(id);if(f)f.group.scale.setScalar(Math.max(.001,1-progress));}
  function update(dt,time,widthScale=1){
    for(let i=0;i<seeds.length;i++){
      const b=seeds[i];b.y+=dt*b.speed;if(b.y>3.25)b.y=-3;
      dummy.position.set(b.x*widthScale+Math.sin(time*.8+b.phase)*.09,b.y,b.z);dummy.scale.setScalar(b.r);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate=true;
    for(let i=0;i<pool.length;i++){const p=pool[i];p.life=Math.max(0,p.life-dt*.7);if(p.life){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}dummy.position.set(p.x,p.y,p.z);dummy.scale.setScalar(p.r*p.life);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);}
    particles.instanceMatrix.needsUpdate=true;
    foods.forEach(f=>{f.age+=dt;f.group.position.y=(f.group.userData.startY??2.85)-Math.min(f.age,3.5)*.53;f.group.rotation.y+=dt*.6;if(f.age-f.lastTrail>.22&&f.group.scale.x>.9){f.lastTrail=f.age;burst(f.group.position,'food',1);}});
  }
  return {spawnFood,cancelFood,eatFood,burst,update,foods,dispose(){foods.forEach((_,id)=>cancelFood(id));for(const m of [bubbles,particles]){m.geometry.dispose();m.material.dispose();m.removeFromParent();}foodGeometry.dispose();foodMaterial.dispose();}};
}


