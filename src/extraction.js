import * as T from 'three';
import R from 'rapier';
import {cabinX,cabinZ} from './terrain.js';
import {groundPoint,station} from './field-stations.js';
import {person} from './rescue.js';
import {vec} from './mechanics.js';

const planKey='extraction-plan';
const resultKey='extraction-return';
const approaches=[
  {id:'pump',name:'Drain the Echo crossing with the salvage pump',requires:'pond-pump',seconds:52,checkpoints:[[150,-11],[145,-1]],
    description:'The transfer pump lowers the reflection long enough for a carry through the main grid.'},
  {id:'signal',name:'Time the Echo crossing with the aligned recording',requires:'synced-audio',seconds:38,checkpoints:[[146,-13],[141,-3]],
    description:'The siren and winch reveal a quiet interval in the reflection.'},
  {id:'guide',name:'Use the crossing marks supplied by Cal’s family',requires:'extraction-family',seconds:44,checkpoints:[[155,-10],[150,1]],
    description:'Cal’s family marks the route he took before the evacuation.'}
];
const shelter=new T.Vector3(154,0,-20);
const pickup=new T.Vector3(154,.85,-16);
const landing=new T.Vector3(142.1,0,8.45);

export class Extraction {
  constructor(mechanics,chapters,bag,pipeline,models,notice){
    Object.assign(this,{mechanics,chapters,bag,pipeline,models,notice});
    const realm=mechanics.scenes[1];
    this.plans=approaches.map((route,i)=>{
      const base=groundPoint(cabinX+3.4+i*1.42,cabinZ-6.85);
      const setup=station(mechanics,0,base,route.name,()=>this.choose(route),{color:0x686253+i*0x0a0703});
      const prop=pipeline.prepare([models.transferPump,models.receiver,models.lantern][i],
        {position:[0,.945,0],scale:.72});
      const lower=new T.Box3().setFromObject(prop).min.y;
      if(Number.isFinite(lower))prop.position.y+=.945-lower;
      setup.body.add(prop);
      return setup;
    });
    const aid=station(mechanics,1,pickup.clone().setY(0),'Help Cal into the extraction harness',()=>this.start(),
      {color:0x8c654e});
    const exit=station(mechanics,1,landing,'Check the return marker by the arch',()=>
      'Carry the occupied harness to this marker before the reflection closes.',{color:0x58978d});
    const transfer=mechanics.fixed.get(exit.collider.handle);
    transfer.acceptName='Bring Cal through the crossing';
    transfer.accept=item=>this.deliver(item);
    this.beacon=new T.Group();
    const metal=new T.MeshStandardMaterial({color:0xb88d52,metalness:.4});
    const lens=new T.MeshStandardMaterial({color:0x8ff4c9,emissive:0x439d7b,emissiveIntensity:1.4});
    const stake=new T.Mesh(new T.CylinderGeometry(.042,.072,.85,10),metal);
    stake.position.y=.425;
    const marker=new T.Mesh(new T.TorusGeometry(.145,.036,8,16),lens);
    marker.position.y=.9;
    this.beacon.add(stake,marker);
    this.beacon.visible=false;
    realm.add(this.beacon);
    this.aid=aid;
    this.exit=exit;
    this.survivor=person(0x606d68).root;
    this.survivor.position.copy(pickup).add(new T.Vector3(1.1,-.85,0));
    this.survivor.visible=false;
    realm.add(this.survivor);
    this.returned=person(0x606d68).root;
    this.returned.position.copy(groundPoint(cabinX+5.9,cabinZ+4.2));
    this.returned.visible=false;
    mechanics.scenes[0].add(this.returned);
    const position=this.returned.position.clone().add(new T.Vector3(0,1,0));
    const returned=mechanics.world.createCollider(R.ColliderDesc.ball(.42)
      .setTranslation(...position.toArray()).setSensor(true).setCollisionGroups((128<<16)|2));
    mechanics.tag(returned,{name:'Talk to the man brought back through the arch',action:()=>{
      if(chapters.ending==='seal')return '“I heard the radio go quiet. Tell Cricket I remembered the way home.”';
      if(chapters.ending==='hold')return '“I’ll help mark the next crossing. I never heard the other man stop calling.”';
      return '“Does Cricket still hide the good mugs? I remember the kitchen. I can’t tell you whose voice was on that bank.”';
    }});
    this.returnedSensor=returned;
    this.show(false);
    this.showReturned();
  }

