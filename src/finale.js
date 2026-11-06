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
    this.bag=bag;this.index=0;this.active=false;
    try{
      const index=Number(localStorage.getItem('bellwether-mail-v1'));
      if(Number.isInteger(index)&&index>=0&&index<=2)this.index=index;
    }catch{}
    this.active=bag.records.has('mail')&&this.index<2;
    const post=plots[2],vale=plots[0];
    this.start=point(post.x+3.8,post.z,1.1);
    this.stops=[point(vale.x-3.6,vale.z+1.6,.82),point(cabinX+2.4,cabinZ+4.4,.86)];
    const scene=mechanics.scenes[0];
    const station=(p,name,action)=>{
      const prop=pipeline.prepare(models.receiver,{position:p.toArray(),scale:.48});scene.add(prop);
      const c=mechanics.world.createCollider(R.ColliderDesc.ball(.32).setTranslation(...p.toArray())
        .setSensor(true).setCollisionGroups((128<<16)|2));
      mechanics.tag(c,{name,action});
    };
    station(this.start,'Read the post office delivery slip',()=>{
      if(this.index===2)return 'Both deliveries are complete.';
      this.active=true;bag.record('mail','Post office parcels','Deliver to Vale House, then the ranger at camp.','Cargo');
      return 'Last Delivery: take the first parcel to Vale House. The second is marked Foxglove Camp.';
    });
    for(const [i,p] of this.stops.entries())station(p,'Check delivery address',()=>{
      if(!this.active||this.index!==i)return 'No parcel for this stop right now.';
      this.index++;
      try{localStorage.setItem('bellwether-mail-v1',String(this.index));}catch{}
      if(this.index===2){
        bag.forget('mail');
        bag.record('cals-letter','Cal’s undelivered letter','Postmarked a day after the date on the sheriff’s rescue report.');
        return 'Delivery complete. The ranger gives you Cal’s undelivered letter.';
      }
      return 'First parcel delivered. Take the second to Foxglove Camp.';
    });
  }
}
