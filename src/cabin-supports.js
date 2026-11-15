import * as T from 'three';
import {height} from './terrain.js';

// Coordinates match the porch and stair collision meshes in ranger-cabin.glb.
export function supportCabin(mechanics,position,scale=1,yaw=0){
  const [x,y,z]=position;
  const supports=[
    [-3.26,3.96,.29,.29,.275],
    [3.26,3.96,.29,.29,.275],
    [0,4.49,1.80,.58,.016],
    [-3.24,-2.31,.38,.38,.165],
    [3.24,-2.31,.38,.38,.165]
  ];
  for(const [dx,dz,width,depth,top] of supports){
    const point=new T.Vector3(dx*scale,0,dz*scale).applyAxisAngle(new T.Vector3(0,1,0),yaw);
    const px=x+point.x,pz=z+point.z;
    const foot=height(px,pz)-.085;
    const cap=y+top*scale;
    if(cap-foot<.04)continue;
    const plinth=mechanics.staticBox([width*scale,cap-foot,depth*scale],[px,(foot+cap)/2,pz],0x6b6055);
    plinth.visual.rotation.y=yaw;
    plinth.collider.setRotation(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw));
  }
}
