import * as T from 'three';
import {cabinX,cabinZ} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const copy='crossing-family-copy',watch='crossing-far-bank-lamp';
const sketch='crossing-survivor-sketch',clock='crossing-clock-check';
const conclusion='crossing-identity-finding',pending='crossing-identity-pending';

export class CrossingAftermath {
  constructor(mechanics,bag,report,pipeline,models,play){
    Object.assign(this,{mechanics,bag,report,pipeline,models,play});
    const rack=new T.Vector3(141.4,0,7);
    const socket=new T.Vector3(146.6,0,2.9);
    const gear=station(mechanics,1,rack,'Check the far-bank gear rack',()=>this.restock(),{color:0x565b53});
    const post=station(mechanics,1,socket,'Inspect the far-bank lamp bracket',()=>this.inspectLamp(),{color:0x737051});
    this.install=mechanics.fixed.get(post.collider.handle);
    this.install.acceptName='Mount the far-bank check-in lamp';
    this.install.accept=item=>this.mount(item);
    this.rack=gear.point;
    this.socket=post.point;
    this.home=rack.clone().add(new T.Vector3(0,.96,0));
    this.fixedLamp=pipeline.prepare(models.lantern,{groundY:.945,scale:.83});
    const light=new T.PointLight(0xffcc82,4,5,2);
    light.position.y=.27;
    this.fixedLamp.add(light);
    this.fixedLamp.visible=this.has(watch);
    post.body.add(this.fixedLamp);
    this.table=station(mechanics,0,groundPoint(cabinX+2.7,cabinZ+6.35),
      'Review the porch tape with the ranger',()=>this.compare(),{color:0x566761}).point;
  }

  has(key){return this.bag.records.has(key);}
  get ending(){return this.report.chapters.ending;}
  filed(){return Boolean(this.ending)&&this.report.has('filed');}

  radio(){
    if(this.ending==='seal'){
      if(this.has(copy))return ' Cal’s family has their copy of the report.';
      if(!this.has('crossing-copy-in-bag')){
        this.bag.record('crossing-copy-in-bag','Family copy of the crossing report',
          'The postmaster put a copy in your Field Bag. Take it to Cal’s family at Foxglove.');
      }
      return ' The postmaster sets aside a family copy. Take it to Foxglove Camp.';
    }
    if(this.has(watch))return ' The far-bank check-in lamp is lit. The watch can verify both banks.';
    return ' Take the spare lamp from the gear rack just beyond the arch and mount it on the far-bank check-in bracket.';
  }

  family(){
    if(this.ending!=='seal'||!this.has('crossing-copy-in-bag'))return '';
    if(this.has(copy))return 'Cal’s sister has pinned the report inside her cupboard where Cricket can read it.';
    this.bag.record(copy,'The family’s copy',
      'Cal’s sister kept the witness accounts at home and asked the postmaster to preserve both versions of the evacuation.');
    return 'Cal’s sister folds the copy. “Put both accounts in the record. Cricket can decide what to make of them when she’s older.”';
  }

  restock(){
    const m=this.mechanics;
    if(this.ending!=='hold'||!this.filed())return 'The ranger will release this lamp once both accounts are filed.';
    if(this.has(watch))return 'The spare lamp is in service on the far bank.';
    if(this.lamp&&m.items.has(this.lamp.collider.handle)){
      if(m.carried===this.lamp)return 'Carry the lamp to the yellow check-in bracket.';
      m.resetProp(this.lamp,this.lampHome);
    }else{
      const source=this.pipeline.loose(this.models.lantern,.83);
      const bounds=new T.Box3().setFromObject(source.visual);
      const home=this.home.clone();
      home.y-=bounds.min.y;

      this.lampHome=home;
      this.lamp=m.dynamic({...source,position:home.toArray(),area:1,name:'Far-bank check-in lamp',impactLimit:Infinity});
    }
    return 'The ranger’s check-in lamp is on the rack. Carry it to the yellow bracket.';
  }

  inspectLamp(){
    return this.has(watch)?'The lamp is burning. Check the post office radio for the new watch report.':
      'The bracket is empty. Bring the check-in lamp from the gear rack by the arch.';
  }

