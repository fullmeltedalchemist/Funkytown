import * as T from 'three';
import R from 'rapier';
import {cabinX,cabinZ,height,plots} from './terrain.js';

const vec=(p)=>new T.Vector3(p.x,p.y,p.z);
const near=(a,b,r)=>a.distanceToSquared(b)<r*r;
const post=(x,z,y=0)=>new T.Vector3(x,height(x,z)+y,z);

export class Missions {
  frequency=0;
  dials=[0,0,0];
  relayIndex=0;
  relayTime=0;
  carryDone=false;
  constructor(story,pipeline,models){
    this.story=story;
    this.mechanics=story.mechanics;
    const m=this.mechanics;
    const vale=plots[0];
    this.receiver=post(cabinX+4.7,cabinZ+3.1,.35);
    this.pickup=post(vale.x-4.4,vale.z+3.8,.46);
    const radio=pipeline.loose(models.receiver,1);
    this.radio=m.dynamic({...radio,position:this.pickup.toArray(),name:'Vale field receiver',area:0,home:this.pickup});
    this.mechanics.tag(this.radio.collider,{name:'Carry field receiver',action:()=>{
      m.grab(this.radio);
      return 'Bring the receiver to the tuning stand at Foxglove Camp. Set it down by the antenna.';
    }});
    this.station(this.receiver,0,'Tune field receiver',()=>this.tune(),pipeline,models);
    this.valves=[post(-6,-8,.75),post(4,-3,.75),post(8,2,.75)];
    for(const [i,p] of this.valves.entries()){
      this.station(p,0,'Turn sluice valve '+(i+1),()=>{
        if(story.state!==2)return 'The lodge letter explains how to set the sluices.';
        this.dials[i]=(this.dials[i]+1)%4;
        if(this.calibrated())return 'The sluices agree. The violet arch is open.';
        return 'Valve '+(i+1)+' set to '+this.dials[i]+'. Settings: '+this.dials.join(' / ')+'.';
      },pipeline,models,'valve');
    }
    this.start=new T.Vector3(140,1,7);
    this.station(this.start,1,'Start Echo Grid signal trial',()=>{
      if(story.state!==3)return 'The signal trial is complete.';
      this.relayTime=42;this.relayIndex=0;
      return 'Shoot the lit dishes in order. Follow the arrow. You have 42 seconds.';
    },pipeline,models);
    this.relays=[new T.Vector3(134,1.8,2),new T.Vector3(146,3.1,-3),new T.Vector3(136,4.3,-8)];
    this.targets=this.relays.map(p=>{
      const {visual,collider}=m.staticBox([.78,.78,.18],p.toArray(),0x725989,1);
      visual.visible=false;
      const dish=pipeline.prepare(models.dish,{position:p.toArray()});
      const lamp=dish.getObjectByName('relayLamp');
      lamp.material=lamp.material.clone();
      m.scenes[1].add(dish);
      return {lamp,collider};
    });
    this.targets.forEach(({collider},i)=>m.onImpact.set(collider.handle,()=>this.hitRelay(i)));
  }
  station(point,area,name,action,pipeline,models,asset='receiver'){
    const m=this.mechanics;
    const collider=m.world.createCollider(R.ColliderDesc.cuboid(.43,.47,.34)
      .setTranslation(point.x,point.y,point.z).setSensor(true).setCollisionGroups((128<<16)|2));
    m.tag(collider,{name,action});
    m.scenes[area].add(pipeline.prepare(models[asset],{position:point.toArray(),scale:.86}));
  }
  tune(){
    if(this.story.state!==1)return 'The receiver is idle.';
    if(!this.carryDone)return 'Set the receiver down within two meters of the tuning stand.';
    this.frequency=(this.frequency+1)%8;
    return this.frequency===5?'Channel 5 locks in. You can hear Mom. Read the letter inside.':
      'Channel '+this.frequency+' · static. The journal marks channel 5.';
  }
  calibrated(){return this.dials.join('')==='213';}
  hitRelay(i){
    if(this.story.state!==3||!this.relayTime||i!==this.relayIndex)return;
    this.relayIndex++;
    if(this.relayIndex===this.relays.length)this.relayTime=0;
  }
  tick(dt){
    const m=this.mechanics;
    if(this.story.state===1&&!this.carryDone){
      if(!m.carried&&near(vec(this.radio.body.translation()),this.receiver,2.1))this.carryDone=true;
    }
    if(this.relayTime>0)this.relayTime=Math.max(0,this.relayTime-dt);
    this.targets.forEach(({lamp},i)=>lamp.material.emissive.setHex(this.relayTime&&i===this.relayIndex?0xe29453:0x000000));
  }
  get passed(){return this.relayIndex===this.relays.length;}
  target(){
    const {state,area}=this.story;
    if(state===1&&(!this.carryDone||this.frequency!==5))
      return this.carryDone||this.mechanics.carried===this.radio?this.receiver:vec(this.radio.body.translation());
    if(state===2&&!this.calibrated())return this.valves[this.dials.findIndex((n,i)=>n!==[2,1,3][i])];
    if(state===3&&area===1&&!this.passed)return this.relayTime?this.relays[this.relayIndex]:this.start;
    return null;
  }
  objective(){
    const {state,area}=this.story;
    if(state===1&&!this.carryDone)return this.mechanics.carried===this.radio?'Carry the receiver to camp and set it down':'Recover the field receiver beside Vale House';
    if(state===1&&this.frequency!==5)return 'Tune to channel 5 · current '+this.frequency;
    if(state===2&&!this.calibrated())return 'Set sluice valves to 2 / 1 / 3 · current '+this.dials.join(' / ');
    if(state===3&&area===1&&!this.passed)return this.relayTime?'Shoot lit dish '+(this.relayIndex+1)+'/3 · '+Math.ceil(this.relayTime)+' s':'Start the signal trial at the receiver';
    return null;
  }
}
