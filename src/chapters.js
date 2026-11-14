import * as T from 'three';
import R from 'rapier';
import {person} from './rescue.js';
import {part} from './mechanics.js';
import {cabinX,cabinZ,plots} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const key='bellwether-chapters-v1';
const sequence=[1,0,2];
const archiveTape='founders-original-tape';
const rangerBriefing='extraction-ranger';
const familyBriefing='extraction-family';
const returnedKey='extraction-return';
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
    finale.echoEnding=()=>this.ending;
    const post=plots[2];
    this.ledger=station(mechanics,0,groundPoint(post.x+3.8,post.z-3.7),'Read the emergency dispatch ledger',()=>{
      if(!finale.choice)return 'The postmaster keeps the emergency ledger closed until the rescue tape is accounted for.';
      if(this.stage!==0)return 'The warning lists a blue gauge, an amber gauge and a red relief target. Test them in that order.';
      this.advance(1);
      bag.record('flood-warning','Undelivered flood warning','Open the relief in order: blue gauge, amber gauge, red relief target.');
      if(bag.records.has('creek-pump-echo')){
        return 'The warning describes the same trick you caught at the pump. Trust the plates you can see move. Shoot blue, amber, then red at the lower spillway.';
      }
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
      part(mechanics.scenes[0],[.13,1.34,.14],[x,base.y+.67,z],0x64503d);
      const {visual,collider}=mechanics.staticBox([.44,.42,.27],[x,base.y+1.23,z],color);
      visual.material.emissive.setHex(color);
      visual.material.emissiveIntensity=.16;
      mechanics.tag(collider,{name:label+' spillway gauge',action:()=>'Aim and shoot the plate. The warning gives the order.'});
      mechanics.onImpact.set(collider.handle,()=>this.pulse(i));
      this.gauges.push({point:visual.position.clone(),visual});
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
      bag.record('moms-original','Mom’s original recording','Mom shut the inner spillway gate to stop the flood. She kept the survey crossing open because Cal was still answering from the other bank. The porch light was her signal that someone was waiting.');
      return 'Mom shut the floodgate, but kept the crossing open for Cal. Head back to camp and compare her recording with the original evacuation tape.';
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
    this.installBriefing(mechanics,finale.rescue);
  }
  installBriefing(mechanics,rescue){
    if(!rescue)return;
    rescue.extractionBriefing=()=>{
      if(!this.briefingAvailable())return '';
      if(this.bag.records.has(rangerBriefing)&&this.bag.records.has(familyBriefing))return '';
      if(this.bag.records.has(rangerBriefing))return '“I heard two men answer to Cal. Before you decide, hear what the family needs from you.”';
      this.bag.record(rangerBriefing,'The ranger’s eyewitness account',
        'The ranger watched one Cal climb the bank. The original radio kept answering from across the water. He wants another crossing before anyone shuts the arch.');
      return '“I pulled one man out. Then the other Cal called my name from the far bank. I left him there. We can go back, but first hear the family out.”';
    };
    this.ranger=rescue.ranger.root;
    const base=groundPoint(cabinX+6.8,cabinZ+4.8);
    this.family=base.clone().add(new T.Vector3(0,1.03,0));
    const parent=person(0x5e6f5b).root;
    parent.position.copy(base);
    parent.rotation.y=-Math.PI*.32;
    const child=person(0x83704b).root;
    child.position.copy(groundPoint(base.x+.58,base.z+.32));
    child.scale.setScalar(.68);
    child.rotation.y=parent.rotation.y;
    parent.visible=child.visible=false;
    mechanics.scenes[0].add(parent,child);
    const target=mechanics.world.createCollider(R.ColliderDesc.capsule(.31,.39)
      .setTranslation(...this.family.toArray()).setSensor(true).setCollisionGroups((128<<16)|2));
    target.setEnabled(false);
    mechanics.tag(target,{name:'Hear Cal’s family out',action:()=>{
      if(this.ending)return this.crossingFamily?.()||this.familyAftermath();
      if(!this.bag.records.has(familyBriefing)){
        this.bag.record(familyBriefing,'Cal’s family at Foxglove Camp',
          'Cal’s sister wants the arch closed to protect her child. Her child heard Cal use a private family nickname on the other bank and wants to leave the way open.');
      }
      return 'His sister says, “Close it before another one walks into our kitchen.” Her child tugs her sleeve. “The voice across the water called me Cricket. Only Uncle Cal calls me that.”';
    }});
    this.showFamily=visible=>{
      parent.visible=child.visible=visible;
      target.setEnabled(visible);
    };
  }
  needsArchive(){
    return this.stage===4&&!this.bag.records.has(archiveTape);
  }
  familyAftermath(){
    const returned=this.bag.records.has(returnedKey);
    if(this.ending==='seal'){
      return returned?
        'Cricket puts the good mugs on the table. Cal’s sister says, “He knew where we kept them. I’m going to sit with him and hear what he remembers.”':
        'Cal’s sister sets a mug out for Cricket. “I asked you to close it. I still wish we could have brought him home.”';
    }
    return returned?
      'Cricket leaves the porch light on. “He found his way home. Maybe someone else is still waiting for a light.”':
      'Cal’s sister hands Cricket a lantern. “We can mark the bank from here. Nobody crosses until the ranger has a line on them.”';
  }
  briefingAvailable(){
    return (this.stage===4||this.ending==='hold')&&this.bag.records.has(archiveTape);
  }
  briefingObjective(){
    if(!this.family||!this.briefingAvailable()||this.story.area!==0)return null;
    if(!this.bag.records.has(rangerBriefing))return {text:'Chapter 4 · Ask the ranger who came back',target:this.ranger.position};
    if(!this.bag.records.has(familyBriefing))return {text:'Chapter 4 · Hear Cal’s family out at camp',target:this.family};
    return null;
  }
  tick(){
    const visible=this.briefingAvailable()||!!this.ending&&this.bag.records.has(familyBriefing);
    if(visible===this.familyVisible)return;
    this.familyVisible=visible;
    this.showFamily?.(visible);
  }
  advance(stage){
    this.stage=stage;
    try{localStorage.setItem(key,JSON.stringify({stage,ending:this.ending}));}catch{}
  }
  pulse(index){
    if(this.stage!==1)return;
    if(index!==sequence[this.pulses]){
      this.pulses=0;
      for(const gauge of this.gauges)gauge.visual.material.emissiveIntensity=.16;
      this.notice('Wrong plate. The relief resets. Blue, amber, red.');
      return;
    }
    this.pulses++;
    this.gauges[index].visual.material.emissiveIntensity=1.15;
    if(this.pulses===3){
      this.advance(2);
      this.notice('Relief open. The route marker is exposed.');
    }else this.notice('Gauge latched · '+this.pulses+'/3.');
  }
  finish(ending){
    if(this.ending)return this.ending==='seal'?'The arch is sealed.':'The arch stays open for the search party.';
    if(this.stage!==4)return 'Recover the original recording before deciding what to do with the arch.';
    if(this.needsArchive())return 'File the original evacuation tape before deciding. Start with the ledger at Submerged Street if you haven’t found the second address.';
    if(this.briefingObjective())return 'Hear the ranger and Cal’s family out before deciding what to do with the crossing.';
    this.ending=ending;
    this.story.archSealed=ending==='seal';
    this.advance(5);
    const returned=this.bag.records.has(returnedKey);
    const message=ending==='seal'?
      returned?'The arch goes quiet. The man you brought back can finally speak to his family. The second radio falls silent.':
        'The arch goes quiet. Mom’s recording stays with you.':
      returned?'The man you brought back marks a route for the next search. Another voice answers the ranger on the open channel.':
        'You mark a safe crossing and keep the arch open. The missing townspeople now have a way home.';
    this.bag.record('arch-choice','The Way Back',message,'Keepsakes');
    return message;
  }
  objective(){
    if(!this.finale.choice)return null;
    const area=this.story.area;
    if(this.stage===5)return this.briefingObjective()??{text:this.ending==='seal'?'The Way Back · Arch sealed':'The Way Back · Search crossing open',target:null};
    if(area===1&&this.stage!==3)return {text:'Return through the arch to Foxglove Camp',target:this.story.gates[1]};
    if(this.stage===0)return {text:'Chapter 2 · Read the emergency dispatch ledger',target:this.ledger};
    if(this.stage===1)return {text:'Shoot the gauges in order · blue, amber, red',target:this.gauges[sequence[this.pulses]].point};
    if(this.stage===2)return {text:'Read the exposed route marker',target:this.marker};
    if(this.stage===3)return area===1?{text:this.released?'Recover the original recording':'Chapter 3 · Grapple the brass porch ring',
      target:this.released?this.recordingPoint:this.echoRing}:{text:'Chapter 3 · Cross into the Echo Grid',target:this.story.gates[0]};
    return this.briefingObjective()??{text:'Chapter 4 · Seal the arch or keep it open for a rescue',target:this.arch};
  }
}
