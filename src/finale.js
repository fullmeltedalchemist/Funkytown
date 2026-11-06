import {openTape} from './tape.js';
import * as T from 'three';
import R from 'rapier';
import {height,cabinX,cabinZ,plots} from './terrain.js';

const point=(x,z,y)=>new T.Vector3(x,height(x,z)+y,z);
const key='bellwether-finale-v1';
export class Finale {
  constructor(mechanics,rescue,bag,pipeline,models,water,notice){
    Object.assign(this,{mechanics,rescue,bag,water});
    this.stage=0;this.choice='';
    try{
      const save=JSON.parse(localStorage.getItem(key)||'{}');
      if(Number.isInteger(save.stage)&&save.stage>=0&&save.stage<=3)this.stage=save.stage;
      if(['public','private'].includes(save.choice))this.choice=save.choice;
    }catch{}
    this.gates=[0,0,0];this.pressure=.85;this.hold=0;
    this.positions=[point(-7.2,-7.5,.84),point(-9,-7,.84),point(-10.8,-6.6,.84)];
    this.intake=point(-12.6,-6.9,.9);
    this.lookout=point(cabinX+6,cabinZ+5,1.1);
    this.scene=mechanics.scenes[0];
    for(const [i,p] of this.positions.entries()){
      const valve=this.model(p,pipeline,models.valve);
      this.station(p,'Adjust intake gate '+(i+1),()=>{
        if(this.stage>0)return 'The intake is already drained.';
        this.gates[i]=(this.gates[i]+1)%3;
        this.hold=0;
        valve.rotation.z=this.gates[i]*Math.PI/3;
        return 'Gates '+this.gates.join(' / ')+' · balance the intake. Target: 2 / 0 / 1.';
      });
    }
    this.model(this.intake,pipeline,models.arch,.48);
    this.station(this.intake,'Search the intake',()=>{
      if(this.stage===0)return 'The gate is still under pressure.';
      if(this.stage!==1)return 'Only silt and scraps of rope remain.';
      bag.record('rescue-jacket','Cal’s rescue jacket','Dry inside a chamber that should have been underwater.');
      bag.record('dispatch-tape','Original dispatch tape','The recording runs past the timestamp in the official transcript.');
      this.advance(2);
      return 'You recover Cal’s jacket and the dispatch tape. Someone scratched at the outside of the chamber door.';
    });
    this.model(this.lookout,pipeline,models.receiver,1.22);
    this.station(this.lookout,'Open the tape deck',()=>{
      if(this.stage!==2)return 'The deck waits for the original dispatch tape.';
      openTape(()=>{
        bag.record('synced-audio','Synced rescue recording','Mom ordered the spillway shut while Cal was still on the radio.');
        this.advance(3);
        notice('The siren and winch line up. Cal was alive when Mom ordered the inner gate shut.');
      });
      return '';
    });
    for(const [i,choice] of ['public','private'].entries()){
      const p=this.lookout.clone().add(new T.Vector3(i?1.7:-1.7,0,.5));
      this.model(p,pipeline,i?models.lantern:models.receiver,.72);
      this.station(p,i?'Give the tape to the ranger':'Broadcast the recording',()=>{
        if(this.stage!==3||this.choice)return 'The decision is settled or the recording is not ready.';
        this.choice=choice;this.advance(3);
        return (i?'The ranger listens alone.':'The town falls silent as the recording goes out.')+
          ' The woman finishes a sentence that was never on the tape. “Ask her what he said next,” the ranger says.';
      });
    }
  }
  model(point,pipeline,source,scale=1){
    const model=pipeline.prepare(source,{position:point.toArray(),scale});
    this.scene.add(model);return model;
  }
  station(p,name,action){
    const c=this.mechanics.world.createCollider(R.ColliderDesc.ball(.36).setTranslation(...p.toArray())
      .setSensor(true).setCollisionGroups((128<<16)|2));
    this.mechanics.tag(c,{name,action:()=>this.rescue.stage===4?action():'Finish reconstructing the rescue first.'});
  }
  advance(stage){
    this.stage=stage;
    try{localStorage.setItem(key,JSON.stringify({stage,choice:this.choice}));}catch{}
  }
  tick(dt){
    this.water.uniforms.current.value+=dt*this.mechanics.creekFlow;
    if(this.rescue.stage!==4)return;
    if(this.stage>0){this.mechanics.creekFlow=.55;return;}
    const balanced=this.gates.join('')==='201';
    this.pressure=T.MathUtils.lerp(this.pressure,balanced?.12:.84,1-Math.exp(-dt*1.2));
    this.mechanics.creekFlow=.35+this.pressure*1.65;
    this.hold=balanced?this.hold+dt:0;
    if(this.hold>=3)this.advance(1);
  }
  objective(){
    if(this.rescue.stage!==4||this.rescue.story.area!==0)return null;
    if(this.choice)return {text:'Chapter 1 complete · '+(this.choice==='public'?'the town heard the tape':'the ranger heard the tape privately'),target:null};
    if(this.stage===0){
      const index=this.gates.findIndex((n,i)=>n!==[2,0,1][i]);
      return {text:'Balance intake gates 2 / 0 / 1 · '+this.gates.join(' / ')+' · pressure '+Math.round(this.pressure*100)+'%',target:this.positions[index]??this.intake};
    }
    if(this.stage===1)return {text:'Search the drained intake chamber',target:this.intake};
    if(this.stage===2)return {text:'Align the dispatch tape with the siren and winch',target:this.lookout};
    return {text:'Broadcast the evidence or give the tape to the ranger privately',target:this.lookout};
  }
}

