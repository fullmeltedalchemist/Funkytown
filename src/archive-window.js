import * as T from 'three';
import R from 'rapier';
import {groundPoint,station} from './field-stations.js';
import {part,vec} from './mechanics.js';
import {person} from './rescue.js';

const site={x:12.25,z:7.7};
export const nearArchiveWindow=(x,z,pad=0)=>Math.abs(x-site.x)<2.1+pad&&Math.abs(z-site.z)<3.3+pad;
export const dispatchLog='archive-window-original';
export const dispatchReceipt='archive-window-receipt';
export const dispatchDamage='archive-window-damaged';
const opened='archive-window-opened';

export class ArchiveWindow {
  constructor(mechanics,bag,tow,pipeline,models,notice){
    Object.assign(this,{mechanics,bag,tow,pipeline,models,notice});
    const m=mechanics,scene=m.scenes[0];
    const base=groundPoint(site.x,site.z);
    const point=(x,y,z)=>base.clone().add(new T.Vector3(x,y,z));
    const timber=0x6b5742,steel=0x536661,brass=0xcaa665;
    const box=(size,x,y,z,color)=>m.staticBox(size,point(x,y,z).toArray(),color);
    for(const x of [-1.21,1.21]){
      const foot=groundPoint(site.x+x,site.z-.48);
      const h=base.y+3.98-foot.y;
      box([.17,h,.18],x,3.98-h/2,-.48,timber);
      box([.46,1.23,.16],x*.78,2.94,-.48,timber);
      box([.16,.16,1.85],x,3.96,.32,timber);
    }
    box([2.42,2.33,.15],0,1.14,-.48,timber);
    box([2.61,.27,.16],0,3.83,-.48,timber);
    box([2.62,.17,.21],0,3.96,1.2,timber);
    for(const n of [-1,1]){
      box([.15,.73,.13],n*.69,2.84,-.48,steel);
    }
    // The sill folds out of the case's path when the clerk's hand winch is engaged.
    this.sill=box([1.22,.115,.61],0,2.57,-.30,steel);
    this.sillHome=this.sill.visual.position.clone();
    const anchor=box([.22,.21,.19],0,3.66,1.2,brass);
    this.anchor=anchor.collider;
    this.eye=point(0,3.66,1.2);
    const ring=new T.Mesh(new T.TorusGeometry(.134,.026,8,24),new T.MeshStandardMaterial({
      color:brass,roughness:.34,metalness:.61
    }));
    ring.position.copy(this.eye);scene.add(ring);
    const cart=groundPoint(site.x,site.z+1.2);
    this.cart=cart.clone().add(new T.Vector3(0,.63,0));
    const pad=m.staticBox([1.26,.16,1.22],this.cart.clone().add(new T.Vector3(0,-.08,0)).toArray(),0x858065);
    this.pad=pad.collider;
    const frame=pad.visual;
    part(frame,[1.32,.105,1.28],[0,-.135,0],steel,.023);
    for(const x of [-.51,.51])for(const z of [-.41,.41]){
      const ground=groundPoint(cart.x+x,cart.z+z);
      const center=ground.y+.16;
      const tire=new T.Mesh(new T.CylinderGeometry(.16,.16,.1,16),new T.MeshStandardMaterial({color:0x312c27}));
      tire.position.set(cart.x+x,center,cart.z+z);tire.rotation.z=Math.PI/2;
      tire.castShadow=true;scene.add(tire);
      const deck=this.cart.y-.16;
      part(scene,[.07,Math.max(.08,deck-center),.08],[cart.x+x,(deck+center)/2,cart.z+z],steel,.01);
    }
    this.home=point(0,2.66,-.11);
    const worker=person(0x556e68).root;
    worker.position.copy(groundPoint(site.x+2,site.z+1.25));
    worker.rotation.y=-Math.PI/2;
    scene.add(worker);
    const control=station(m,0,groundPoint(site.x+1.58,site.z+2.08),'Operate the archive hand winch',
      ()=>this.operate(),{color:steel});
    this.control=control.point;
    const drum=new T.Mesh(new T.CylinderGeometry(.145,.145,.23,16),new T.MeshStandardMaterial({color:brass}));
    drum.rotation.z=Math.PI/2;drum.position.set(0,1.025,0);
    control.body.add(drum);
    const slip=station(m,0,groundPoint(site.x+2.25,site.z+.45),'Talk to the archive clerk',
      ()=>this.clerk(),{color:0x9f8051});
    this.clerkPoint=slip.point;
    part(slip.body,[.29,.018,.21],[0,.954,0],0xd5b98c,.008);
    if(bag.records.has(opened)&&!this.finished()&&!bag.records.has(dispatchDamage))this.stockCase();
  }

  finished(){
    const records=this.bag.records;
    return records.has(dispatchLog)||records.has(dispatchReceipt);
  }

