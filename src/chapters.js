import * as T from 'three';
import {part} from './mechanics.js';
import {cabinX,cabinZ,plots} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const key='bellwether-chapters-v1';
const sequence=[1,0,2];
const echo=(x,z,y=-.015)=>new T.Vector3(x,y,z);

export class Chapters {
  stage=0;
  ending='';
  pulses=0;
  constructor(mechanics,story,finale,bag,notice){
    Object.assign(this,{story,finale,bag,notice});
    try{
      const save=JSON.parse(localStorage.getItem(key)||'{}');
      if(Number.isInteger(save.stage)&&save.stage>=0&&save.stage<=5)this.stage=save.stage;
      if(this.stage===5&&['seal','hold'].includes(save.ending))this.ending=save.ending;
      else if(this.stage===5)this.stage=4;
    }catch{}
    story.archSealed=this.ending==='seal';
    const post=plots[2];
    this.ledger=station(mechanics,0,groundPoint(post.x+3.8,post.z-3.7),'Read the emergency dispatch ledger',()=>{
      if(!finale.choice)return 'The postmaster keeps the emergency ledger closed until the rescue tape is accounted for.';
      if(this.stage!==0)return 'The warning lists a north gauge, a south gauge and a red relief target. Test them in that order.';
      this.advance(1);
      bag.record('flood-warning','Undelivered flood warning','Open the relief in order: blue north gauge, amber south gauge, red relief target.');
      return finale.choice==='public'?
        'The postmaster has marked the warning for you. Shoot blue, amber, then red at the lower spillway to expose the route marker.':
        'The ranger slipped the warning into the ledger. Shoot blue, amber, then red at the lower spillway to expose the route marker.';
    }).point;
    this.gauges=[];
    for(const [i,{x,z,label,color}] of [
      {x:7.3,z:-5.2,label:'Amber',color:0xd48f3b},
      {x:6.1,z:-3.3,label:'Blue',color:0x51a9cb},
      {x:8.2,z:-2.4,label:'Red',color:0xd05d56}
    ].entries()){
      const base=groundPoint(x,z);
      const post=part(mechanics.scenes[0],[.13,1.34,.14],[x,base.y+.67,z],0x64503d);
      const {visual,collider}=mechanics.staticBox([.44,.42,.27],[x,base.y+1.23,z],color);
      visual.material.emissive.setHex(color);
      visual.material.emissiveIntensity=.16;
      mechanics.tag(collider,{name:label+' spillway gauge',action:()=>'Aim and shoot the plate. The warning gives the order.'});
      mechanics.onImpact.set(collider.handle,()=>this.pulse(i));
      this.gauges.push({point:post.position.clone(),visual});
    }
    this.marker=station(mechanics,0,groundPoint(9.8,-4.4),'Read the exposed route marker',()=>{
      if(this.stage<2)return 'A bolted lid hides the old route marker. The spillway test releases it.';
      if(this.stage>2)return 'The survey marker points to the Echo Grid and a cable above the old porch.';
      bag.record('survey-crossing','Old survey crossing','An older route into the Echo Grid leads to a reflected porch. Pull its ring down with the grapple.');
      this.advance(3);
      return 'The marker is exposed. Follow the camp arch into the Echo Grid and find the reflected porch.';
    }).point;

    const realm=mechanics.scenes[1];
    const porch=echo(150,-14);
    for(const x of [-1.5,1.5]){
      part(realm,[.19,4.3,.19],[porch.x+x,2.13,porch.z],0x544364);
    }
    part(realm,[3.5,.2,.65],[porch.x,4.17,porch.z],0x6a5076);
    const ring=new T.Mesh(new T.TorusGeometry(.23,.042,10,24),
      new T.MeshStandardMaterial({color:0xe6ac59,metalness:.7,roughness:.33,emissive:0x714217}));
    ring.position.copy(echo(150,-13.62,3.83));realm.add(ring);
    part(realm,[.065,.28,.065],[150,4.03,-13.62],0x95663c);
    this.echoRing=ring.position;
    const hit=mechanics.staticBox([.58,.58,.28],ring.position.toArray(),0x916341,1);
    hit.visual.visible=false;
    const recording=station(mechanics,1,echo(150,-14.65),'Recover Mom’s original recording',()=>{
      if(!this.released&&this.stage<4)return 'The latch holds the recorder under the porch beam. Grapple the brass ring above you.';
      if(this.stage!==3)return 'The recorder holds Mom’s original voice.';
      this.advance(4);
      bag.record('moms-original','Mom’s original recording','The Echo remembers words spoken by the creek. Mom knows the porch light was left on.');
      return 'The original recording confirms it. Head back to camp and choose what to do with the arch.';
    });
    this.recordingPoint=recording.point;
    mechanics.tag(hit.collider,{name:'Reflected porch ring',onGrapple:()=>{
      if(this.stage<3)return 'The porch is still an unstable reflection. Find the survey marker first.';
      if(this.released||this.stage>=4)return 'The recorder is already on the porch stand.';
      this.released=true;
      ring.rotation.y=Math.PI/3;
      part(recording.body,[.27,.11,.2],[0,1.01,0],0xc1a072,.022);
      return 'The latch swings open and the recorder drops onto the stand.';
    }});
    this.arch=station(mechanics,0,groundPoint(cabinX-2.2,cabinZ-9.2),'Seal the arch',()=>this.finish('seal'),
      {color:0x6f5085}).point;
    station(mechanics,0,groundPoint(cabinX+2.3,cabinZ-9.2),'Keep the arch open for a rescue',()=>this.finish('hold'),
      {color:0x5d8c88});
  }
  advance(stage){
    this.stage=stage;
    try{localStorage.setItem(key,JSON.stringify({stage,ending:this.ending}));}catch{}
  }
  pulse(index){
    if(this.stage!==1)return;
    if(index!==sequence[this.pulses]){
      this.pulses=0;
      this.notice('Wrong plate. The relief resets. Blue, amber, red.');
      return;
    }
    this.pulses++;
    if(this.pulses===3){
      this.advance(2);
      this.notice('Relief open. The route marker is exposed.');
    }else this.notice('Gauge latched · '+this.pulses+'/3.');
  }
  finish(ending){
    if(this.ending)return this.ending==='seal'?'The arch is sealed.':'The arch stays open for the search party.';
    if(this.stage!==4)return 'Recover the original recording before deciding what to do with the arch.';
    this.ending=ending;
    this.story.archSealed=ending==='seal';
    this.advance(5);
    const message=ending==='seal'?'The arch goes quiet. Mom’s recording stays with you.':
      'You mark a safe crossing and keep the arch open. The missing townspeople now have a way home.';
    this.bag.record('arch-choice','The Way Back',message,'Keepsakes');
    return message;
  }
  objective(){
    if(!this.finale.choice)return null;
    const area=this.story.area;
    if(this.stage===5)return {text:this.ending==='seal'?'The Way Back · Arch sealed':'The Way Back · Search crossing open',target:null};
    if(area===1&&this.stage!==3)return {text:'Return through the arch to Foxglove Camp',target:this.story.gates[1]};
    if(this.stage===0)return {text:'Chapter 2 · Read the emergency dispatch ledger',target:this.ledger};
    if(this.stage===1)return {text:'Shoot the gauges in order · blue, amber, red',target:this.gauges[sequence[this.pulses]].point};
    if(this.stage===2)return {text:'Read the exposed route marker',target:this.marker};
    if(this.stage===3)return area===1?{text:this.released?'Recover the original recording':'Chapter 3 · Grapple the brass porch ring',
      target:this.released?this.recordingPoint:this.echoRing}:{text:'Chapter 3 · Cross into the Echo Grid',target:this.story.gates[0]};
    return {text:'Chapter 4 · Seal the arch or keep it open for a rescue',target:this.arch};
  }
}