export class MailRoute {
  constructor(mechanics,bag,pipeline,models){
    const post=plots[2],vale=plots[0];
    const start=point(post.x+3.8,post.z,1.1);
    const valeDoor=point(vale.x-3.6,vale.z+1.6,.82);
    const oldAddress=point(cabinX+2.4,cabinZ+4.4,.86);
    const newAddress=point(cabinX-3.4,cabinZ+5.9,.86);
    const key='bellwether-mail-v2';
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
    let delivered=Boolean(saved.delivered);
    let forwarded=Boolean(saved.forwarded);
    let packed=['letter','parcel'].includes(saved.packed)?saved.packed:'';
    let complete=bag.records.has('cals-letter');
    const persist=()=>{
      try{localStorage.setItem(key,JSON.stringify({delivered,forwarded,packed}));}catch{}
      if(packed)bag.record('mail','Post office cargo',packed==='letter'?'Letter for Vale House.':'Parcel for the camp caretaker.','Cargo');
      else bag.forget('mail');
    };
    const station=(p,name,action)=>{
      const prop=pipeline.prepare(models.receiver,{position:p.toArray(),scale:.48});
      mechanics.scenes[0].add(prop);
      const c=mechanics.world.createCollider(R.ColliderDesc.ball(.32).setTranslation(...p.toArray())
        .setSensor(true).setCollisionGroups((128<<16)|2));
      mechanics.tag(c,{name,action});
    };
    const pack=(item)=>{
      if(complete)return 'Last Delivery is complete.';
      if(item==='letter'&&delivered)return 'Vale House already received its letter.';
      if(packed===item)return 'That item is already in your cargo slot.';
      packed=item;persist();
      return item==='letter'?'Packed the letter for Vale House. The bag has one mail slot.':
        'Packed the camp parcel. The address says Foxglove Camp, main cabin.';
    };
    station(start,'Pack Vale House letter',()=>pack('letter'));
    station(start.clone().add(new T.Vector3(1.05,0,0)),'Pack camp parcel',()=>pack('parcel'));
    station(valeDoor,'Deliver Vale House letter',()=>{
      if(delivered)return 'The Vale House letter has been delivered.';
      if(packed!=='letter')return 'Pick up the Vale House letter at the post office.';
      delivered=true;packed='';persist();
      return 'Letter delivered. A note on the porch says the camp caretaker moved to the west bunkhouse.';
    });
    station(oldAddress,'Read the forwarding slip',()=>{
      if(complete)return 'The caretaker has already received the parcel.';
      forwarded=true;persist();
      return 'Forwarding slip: the caretaker moved to the west bunkhouse. Follow the path around the cabin.';
    });
    station(newAddress,'Deliver to the caretaker',()=>{
      if(complete)return 'The caretaker thanks you for delivering the mail.';
      if(!forwarded)return 'Check the forwarding slip at the main cabin so you can verify the recipient.';
      if(!delivered)return 'Finish the Vale House letter first so the caretaker can sign off on the route.';
      if(packed!=='parcel')return 'Bring the camp parcel from the post office.';
      complete=true;packed='';persist();
      bag.record('cals-letter','Cal’s undelivered letter','Postmarked a day after the date on the sheriff’s rescue report.');
      return 'Last Delivery complete. The caretaker gives you Cal’s undelivered letter.';
    });
  }
}
