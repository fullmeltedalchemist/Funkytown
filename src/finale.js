import {openTape} from './tape.js';
import * as T from 'three';
import R from 'rapier';
import {height,cabinX,cabinZ,plots,trailX} from './terrain.js';

const point=(x,z,y)=>new T.Vector3(x,height(x,z)+y,z);
const key='bellwether-finale-v1';
function chooseAtStation(title, prompt, choices, onChoice){
  const dialog=document.createElement('dialog');
  dialog.id='field-work';
  const heading=document.createElement('h2');
  heading.textContent=title;
  const instructions=document.createElement('p');
  instructions.textContent=prompt;
  const feedback=document.createElement('p');
  feedback.setAttribute('role','status');
  dialog.append(heading,instructions);
  for(const [label,value] of choices){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.onclick=()=>{
      const result=onChoice(value);
      feedback.textContent=result.message;
      if(result.done)for(const option of dialog.querySelectorAll('button[data-choice]'))option.disabled=true;
    };
    button.dataset.choice='';
    dialog.append(button);
  }
  const close=document.createElement('button');
  close.type='button';
  close.textContent='Close';
  close.onclick=()=>dialog.close();
  dialog.append(feedback,close);
  dialog.onclose=()=>dialog.remove();
  document.body.append(dialog);
  if(document.pointerLockElement)document.exitPointerLock();
  dialog.showModal();
}

