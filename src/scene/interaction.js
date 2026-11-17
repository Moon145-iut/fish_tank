import * as THREE from 'three';

export function bindInteraction(canvas,camera,school,onSelect,onHover){
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let start=null,hovered=null;
 function pick(event){
  const rect=canvas.getBoundingClientRect();
  pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  // Decorations are intentionally excluded. The hit proxies are oversized ellipsoids.
  const hits=raycaster.intersectObjects([...school.controllers.values()].map(c=>c.model.hit),true);
  for(const hit of hits){let node=hit.object;while(node){if(node.userData.fishId)return node.userData.fishId;node=node.parent;}}
  return null;
 }
 function hover(id){if(hovered===id)return;hovered=id;canvas.classList.toggle('is-hovering',!!id);school.hover(id);onHover(id);}
 const down=event=>{if(event.button!==0)return;start={x:event.clientX,y:event.clientY,id:event.pointerId,moved:false};};
 const move=event=>{if(start&&Math.hypot(event.clientX-start.x,event.clientY-start.y)>6)start.moved=true;if(event.pointerType!=='touch')hover(pick(event));};
 const up=event=>{if(!start||start.id!==event.pointerId)return;const click=!start.moved&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<=6;start=null;if(click){const id=pick(event);if(id)onSelect(id);else hover(null);}};
 const leave=()=>hover(null),cancel=()=>{start=null;hover(null);};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('pointercancel',cancel);
 return ()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('pointercancel',cancel);};
}