  clerk(){
    const records=this.bag.records;
    if(records.has(dispatchLog))return '“You saved the signed log. June can compare its closure order with Ed’s callout.”';
    if(records.has(dispatchReceipt))return '“The duplicate gives us the case number and destination. The signature page was only in the original.”';
    if(records.has(dispatchDamage)){
      this.bag.record(dispatchReceipt,'Duplicate archive receipt',
        'The carbon copy identifies dispatch 07-C and the lower-road closure. It names the creek storehouse as the destination. The signature and time are missing.');
      return 'The clerk turns over the duplicate. “Dispatch zero-seven C. We can prove where they sent it. The copy never had the signed order.”';
    }
    if(!records.has('founders-original-tape'))return '“Start with the evacuation tape. Once it’s filed, I can open the upstairs dispatch window.”';
    this.tracked=true;
    if(!records.has(opened)){
      this.bag.record(opened,'Dispatch case at the loading window','The clerk found the flood dispatch log upstairs. Lower the case onto the padded cart.');
      this.stockCase();
      return '“The stairs gave out. Rig the case to the brass eye over the cart, then use the hand winch. It swings the sill away and lets you lower the case.”';
    }
    if(!this.attached&&!this.onCart()&&this.swingTime!=null){
      if(this.tow.first?.item===this.case)this.tow.clear();
      this.setSill(false);
      this.swingTime=null;
      this.paying=false;
      this.mechanics.resetProp(this.case,this.home);
      return 'The clerk brings the intact case back to the sill. Rig the brass eye and try the winch again.';
    }
    return '“Rig the case first, then the brass eye. Use the winch to feed line. Once it’s resting on the cart, release the line and use the case.”';
  }

  stockCase(){
    const source=this.pipeline.loose(this.models.archiveTapeCase,.94);
    const m=this.mechanics;
    const item=m.dynamic({...source,position:this.home.toArray(),size:[.53,.27,.43],home:this.home,
      name:'Fragile dispatch case',impactLimit:3.05,breakEffect:p=>this.damaged(p)});
    item.towPoint=new T.Vector3(0,.27,0);
    item.towAnchor=this.anchor.handle;
    item.body.setLinearDamping(.65);
    item.body.setAngularDamping(2.1);
    m.tag(item.collider,{name:item.name,action:()=>this.file()});
    this.case=item;
  }

  get attached(){
    return this.tow.joint&&this.tow.first.item===this.case;
  }

  setSill(open){
    const p=this.sillHome;
    const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),open?Math.PI/2:0);
    this.sill.visual.quaternion.copy(rotation);
    this.sill.visual.position.copy(p).add(new T.Vector3(0,open?-.37:0,open?-.36:0));
    this.sill.collider.setTranslation(this.sill.visual.position);
    this.sill.collider.setRotation(rotation);
  }

  operate(){
    if(!this.case)return 'Talk to the archive clerk first.';
    this.tracked=true;
    if(!this.attached)return 'Use Rig on the dispatch case, then on the brass eye above the cart.';
    if(this.paying){
      this.paying=false;
      return 'The winch brake holds. Use again to feed more line.';
    }
    if(this.onCart())return 'The cart is supporting the case. Use Rig to release the line, then inspect the case.';
    this.setSill(true);
    if(this.swingTime==null)this.swingTime=.85;
    this.paying=true;
    return 'Feeding line. Use the winch again to hold.';
  }

  onCart(){
    if(!this.case)return false;
    const p=this.case.body.translation();
    return Math.abs(p.x-this.cart.x)<.49&&Math.abs(p.z-this.cart.z)<.49&&
      Math.abs(p.y-this.cart.y)<.12&&vec(this.case.body.linvel()).length()<.35;
  }

  file(){
    if(this.attached)return 'Release the line with Rig once the cart supports the case.';
    if(!this.onCart())return 'The clerk needs the case on the padded cart before opening it.';
    this.mechanics.remove(this.case);
    this.case=null;
    this.bag.record(dispatchLog,'Signed lower-road dispatch log',
      'Dispatch 07-C, signed by Supervisor Mercer, ordered the lower cut closed one minute before the second bell. A handwritten exception sends Ed in after a wagon that never checked in.');
    return 'The clerk checks the seal. “Mercer signed the cut closed before the bell, then sent Ed in after a wagon nobody logged.”';
  }

  damaged(p){
    if(this.tow.first?.item===this.case)this.tow.clear();
    this.case=null;
    this.paying=false;
    this.bag.record(dispatchDamage,'Dispatch case damaged','The case seal broke. The clerk kept a duplicate receipt.');
    if(p.distanceTo(this.mechanics.walker.current)<10)this.notice('The seal breaks. Ask the clerk for the duplicate receipt.');
  }

  tick(dt){
    if(!this.case||this.mechanics.area!==0)return;
    if(!this.mechanics.items.has(this.case.collider.handle)){
      this.damaged(this.home);
      return;
    }
    if(!this.attached){this.paying=false;return;}
    if(!this.paying)return;
    if(this.swingTime>0){
      this.swingTime-=dt;
      return;
    }
    const limit=this.eye.y-this.cart.y+.18;
    if(this.tow.length<limit&&!this.onCart()){
      this.tow.resize(Math.min(limit,this.tow.length+dt*.57));
    }else{
      this.paying=false;
      this.notice(this.onCart()?'The case is on the padding. Release the line with Rig.':'The spool is empty. Inspect the case and cart.');
    }
  }

  objective(){
    if(!this.tracked||this.finished()||this.mechanics.area!==0)return null;
    if(!this.case)return {text:'Optional · Ask the clerk for the duplicate receipt',target:this.clerkPoint};
    if(this.onCart())return {text:this.attached?'Optional · Release the tow line with Rig':'Optional · Open the case on the cart',target:this.cart};
    if(this.attached)return {text:this.paying?'Optional · Watch the case descend':'Optional · Use the hand winch',target:this.paying?this.cart:this.control};
    const first=this.tow.first?.item===this.case;
    return {text:first?'Optional · Rig the brass eye above the cart':'Optional · Rig the fragile case at the window',
      target:first?this.eye:this.home};
  }
}
