import * as T from 'three';
import {height} from './terrain.js';
import {vec} from './mechanics.js';

const roosts=[[11,6.1],[-17,7.7]];

export class CreekBirds {
  constructor(mechanics){
    this.mechanics=mechanics;
    const feather=new T.MeshStandardMaterial({color:0x736b58,roughness:.94});
    const wingGeometry=new T.ConeGeometry(.145,.43,3);
    const bodyGeometry=new T.SphereGeometry(.13,8,6);
    this.flocks=roosts.map(([x,z])=>{
      const home=new T.Vector3(x,height(x,z),z);
      const birds=Array.from({length:4},(_,i)=>{
        const root=new T.Group();
        const body=new T.Mesh(bodyGeometry,feather);
        body.scale.set(.72,.74,1.55);
        root.add(body);
        const wings=[-1,1].map(side=>{
          const pivot=new T.Group();
          const wing=new T.Mesh(wingGeometry,feather);
          wing.rotation.z=-side*Math.PI/2;
          wing.position.x=side*.17;
          pivot.add(wing);
          root.add(pivot);
          return pivot;
        });
        const perch=home.clone().add(new T.Vector3((i-1.5)*.41,0,i%2*.56));
        perch.y=height(perch.x,perch.z)+.115;
        root.position.copy(perch);
        mechanics.scenes[0].add(root);
        return {root,wings,perch};
      });
      return {home,birds,elapsed:0,direction:null};
    });
  }

  tick(dt,noise){
    const m=this.mechanics;
    if(m.area!==0)return;
    const player=m.driving?vec(m.car.body.translation()):m.walker.current;
    for(const flock of this.flocks){
      const {home,birds}=flock;
      if(!flock.direction){
        const threat=noise?.distanceToSquared(home)<81?noise:player;
        const away=home.clone().sub(threat);
        if(away.lengthSq()>(threat===noise?81:21))continue;
        away.y=0;
        if(away.lengthSq()<.001)away.z=1;
        flock.direction=away.normalize();
      }
      flock.elapsed+=dt;
      const time=flock.elapsed;
      if(time>=20&&player.distanceToSquared(home)>100){
        flock.elapsed=0;
        flock.direction=null;
        for(const {root,wings,perch} of birds){
          root.visible=true;
          root.position.copy(perch);
          wings.forEach(wing=>{wing.rotation.z=0;});
        }
        continue;
      }
      for(const [i,{root,wings,perch}] of birds.entries()){
        const flight=Math.max(0,time-i*.06);
        root.visible=flight<4;
        if(!root.visible)continue;
        root.position.copy(perch).addScaledVector(flock.direction,flight*4.8);
        root.position.y=Math.max(perch.y+flight*2,height(root.position.x,root.position.z)+.115);
        root.rotation.y=Math.atan2(flock.direction.x,flock.direction.z);
        const flap=Math.sin(flight*25+i)*.68;
        wings[0].rotation.z=flap;
        wings[1].rotation.z=-flap;
      }
    }
  }
}