  mount(item){
    if(!this.lamp||item!==this.lamp||!this.filed()||this.ending!=='hold')return 'This bracket takes the ranger’s check-in lamp.';
    this.mechanics.remove(item);
    this.lamp=null;
    this.fixedLamp.visible=true;
    this.bag.record(watch,'Both banks checked in','The far-bank lamp is lit. The ranger can now distinguish a visible check-in from a copied radio reply.');
    this.play(this.socket);
    return 'The lamp catches. The ranger calls back, “Far bank confirmed. We can keep a real watch now.”';
  }

  interview(){
    if(!this.filed()||!this.has('extraction-return'))return '';
    if(!this.has(sketch))this.bag.record(sketch,'The survivor’s crossing sketch',
      'The survivor drew the porch lamp and marked a broken board just inside the gate. The board does not appear in the family’s older map.');
    return 'He draws the porch. “The lamp lit the broken board. I had to step over it on the way back. Ask the ranger if that was on the tape.”';
  }

  inspectClock(){
    if(!this.has(sketch))return '';
    if(!this.has(clock))this.bag.record(clock,'Both kitchens stopped at nine',
      'The dry-house clock and the account from the flooded kitchen agree on nine. The resident remembered Mom’s private saying, so a matching memory alone cannot identify a person.');
    return 'The clock reads nine. The resident’s account shows the Echo can carry a memory. Take the sketch and clock observation to the ranger.';
  }

  compare(){
    if(!this.filed())return 'File both witness accounts at the post office radio first.';
    if(!this.has('extraction-return')){
      if(!this.has(pending))this.bag.record(pending,'Identity review pending',
        'The original porch recording establishes that someone was answering. With no survivor to interview, the ranger leaves the identity unresolved.');
      return '“The tape gives us a voice. Without someone here to draw the crossing, I can’t tell you who made it.”';
    }
    if(!this.has('moms-original'))return 'The ranger needs Mom’s original porch recording before comparing the sketch.';
    if(!this.has(sketch))return '“Ask him to draw his route before he hears Mom’s original tape.”';
    if(!this.has(clock))return '“Check the stopped clock again. The resident knew something she never heard in person.”';
    if(this.has(conclusion))return '“Keep his sketch and the tape together. The board puts him at the crossing. His memories still deserve to be heard on their own terms.”';
    this.play(this.table);
    this.bag.record(conclusion,'What the crossing sketch establishes',
      'Mom’s porch tape mentions the fresh break inside the gate. The survivor drew it before hearing the tape. That corroborates his account of crossing. The clock suggests that private memories can still be copied, so the ranger keeps the identity open.');
    return 'Mom’s tape crackles. “Mind the board just inside the gate. It split this morning.” The ranger lays down the sketch. “He drew that break before hearing the tape. We can put him there. The clock tells us to be careful about the rest.”';
  }

  objective(){
    if(!this.filed())return null;
    const {area}=this.mechanics;
    if(this.ending==='seal'&&area===0&&!this.has(copy)){
      return {text:'Epilogue · Deliver the report to Cal’s family',target:this.report.chapters.family};
    }
    if(this.ending==='hold'&&!this.has(watch)){
      if(area===0)return {text:'Epilogue · Cross the arch to collect the check-in lamp',target:this.report.chapters.story.gates[0]};
      const carrying=this.mechanics.carried===this.lamp&&Boolean(this.lamp);
      const loose=this.lamp&&this.mechanics.items.has(this.lamp.collider.handle);
      return {text:carrying?'Epilogue · Mount the far-bank check-in lamp':loose?
        'Epilogue · Pick up the check-in lamp or restock at the rack':'Epilogue · Take the spare lamp from the gear rack',
        target:carrying?this.socket:loose?this.lamp.visual.position:this.rack};
    }
    if(area===1&&this.ending==='hold'&&this.has(watch)){
      return {text:'Epilogue · Return through the arch to Foxglove',target:this.report.chapters.story.gates[1]};
    }
    if(area!==0)return null;
    if(!this.has('extraction-return'))return this.has(pending)?null:{text:'Epilogue · Ask the ranger what the tape establishes',target:this.table};
    if(!this.has(sketch))return {text:'Epilogue · Ask the survivor to sketch the crossing',target:this.survivorPoint};
    if(!this.has(clock))return {text:'Epilogue · Recheck the stopped clock at the dry house',target:this.report.address.clockPoint};
    return this.has(conclusion)?null:{text:'Epilogue · Compare the sketch and porch tape with the ranger',target:this.table};
  }
}
