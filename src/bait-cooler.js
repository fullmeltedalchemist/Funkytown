import * as T from 'three';
import R from 'rapier';
import {part,vec} from './mechanics.js';
import {groundPoint,station} from './field-stations.js';

const reward='bait-cooler-returned';
export const coolerBank={x:-7.2,z:3.3};

export class BaitCooler {
  constructor(mechanics,bag,notice,ready){
    Object.assign(this,{mechanics,bag,notice,ready});
    this.bank=groundPoint(coolerBank.x,coolerBank.z);
    const dock=station(mechanics,0,groundPoint(-9.2,5.8),'Check the bait cooler rack',()=>this.start(),
      {color:0x526e69});
    this.drop=dock.point;
    const receiver=mechanics.fixed.get(dock.collider.handle);
    receiver.acceptName='Return the bait cooler';
    receiver.accept=item=>this.deliver(item);
  }

  start(){
    if(!this.ready())return 'The bait crew returns after the ford rescue.';
    if(this.bag.records.has(reward))return 'The bait cooler is back. Take a lure from the camp pantry whenever you need one.';
    if(this.cooler&&this.mechanics.items.has(this.cooler.collider.handle)){
      return 'Catch the cooler before it drifts away. Carry it back or rig a tow line and load it onto the wagon.';
    }
    const visual=new T.Group();
    part(visual,[.62,.34,.41],[0,0,0],0x388482,.04);
    part(visual,[.65,.08,.44],[0,.19,0],0xe5d4aa,.025);
    part(visual,[.24,.07,.085],[0,.12,.225],0x2e4242,.015);
    for(const x of [-.22,.22])part(visual,[.05,.11,.04],[x,.11,.23],0x988c6d,.008);
    const start=this.bank.clone().add(new T.Vector3(0,.35,0));
    this.cooler=this.mechanics.dynamic({visual,position:start.toArray(),area:0,
      name:'Runaway bait cooler',size:[.65,.44,.47],impactLimit:Infinity,breakEffect:()=>{},
      shape:R.ColliderDesc.cuboid(.325,.22,.235).setDensity(.56).setFriction(.32)});
    this.cooler.floatSurface=-1.3;
    this.cooler.floatLift=42;
    this.cooler.body.setLinvel({x:.15,y:0,z:-3.1},true);
    this.elapsed=0;
    return 'The cooler slips off the bank. Catch it on foot or pull it out with the tow line. Return it to this rack.';
  }

  deliver(item){
    if(item!==this.cooler||!this.mechanics.items.has(item?.collider.handle))return 'This rack is for the runaway bait cooler.';
    this.mechanics.remove(item);
    this.cooler=null;
    this.bag.record(reward,'The bait crew’s thanks',
      'You brought the cooler back from the creek. The camp pantry now hands out reusable lure supplies for the cottontail trail.','Keepsakes');
    return 'Cooler back on the rack. The crew will leave bait for you at the camp pantry.';
  }

  tick(dt){
    const item=this.cooler;
    if(!item||this.mechanics.area!==0||item===this.mechanics.carried||item===this.mechanics.cargo)return;
    this.elapsed+=dt;
    const present=this.mechanics.items.has(item.collider.handle);
    const p=present?item.body.translation():null;
    if(p&&this.elapsed<75&&p.y>-7&&Math.hypot(p.x-this.bank.x,p.z-this.bank.z)<26)return;
    if(present)this.mechanics.remove(item);
    this.cooler=null;
    this.notice('The cooler drifted out of reach. The crew will bring it back. Check the bait rack to retry.');
  }

  objective(){
    const {cooler,mechanics:m}=this;
    if(m.area!==0||!cooler||!m.items.has(cooler.collider.handle))return null;
    if(cooler===m.carried||cooler===m.cargo)return {text:'Optional · Return the cooler to the bait rack',target:this.drop};
    return {text:'Optional · Catch or tow the runaway cooler',target:vec(cooler.body.translation())};
  }
}
