import * as T from 'three';
import R from 'rapier';
import {height} from './terrain.js';
import {groundPoint,station} from './field-stations.js';
import {part} from './mechanics.js';

const center=-.6,start=27.8,length=4.4,width=3.25;
export const nearFairground=(x,z,padding)=>Math.abs(x-center)<2.9+padding&&z>start-length-1.8-padding&&z<start+2.2+padding;

export function installFairground(mechanics){
  const scene=mechanics.scenes[0];
  const positions=[],indices=[];
  for(let i=0;i<=8;i++){
    const t=i/8,z=start-t*length;
    for(let j=0;j<=4;j++){
      const x=center+(j/4-.5)*width;
      positions.push(x,height(x,z)+.045+.62*t,z);
      if(i<8&&j<4){
        const a=i*5+j;
        indices.push(a,a+1,a+5,a+1,a+6,a+5);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ramp=new T.Mesh(geometry,new T.MeshStandardMaterial({color:0x967349,roughness:.86,side:T.DoubleSide}));
  ramp.receiveShadow=true;scene.add(ramp);
  const collider=mechanics.world.createCollider(R.ColliderDesc.trimesh(
    new Float32Array(positions),new Uint32Array(indices)).setFriction(.89));
  for(const x of [center-width*.48,center+width*.48]){
    for(let i=1;i<=8;i++){
      const z=start-i*length/8,y=height(x,z);
      const post=part(scene,[.1,.23+.62*i/8,.1],[x,y+.1+.31*i/8,z],i%2?0xd8ad61:0x8c483d,.008);
      post.castShadow=false;
    }
  }
  station(mechanics,0,groundPoint(center+2.35,start-.2),'Read the fairground ramp rules',()=>
    'Take the ramp from the south end. Ease off the throttle before landing. Strap any fragile cargo first.',{color:0xa47950});
  for(const [x,z] of [[center-2.35,start-4.1],[center+2.2,start-4.75]]){
    const visual=new T.Group();
    const wood=new T.MeshStandardMaterial({color:0x775037,roughness:.88});
    const iron=new T.MeshStandardMaterial({color:0x465053,metalness:.51,roughness:.5});
    const shell=new T.Mesh(new T.LatheGeometry([
      new T.Vector2(.215,-.31),new T.Vector2(.255,-.24),new T.Vector2(.281,0),
      new T.Vector2(.255,.24),new T.Vector2(.215,.31)
    ],20),wood);
    visual.add(shell);
    for(const y of [-.229,.229]){
      const band=new T.Mesh(new T.CylinderGeometry(.261,.261,.049,20),iron);
      band.position.y=y;visual.add(band);
    }
    for(const y of [-.31,.31]){
      const lid=new T.Mesh(new T.CylinderGeometry(.216,.216,.034,20),wood);
      lid.position.y=y;visual.add(lid);
    }
    const home=groundPoint(x,z).add(new T.Vector3(0,.337,0));
    const barrel=mechanics.dynamic({position:home.toArray(),home,visual,name:'Loose fairground barrel',
      size:[.562,.654,.562],impactLimit:9.6,shape:R.ColliderDesc.cylinder(.327,.277).setDensity(.7).setFriction(.49)});
    barrel.floatSurface=-1.36;
    barrel.floatLift=31;
  }
  for(const [x,z] of [[center-2.5,start-1.5],[center+2.2,start-2.65]]){
    mechanics.crate(groundPoint(x,z).add(new T.Vector3(0,.31,0)).toArray());
  }
  return {collider,center,start,length};
}
