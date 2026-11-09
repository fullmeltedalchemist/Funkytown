import * as T from 'three';
import R from 'rapier';
import {part} from './mechanics.js';
import {height} from './terrain.js';

export const groundPoint=(x,z)=>new T.Vector3(x,height(x,z),z);

export function station(mechanics,area,base,name,action,{color=0x936239,onGrapple}={}){
  const scene=mechanics.scenes[area];
  const body=new T.Group();
  body.position.copy(base);
  scene.add(body);
  part(body,[.38,.81,.34],[0,.35,0],0x594434,.028);
  const top=part(body,[.61,.19,.47],[0,.85,0],color,.036);
  const point=base.clone().add(new T.Vector3(0,.85,0));
  const collider=mechanics.world.createCollider(R.ColliderDesc.cuboid(.32,.26,.25)
    .setTranslation(...point.toArray()).setSensor(true).setCollisionGroups((128<<16)|2));
  mechanics.tag(collider,{name,action,onGrapple});
  return {body,top,point,collider};
}