export class Finale {
  constructor(mechanics,rescue,bag,pipeline,models,water,notice){
    Object.assign(this,{mechanics,rescue,bag,water});
    this.stage=0;this.choice='';this.pulleyRigged=false;
    try{
      const save=JSON.parse(localStorage.getItem(key)||'{}');
      if(Number.isInteger(save.stage)&&save.stage>=0&&save.stage<=3)this.stage=save.stage;
      if(['public','private'].includes(save.choice))this.choice=save.choice;
      this.pulleyRigged=save.pulleyRigged===true&&bag.records.has('spare-pulley');
    }catch{}
    this.gates=[0,0,0];this.pressure=.85;this.hold=0;this.boomAligned=this.pulleyRigged;this.flood=0;
    rescue.spillwayReaction=()=>{
      if(this.choice==='public')return '“The postmaster backed your story on air. I’m taking her ledger to the lookout before the sheriff gets there.”';
      if(this.choice==='private')return '“I locked the tape in my cabin. At dawn, we’ll match the voices against my old dispatch log.”';
      if(this.flood>.24)return '“Stay off the ford. Take the high bank and reset the gates to two, zero, one.”';
      if(this.stage===1)return '“The ford’s clear. Get into the intake while the pressure’s down. I’ll watch the gauges.”';
      return '';
    };
    this.positions=[point(-7.2,-7.5,.84),point(-9,-7,.84),point(-10.8,-6.6,.84)];
    this.intake=point(-12.6,-6.9,.9);
    this.lookout=point(cabinX+6,cabinZ+5,1.1);
    this.scene=mechanics.scenes[0];
    this.boomPoint=point(-6.1,-6.8,.56);
    this.boom=new T.Group();
    this.boom.position.copy(this.boomPoint);
    this.boom.rotation.y=.95;
    const wood=new T.MeshStandardMaterial({color:0x795638,roughness:.91});
    for(const offset of [-.16,.16]){
      const log=new T.Mesh(new T.CylinderGeometry(.108,.125,2.25,12),wood);
      log.rotation.z=Math.PI/2;log.position.z=offset;this.boom.add(log);
    }
    const ring=new T.Mesh(new T.TorusGeometry(.16,.026,8,16),
      new T.MeshStandardMaterial({color:0xd8a662,metalness:.45}));
    ring.position.y=.24;this.boom.add(ring);this.scene.add(this.boom);
    const boomSensor=this.mechanics.world.createCollider(R.ColliderDesc.ball(.54)
      .setTranslation(this.boomPoint.x,this.boomPoint.y+.22,this.boomPoint.z)
      .setSensor(true).setCollisionGroups((128<<16)|2));
    this.mechanics.tag(boomSensor,{name:'Grapple the boom ring',action:()=> 'Aim the hook at the brass ring and grapple to swing the boom.',
      onGrapple:()=>{
        if(this.rescue.stage!==4)return 'Finish reconstructing the rescue first.';
        if(this.stage>0||this.boomAligned)return 'The boom is secured.';
        this.boomAligned=true;
        return 'You pull the boom into its catch. Set gates to 2 / 0 / 1.';
      }});
    const socket=point(this.boomPoint.x+.6,this.boomPoint.z+1.35,.92);
    const brace=new T.Mesh(new T.CylinderGeometry(.083,.119,.95,12),wood);
    brace.position.copy(socket).add(new T.Vector3(0,-.43,0));this.scene.add(brace);
    this.pulley=new T.Mesh(new T.TorusGeometry(.12,.032,8,18),
      new T.MeshStandardMaterial({color:0x9f865c,metalness:.55,roughness:.47}));
    this.pulley.position.copy(socket);
    this.pulley.visible=this.pulleyRigged;
    this.scene.add(this.pulley);
    this.station(socket,'Rig spare pulley',()=>{
      if(this.stage>0)return 'The intake is already drained.';
      if(!bag.records.has('spare-pulley'))return 'A spare pulley would fit here. Earn one on the practice rescue rig near the campfire.';
      if(this.pulleyRigged)return 'Your pulley is holding the boom steady.';
      this.pulleyRigged=true;
      this.pulley.visible=true;
      this.boomAligned=true;
      this.advance(0);
      return 'Pulley rigged. The boom is secured and the ford will drain faster once the gate settings are safe.';
    });
    for(const [i,p] of this.positions.entries()){
      const valve=this.model(p,pipeline,models.valve);
      this.station(p,'Adjust intake gate '+(i+1),()=>{
        if(this.stage>0)return 'The intake is already drained.';
        this.gates[i]=(this.gates[i]+1)%3;
        this.hold=0;
        if(this.gates.filter(n=>n===2).length>=2)this.flood=1;
        valve.rotation.z=this.gates[i]*Math.PI/3;
        return (this.flood>.5?'The ford is flooding. Correct the gates or take the bank. ':'')+'Gates '+this.gates.join(' / ')+' · balance the intake. Target: 2 / 0 / 1.';
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
    const post=plots[2];
    const bulletin=point(post.x+3.9,post.z-2.1,.95);
    this.bulletin=bulletin;
    this.model(bulletin,pipeline,models.receiver,.55);
    this.station(bulletin,'Check the post office radio',()=>{
      if(this.choice==='public')return 'The postmaster cuts into the broadcast. “I logged Cal’s parcel the morning after the rescue. If the sheriff wants that ledger, he can ask me in front of everyone.”';
      if(this.choice==='private')return 'The public channel is quiet. On the ranger’s frequency: “I have Cal’s tape locked up. Meet me at dawn, before the sheriff starts his rounds.”';
      if(this.stage>0)return 'Post office advisory: the ford has reopened. Keep clear of the intake while the ranger checks the gate seals.';
      return this.flood>.24?'Post office advisory: ford closed. Use the high bank path.':'Post office advisory: crews are working at the spillway.';
    });
    const evidenceDesk=point(this.lookout.x+3.2,this.lookout.z+1.1,.95);
    this.model(evidenceDesk,pipeline,models.receiver,.55);
    this.station(evidenceDesk,'Compare the rescue evidence',()=>{
      if(!bag.records.has('cals-letter')||!bag.records.has('dispatch-tape')){
        return 'Bring Cal’s undelivered letter from Last Delivery and the original tape from the spillway intake.';
      }
      chooseAtStation('Compare the rescue evidence',
        'The official report places the rescue on the previous day and ends the dispatch transcript before the tape stops. What can you establish from the originals?',
        [['The date and the cutoff both conflict','both'],['The tape proves who cut the rescue line','culprit'],['The postmark proves the exact time Cal wrote the letter','time']],
        answer=>{
          if(answer!=='both')return {message:'Look at what each source actually records. A postmark records when mail was processed, and the tape does not identify who cut the line.'};
          bag.record('timeline-conflict','The missing day','Cal’s letter was postmarked a day after the official rescue date. The original tape runs beyond the official transcript.');
          return {done:true,message:'Comparison saved in your backpack. The ranger can discuss the discrepancy at camp.'};
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
    try{localStorage.setItem(key,JSON.stringify({stage,choice:this.choice,pulleyRigged:this.pulleyRigged}));}catch{}
  }
  tick(dt){
    this.water.uniforms.current.value+=dt*this.mechanics.creekFlow;
    if(this.rescue.stage!==4)return;
    this.boom.rotation.y=T.MathUtils.lerp(this.boom.rotation.y,this.boomAligned||this.stage>0?-.16:.95,1-Math.exp(-dt*3));
    const draining=this.stage>0||this.gates.filter(n=>n===2).length<2;
    if(draining)this.flood=Math.max(0,this.flood-dt*(this.pulleyRigged?.38:.16));
    this.water.uniforms.flood.value=this.flood;
    if(this.stage>0){this.mechanics.creekFlow=.55;return;}
    const balanced=this.boomAligned&&this.gates.join('')==='201';
    this.pressure=T.MathUtils.lerp(this.pressure,balanced?.12:.84,1-Math.exp(-dt*1.2));
    this.mechanics.creekFlow=.35+this.pressure*1.65;
    this.hold=balanced?this.hold+dt:0;
    if(this.hold>=3)this.advance(1);
  }
  onFloodedFord(position){
    return this.flood>.24&&Math.abs(position.z+1)<4&&Math.abs(position.x-trailX(position.z))<2.6;
  }
  objective(){
    if(this.rescue.stage!==4||this.rescue.story.area!==0)return null;
    if(this.choice)return {text:'Chapter 1 complete · '+(this.choice==='public'?'the town heard the tape':'the ranger heard the tape privately')+' · check the post office radio',target:this.bulletin};
    if(this.stage===0){
      if(!this.boomAligned)return {text:'Grapple the brass ring to secure the spillway boom',target:this.boomPoint};
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
    if(complete&&packed){packed='';persist();}
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
    station(start,'Sort the outbound mail',()=>{
      if(complete)return 'Last Delivery is complete. Check the dispatch ledger to close the route.';
      const item=delivered?'parcel':'letter';
      chooseAtStation('Sort the outbound mail',
        delivered?'The label reads “Camp caretaker, Foxglove Camp.” Which route takes this parcel?':'The envelope reads “Vale House, Bellwether.” Which route takes this letter?',
        [['Town route · Vale House','letter'],['Camp route · Foxglove','parcel'],['Hold for an unreadable address','hold']],
        answer=>answer===item?{done:true,message:pack(item)}:{message:'That bin does not match the address. Read the label and try again.'});
      return '';
    });
    station(start.clone().add(new T.Vector3(1.05,0,0)),'Check the dispatch ledger',()=>{
      if(bag.records.has('mail-route-closed'))return 'The postmaster has signed off on your route.';
      if(!complete)return forwarded?'The ledger now lists the west bunkhouse. Deliver the parcel there before signing out.':'The ledger is open. Deliver the Vale House letter, then verify the caretaker’s address.';
      bag.record('mail-route-closed','Signed delivery ledger','The postmaster signed off on both deliveries and logged the caretaker’s new address.','Evidence');
      return 'Route closed. The postmaster hands you a signed copy of the ledger.';
    });
    station(valeDoor,'Deliver Vale House letter',()=>{
      if(delivered)return 'The Vale House letter has been delivered.';
      if(packed!=='letter')return 'Pick up the Vale House letter at the post office.';
      delivered=true;packed='';persist();
      return 'Letter delivered. A note on the porch says the camp caretaker moved to the west bunkhouse.';
    });
    const neighbor=point(vale.x-4.1,vale.z+3.3,.9);
    station(neighbor,'Read the neighbor’s delivery note',()=>{
      if(complete)return 'The neighbor has crossed the missing parcel off their list.';
      if(!delivered)return '“Postal carrier: please leave Vale’s letter on the porch before taking the camp parcel uphill.”';
      forwarded=true;persist();
      return '“I helped the caretaker move to the west bunkhouse. Take the path around the main cabin. The old porch is empty.”';
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
