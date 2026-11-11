import * as T from 'three';
import {height} from './terrain.js';

function animal(scene,color,deer){
  const root=new T.Group();
  const geometry=new T.SphereGeometry(1,12,8);
  const material=new T.MeshStandardMaterial({
    color,roughness:.87,transparent:deer,opacity:deer?.48:1,
    emissive:deer?0x204f44:0,depthWrite:!deer
  });
  function piece(x,y,z,sx,sy,sz){
    const mesh=new T.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);
    root.add(mesh);
  }
  const bodyY=deer?.95:.53;
  piece(0,bodyY,0,.29,.32,.61);
  piece(0,bodyY+.14,.53,.19,.24,.27);
  piece(0,bodyY+.09,.75,.16,.13,.23);
  for(const side of [-1,1]){
    for(const z of [-.33,.33])piece(side*.19,bodyY*.36,z,.078,bodyY*.36,.081);
    piece(side*.13,bodyY+.34,.54,.07,.14,.09);
  }
  scene.add(root);
  return root;
}

export class CreekWildlife {
  constructor(mechanics,bag,notice,playCall){
    Object.assign(this,{mechanics,bag,notice,playCall});
    const scene=mechanics.scenes[0];
    this.boar=animal(scene,0x583b2f,false);
    this.home=new T.Vector3(17,height(17,-8),-8);
    this.boar.position.copy(this.home);
    this.chargeTime=0;
    this.rest=0;
    this.heading=new T.Vector3();
    this.struck=new Set();
    this.deer=animal(scene,0x9de9ca,true);
    this.deer.visible=false;
    this.tracks=new T.Group();
    const material=new T.MeshBasicMaterial({color:0x6d9c86,polygonOffset:true,polygonOffsetFactor:-2});
    for(let i=0;i<7;i++){
      const x=-18+i*.57,z=-11+i*.29;
      for(const offset of [-.072,.072]){
        const print=new T.Mesh(new T.CircleGeometry(.065,6),material);
        print.rotation.x=-Math.PI/2;
        print.scale.set(.65,1.4,1);
        print.position.set(x+offset,height(x+offset,z)+.022,z);
        this.tracks.add(print);
      }
    }
    scene.add(this.tracks);
    this.trackEnd=this.tracks.children.at(-1).position.clone();
    this.echoTime=0;
    this.called=false;
  }

  tick(dt){
    const m=this.mechanics;
    if(m.area!==0)return;
    const player=m.driving?m.car.body.translation():m.walker.current;
    this.updateBoar(dt,player);
    if(this.called)return;
    const end=this.trackEnd;
    if(!this.echoTime&&Math.hypot(player.x-end.x,player.z-end.z)>3.5)return;
    this.echoTime+=dt;
    const x=end.x+this.echoTime*2.2,z=end.z-this.echoTime*.8;
    this.deer.position.set(x,height(x,z),z);
    this.deer.rotation.y=Math.atan2(2.2,-.8);
    this.deer.visible=this.echoTime<1.15;
    if(this.echoTime<1.8)return;
    this.called=true;
    this.playCall(this.deer.position);
    this.bag.record('echo-deer','The missing hoofprints',
      'A pale deer crossed the bank. Its prints stopped before the bend, but its call carried on beyond them.');
    this.notice('The hoofprints stop here. A deer calls from beyond the bend.');
  }

  updateBoar(dt,player){
    const position=this.boar.position;
    this.rest=Math.max(0,this.rest-dt);
    if(!this.chargeTime){
      this.heading.set(player.x-position.x,0,player.z-position.z);
      const distance=this.heading.length();
      if(!this.rest&&distance>.1&&distance<6&&position.distanceTo(this.home)<8){
        this.heading.normalize();
        this.chargeTime=1.35;
        this.struck.clear();
        this.notice('A boar lowers its head. Step out of its path.');
        return;
      }
      this.heading.copy(this.home).sub(position).setY(0);
      if(this.heading.lengthSq()<.04)return;
      position.addScaledVector(this.heading.normalize(),Math.min(.9*dt,position.distanceTo(this.home)));
    }else{
      this.chargeTime=Math.max(0,this.chargeTime-dt);
      position.addScaledVector(this.heading,dt*5.5);
      if(!this.chargeTime)this.rest=6;
      for(const item of this.mechanics.items.values()){
        if(item.area!==0||item.kind!=='prop'||item===this.mechanics.carried||item===this.mechanics.cargo||
          this.struck.has(item)||item.body.mass()>18)continue;
        const p=item.body.translation();
        if(Math.hypot(p.x-position.x,p.z-position.z)>.85||Math.abs(p.y-position.y-.4)>.65)continue;
        item.body.applyImpulse({x:this.heading.x*3.2,y:1.4,z:this.heading.z*3.2},true);
        this.struck.add(item);
      }
    }
    position.y=height(position.x,position.z);
    this.boar.rotation.y=Math.atan2(this.heading.x,this.heading.z);
  }
}
