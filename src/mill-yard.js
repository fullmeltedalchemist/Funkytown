import * as T from 'three';
import R from 'rapier';
import {part} from './mechanics.js';
import {height} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const repaired='mill-wheel-cleared';
const originX=15,originZ=-16;

export class MillYard {
  constructor(mechanics,bag,notice,unlocked){
    Object.assign(this,{mechanics,bag,notice,unlocked});
    const y=height(originX,originZ);
    const center=new T.Vector3(originX,y+1.16,originZ);
    const scene=mechanics.scenes[0];
    this.wheel=new T.Group();
    this.wheel.position.copy(center);
    scene.add(this.wheel);
    const rim=new T.Mesh(new T.TorusGeometry(1.05,.088,8,30),
      new T.MeshStandardMaterial({color:0x674c37,roughness:.86}));
    this.wheel.add(rim);
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      const plank=part(this.wheel,[.13,1.04,.24],[Math.sin(angle)*.53,Math.cos(angle)*.53,0],0x8a6648);
      plank.rotation.z=-angle;
      const paddle=part(this.wheel,[.4,.115,.5],[Math.sin(angle)*1.04,Math.cos(angle)*1.04,0],0x705037);
      paddle.rotation.z=-angle;
    }
    // Fixed supports flank the rotating art and keep the axle grounded.
    for(const dz of [-.48,.48]){
      const z=originZ+dz,base=height(originX,z);
      mechanics.staticBox([.18,center.y-base,.17],[originX,(base+center.y)/2,z],0x564735);
    }
    this.brakeHome=groundPoint(originX+1.5,originZ+.34).add(new T.Vector3(0,.32,0));
    if(!bag.records.has(repaired))this.stockBrake();
    const shelf=groundPoint(originX+3.22,originZ+2.05);
    mechanics.staticBox([.56,.88,.46],[shelf.x,shelf.y+.44,shelf.z],0x65513f);
    this.slipHome=shelf.add(new T.Vector3(0,.906,0));
    station(mechanics,0,groundPoint(originX+2.4,originZ+2.05),'Inspect the old mill wheel',()=>{
      if(bag.records.has(repaired))return 'The wheel is turning. Take the time slip from the shelf beside the dial to June at the diner. She used to keep the mill crew’s coffee tabs.';
      if(!unlocked())return 'The brake sled is tagged with the same survey marks as the spillway. Find the old crossing notes first.';
      return 'The brake sled has wedged against the rim. Drag it clear or rig it to the wagon and reel it out from the driver’s seat.';
    },{color:0x697365});
  }

  stockBrake(){
    const visual=new T.Group();
    part(visual,[.76,.3,.49],[0,0,0],0x645047,.034);
    for(const z of [-.17,.17])part(visual,[.83,.10,.12],[0,-.13,z],0x424641,.014);
    part(visual,[.16,.22,.13],[.22,.23,0],0xad8657,.018);
    this.brake=this.mechanics.dynamic({
      visual,position:this.brakeHome.toArray(),home:this.brakeHome,name:'Mill brake sled',
      size:[.83,.44,.49],shape:R.ColliderDesc.cuboid(.41,.18,.25).setDensity(4),impactLimit:Infinity
    });
  }

  tick(dt){
    if(this.mechanics.area!==0)return;
    if(this.bag.records.has(repaired)){
      this.wheel.rotation.z+=dt*.66;
      if(!this.bag.records.has('mill-slip-identified')&&
        (!this.slip||!this.mechanics.items.has(this.slip.collider.handle))){
        const visual=new T.Group();
        part(visual,[.31,.03,.22],[0,0,0],0xc7a279,.008);
        part(visual,[.23,.006,.045],[0,.017,0],0x71594d);
        this.slip=this.mechanics.dynamic({visual,position:this.slipHome.toArray(),home:this.slipHome,
          name:'Mill time slip',size:[.31,.045,.22],shape:R.ColliderDesc.cuboid(.155,.022,.11),impactLimit:Infinity});
        this.slip.millSlip=true;
      }
      return;
    }
    if(!this.unlocked())return;
    const brake=this.brake;
    if(!this.mechanics.items.has(brake.collider.handle)){
      this.stockBrake();
      return;
    }
    const p=brake.body.translation();
    if(Math.hypot(p.x-this.brakeHome.x,p.z-this.brakeHome.z)<1.6)return;
    this.bag.record(repaired,'The mill’s second bell',
      'The brake sled came clear. The mill dial reveals two separate signals: a shift bell and a high-water warning. Inez heard Cal after the warning.');
    this.notice('The brake clears the rim. The wheel turns and the mill dial reveals a second bell signal.');
  }
}