  available(){
    const records=this.bag.records;
    return (this.chapters.stage===4||this.chapters.ending==='hold')&&records.has('founders-original-tape')&&
      records.has('extraction-ranger')&&records.has('extraction-family')&&!records.has(resultKey);
  }
  show(visible){
    this.visible=visible;
    for(const site of [...this.plans,this.aid,this.exit]){
      site.body.visible=visible;
      site.collider.setEnabled(visible);
    }
    this.survivor.visible=visible&&!this.load;
  }
  showReturned(){
    const visible=this.bag.records.has(resultKey);
    this.returned.visible=visible;
    this.returnedSensor.setEnabled(visible);
  }
  choose(route){
    if(!this.available())return 'Compare the original tape and hear both witnesses first.';
    if(!this.bag.records.has(route.requires))return route.id==='pump'?
      'Bring the transfer pump up from Submerged Street to open this approach.':
      'The crew needs the evidence for this approach.';
    this.bag.record(planKey,'Echo crossing plan',route.id);
    return route.description+' Cross into the grid and find Cal outside the reflected house.';
  }
  plan(){
    return approaches.find(route=>route.id===this.bag.records.get(planKey)?.description);
  }
  start(){
    const plan=this.plan();
    if(!this.available()||!plan||this.mechanics.area!==1)return 'Set an extraction plan at camp before making the carry.';
    if(this.load)return 'Cal is already in the harness. Get to the marked return point by the arch.';
    const {visual,shape}=this.pipeline.loose(this.models.extractionHarness,1);
    const personInHarness=person(0x606d68).root;
    personInHarness.rotation.x=-Math.PI/2;
    personInHarness.position.set(0,.25,.72);
    visual.add(personInHarness);
    const start=pickup.clone().add(new T.Vector3(-.9,-.58,.25));
    this.load=this.mechanics.dynamic({position:start.toArray(),visual,shape:shape.setDensity(2.4),
      size:[.75,.45,2],area:1,name:'Occupied extraction harness',impactLimit:Infinity});
    this.load.body.setEnabledRotations(false,true,false,true);
    this.remaining=plan.seconds;
    this.checkpoint=0;
    this.updateBeacon();
    this.survivor.visible=false;
    return 'Cal is strapped in. Lift the harness and carry him to the return marker beside the arch.';
  }
  crossingMarker(){
    const point=this.plan()?.checkpoints[this.checkpoint];
    return point?new T.Vector3(point[0],0,point[1]):null;
  }
  updateBeacon(){
    const point=this.crossingMarker();
    this.beacon.visible=!!this.load&&!!point;
    if(point)this.beacon.position.copy(point);
  }
  reset(){
    const load=this.load;
    this.load=null;
    this.beacon.visible=false;
    if(this.mechanics.items.has(load.collider.handle))this.mechanics.remove(load);
    this.survivor.visible=this.visible;
  }
  deliver(item){
    if(item!==this.load||!this.available())return 'The return marker is waiting for Cal’s occupied harness.';
    if(this.crossingMarker())return 'The reflection is unstable here. Follow the lit crossing marker first.';
    const plan=this.plan();
    this.reset();
    this.bag.record(resultKey,'Cal returned through the arch',
      'You carried the man who remembered Cricket across the Echo Grid using the '+plan.id+' approach. His identity remains uncertain.');
    this.show(false);
    this.showReturned();
    return 'The ranger catches the harness. “I’ve got him. Come back through.”';
  }
  tick(dt){
    const active=this.available();
    if(active&&!this.house){
      this.house=this.pipeline.place(this.models.cabin,{position:shelter.toArray(),scale:.76,collider:'authored'});
      this.mechanics.scenes[1].add(this.house);
    }
    if(this.visible!==active)this.show(active);
    if(!this.load)return;
    this.remaining-=dt;
    const lost=!this.mechanics.items.has(this.load.collider.handle)||vec(this.load.body.translation()).y<-3;
    if(!active||this.mechanics.area!==1||this.remaining<=0||lost){
      this.reset();
      if(active)this.notice('The crossing shifted. Cal is back at the shelter. Set another plan at camp or retry the carry.');
      return;
    }
    const marker=this.crossingMarker();
    const player=this.mechanics.walker.current;
    if(marker&&this.mechanics.carried===this.load&&Math.hypot(marker.x-player.x,marker.z-player.z)<2){
      this.checkpoint++;
      this.updateBeacon();
    }
  }
  objective(){
    if(!this.available())return null;
    if(this.chapters.story.area===0&&!this.plan()){
      const option=approaches.findIndex(route=>this.bag.records.has(route.requires));
      return {text:'Optional extraction · Choose a crossing plan or decide the arch’s fate',target:this.plans[option].point};
    }
    if(this.chapters.story.area===0)return {text:'Optional extraction · Cross the arch to find Cal',target:this.chapters.story.gates[0]};
    if(!this.plan())return null;
    if(!this.load)return {text:'Extraction · Find Cal outside the reflected house',target:this.aid.point};
    if(this.mechanics.carried!==this.load)return {text:'Extraction · Pick up the harness · '+Math.ceil(this.remaining)+' s',
      target:vec(this.load.body.translation())};
    const marker=this.crossingMarker();
    if(marker)return {text:'Extraction · Carry Cal through the lit marker · '+Math.ceil(this.remaining)+' s',target:marker};
    return {text:'Extraction · Carry Cal to the return marker · '+Math.ceil(this.remaining)+' s',target:this.exit.point};
  }
}
