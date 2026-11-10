import * as T from 'three';
import {groundPoint,station} from './field-stations.js';
import {height,plots,trailX} from './terrain.js';
import {part,vec} from './mechanics.js';

const startZ=27.2,finishZ=3.4;
const tapeKey='founders-original-tape';
const leadKey='founders-depot';
const routePoint=z=>groundPoint(trailX(z)+.6,z);

export class FoundersNight {
  constructor(mechanics,pipeline,models,bag,notice){
    Object.assign(this,{mechanics,bag,notice});
    const post=plots[2];
    const dispatch=station(mechanics,0,groundPoint(post.x+3.55,post.z+6.1),'Read the archive dispatch board',()=>{
      if(!this.unlocked())return 'The dispatch board is covered. Finish comparing the two addresses first.';
      if(bag.records.has(tapeKey))return 'The original tape is already filed in your bag.';
      if(bag.records.has(leadKey))return 'The archive load went to the creek storehouse.';
      if(this.tail)return 'The archive truck is on the south road. Use the receipt beside the board if you lose it.';
      this.tail={z:startZ,started:false,contact:0};
      this.truck.position.copy(routePoint(startZ));
      this.truck.rotation.y=0;
      this.truck.visible=true;
      return 'The truck waits on the south road. Bring the wagon close and follow it through town.';
    },{color:0x526959});
    this.dispatch=dispatch.point;
    const receipt=station(mechanics,0,groundPoint(post.x+4.55,post.z+6.95),'Read the backup delivery receipt',()=>{
      if(!this.unlocked())return 'The receipt is clipped under the archive dispatch board.';
      if(bag.records.has(tapeKey))return 'The receipt matches the original tape in your bag.';
      return this.revealDepot('delivery receipt');
    },{color:0xae8959});
    this.receipt=receipt.point;
    for(let i=0;i<3;i++)part(receipt.body,[.27,.012,.19],[i*.019,.951+i*.012,0],0xd7bf91,.004);
    this.truck=pipeline.prepare(models.archiveTruck,{position:routePoint(startZ).toArray()});
    this.truck.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true;});
    this.truck.visible=false;
    mechanics.scenes[0].add(this.truck);
    const depot=station(mechanics,0,groundPoint(7.8,7.7),'Recover the original evacuation tape',()=>{
      if(bag.records.has(tapeKey))return 'The archive tape has already been recovered.';
      if(!bag.records.has(leadKey))return 'The storehouse crate is tagged with an archive delivery number. Find the matching dispatch first.';
      bag.record(tapeKey,'Original evacuation tape',
        'The official roll call ends early. On the original tape, two people answer to the same name from opposite banks. Mom asks the ranger to keep the crossing open.');
      return 'You recover the original tape. Two people answered to the same name, and Mom asked the ranger to keep the crossing open.';
    },{color:0x536961});
    const recorder=pipeline.prepare(models.receiver,{position:[0,.95,0],scale:.63});
    const low=new T.Box3().setFromObject(recorder).min.y;
    if(Number.isFinite(low))recorder.position.y+=.946-low;
    depot.body.add(recorder);
    this.depot=depot.point;
  }

  unlocked(){return this.bag.records.has('second-address-filed');}

  revealDepot(method){
    if(!this.bag.records.has(leadKey)){
      this.bag.record(leadKey,'Archive delivery destination',
        'The creek storehouse received the archive load. Lead found via '+method+'.');
    }
    this.tail=null;
    this.truck.visible=false;
    return 'The load went to the creek storehouse. Find the matching crate by the water.';
  }

  tick(dt){
    const m=this.mechanics;
    if(!this.tail||m.area!==0)return;
    const {tail,truck}=this;
    const player=m.driving?vec(m.car.body.translation()):m.walker.current;
    const near=Math.hypot(player.x-truck.position.x,player.z-truck.position.z);
    if(!tail.started){
      if(!m.driving||near>9)return;
      tail.started=true;
      this.notice('The archive truck is moving. Stay close enough to follow it.');
    }
    tail.inRange=m.driving&&near<13;
    if(tail.inRange)tail.contact+=dt;
    tail.z=Math.max(finishZ,tail.z-dt*3.65);
    const next=routePoint(tail.z);
    const delta=next.clone().sub(truck.position);
    if(delta.lengthSq()>0)truck.rotation.y=Math.atan2(-delta.x,-delta.z);
    truck.position.copy(next);
    if(tail.z>finishZ)return;
    if(tail.contact>=3.2){this.notice(this.revealDepot('following the archive truck'));return;}
    this.tail=null;
    truck.visible=false;
    this.notice('The truck got away. The backup receipt at the post office still has its destination.');
  }

  objective(){
    if(this.mechanics.area!==0||!this.unlocked()||this.bag.records.has(tapeKey))return null;
    if(this.bag.records.has(leadKey))return {text:'Founders’ Night · Recover the tape at the creek storehouse',target:this.depot};
    if(this.tail)return {text:this.tail.started?
      this.tail.inRange?'Founders’ Night · Tracking the truck · '+Math.min(100,Math.floor(this.tail.contact/3.2*100))+'%':
        'Founders’ Night · Close the gap or use the backup receipt':
      'Founders’ Night · Bring the wagon to the south road',target:this.truck.position};
    return {text:'Founders’ Night · Check the archive dispatch board or backup receipt',target:this.dispatch};
  }
}
