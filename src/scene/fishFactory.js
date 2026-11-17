import * as THREE from 'three';

// Resources belong to a fish. Disposing one fish never invalidates another.
export function disposeObject(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(node => { if (node.geometry) geometries.add(node.geometry); if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => materials.add(m)); });
  geometries.forEach(g => g.dispose());
  materials.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  root.removeFromParent();
}

export function createFish(data) {
  const root = new THREE.Group();
  root.userData.fishId = data.id;
  const rig = new THREE.Group(); root.add(rig);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: data.color, roughness: .52, metalness: .03 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: data.accent, roughness: .55, side: THREE.DoubleSide });
  const cream = new THREE.MeshStandardMaterial({ color: new THREE.Color(data.color).lerp(new THREE.Color('#fff8d9'), .65), roughness: .75 });
  const white = new THREE.MeshStandardMaterial({ color: '#fffdf1', roughness: .35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#10313d', roughness: .34 });
  const blushMat = new THREE.MeshStandardMaterial({ color: '#fca58e', roughness: .8 });
  const sphere = new THREE.SphereGeometry(1, 24, 16);
  function ball(parent, material, position, scale) {
    const mesh = new THREE.Mesh(sphere, material); mesh.position.set(...position); mesh.scale.set(...scale); parent.add(mesh); return mesh;
  }
  function fin(points, parent = rig) {
    const shape = new THREE.Shape(); shape.moveTo(...points[0]);
    points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .045, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .035, bevelThickness: .025 }), accentMaterial);
    mesh.position.z = -.025; parent.add(mesh); return mesh;
  }
  const isPuffer = data.species === 'puffer', isAngel = data.species === 'angel';
  const size = isPuffer ? [.76,.71,.59] : isAngel ? [.66,.82,.30] : [.88,.48,.38];
  const body = ball(rig, bodyMaterial, [0,0,0], size);
  ball(rig, cream, [.12,-.20,0], [size[0]*.88,size[1]*.68,size[2]*1.015]);
  const tail = new THREE.Group(); tail.position.x = -size[0]*.84; rig.add(tail);
  if (isPuffer) {
    fin([[0,0],[-.43,.29],[-.48,0],[-.43,-.29]], tail);
    fin([[-.3,.55],[-.15,.90],[.2,.61]]);
    // Soft bumps, not dangerous spikes.
    for(let i=0;i<19;i++) {
      const a=i*2.39996, y=1-2*(i+.5)/19, r=Math.sqrt(1-y*y);
      ball(rig, accentMaterial, [Math.cos(a)*r*.72,y*.69,Math.sin(a)*r*.58], [.065,.065,.065]);
    }
  } else if (isAngel) {
    fin([[0,0],[-.61,.51],[-.42,0],[-.61,-.51]],tail);
    fin([[-.44,.36],[-.40,1.38],[.35,.59]]);
    fin([[-.40,-.38],[-.51,-1.3],[.36,-.53]]);
    for (const z of [-.3,.3]) for (let i=0;i<3;i++) {
      const stripe=ball(rig,accentMaterial,[-.27+i*.26,.01,z],[.05,.64-i*.1,.027]); stripe.rotation.z=-.17;
    }
  } else {
    fin([[0,0],[-.70,.72],[-.91,.57],[-.77,.05],[-.92,-.55],[-.69,-.71]],tail);
    fin([[-.55,.3],[-.33,.91],[.23,.51],[.4,.32]]);
    fin([[-.47,-.26],[-.55,-.78],[.24,-.35]]);
    for(const z of [-.37,.37]) for(let i=0;i<5;i++) ball(rig,accentMaterial,[-.48+i*.2,.06+(i%2)*.16,z],[.06,.07,.025]);
  }
  const fins = [];
  for(const sign of [-1,1]) {
    const pivot=new THREE.Group();pivot.position.set(-.03,-.1,sign*size[2]*.87);rig.add(pivot);
    const f=ball(pivot,accentMaterial,[-.13,-.12,sign*.1],[.3,.13,.075]);f.rotation.z=.6;fins.push(pivot);
  }
  const eyes=[], pupils=[];
  for(const sign of [-1,1]) {
    const eye=new THREE.Group();eye.position.set(size[0]*.66,.2,sign*size[2]*.72);rig.add(eye);
    ball(eye,white,[0,0,0],[.215,.235,.19]);
    const pupil=ball(eye,dark,[.11,.015,sign*.105],[.105,.128,.09]);
    ball(pupil,white,[.3,.34,sign*.5],[.28,.25,.24]);
    eyes.push(eye);pupils.push(pupil);
    ball(rig,blushMat,[size[0]*.61,-.13,sign*size[2]*.88],[.13,.07,.025]);
  }
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.105,.029,7,20,Math.PI),dark);
  mouth.rotation.set(0,Math.PI/2,Math.PI);mouth.position.set(size[0]*1.015,-.1,0);rig.add(mouth);
  const mouthHole=ball(rig,dark,[size[0]*1.015,-.08,0],[.02,.12,.105]);mouthHole.visible=false;
  // Invisible but raycastable ellipsoid makes selection forgiving on touch.
  const hit=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({visible:false}));
  hit.scale.set(size[0]+.2,size[1]+.23,size[2]+.2);hit.userData.fishId=data.id;root.add(hit);
  return { root,rig,body,bodyMaterial,tail,fins,eyes,pupils,mouth,mouthHole,hit, size, dispose:()=>disposeObject(root) };
}

