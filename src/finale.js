import {person} from './rescue.js';
import {openTape} from './tape.js';
import {evidenceFrame} from './footage.js';
import * as T from 'three';
import R from 'rapier';
import {height,cabinX,cabinZ,plots,trailX} from './terrain.js';

const point=(x,z,y)=>new T.Vector3(x,height(x,z)+y,z);
const key='bellwether-finale-v1';
function chooseAtStation(title, prompt, choices, onChoice, initialFrame){
  const dialog=document.createElement('dialog');
  dialog.id='field-work';
  const heading=document.createElement('h2');
  heading.textContent=title;
  const instructions=document.createElement('p');
  instructions.textContent=prompt;
  const feedback=document.createElement('p');
  feedback.setAttribute('role','status');
  dialog.append(heading,instructions);
  const footage=document.createElement('canvas');
  footage.className='field-footage';
  footage.hidden=!initialFrame;
  function showFrame(kind,frame){
    footage.hidden=false;
    footage.setAttribute('aria-label',kind==='reel'?'Film frame '+(frame+1):'Field camera sequence, frame '+(frame+1));
    evidenceFrame(footage,kind,frame);
  }
  if(initialFrame)showFrame(...initialFrame);
  let playback;
  dialog.append(footage);
  for(const [label,value] of choices){
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.onclick=()=>{
      const result=onChoice(value);
      feedback.textContent=result.message;
      if(result.frame)showFrame(...result.frame);
      if(result.recording){
        clearInterval(playback);
        let frame=0;
        showFrame(result.recording,frame);
        playback=setInterval(()=>showFrame(result.recording,++frame%3),620);
      }
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
  dialog.onclose=()=>{clearInterval(playback);dialog.remove();};
  document.body.append(dialog);
  if(document.pointerLockElement)document.exitPointerLock();
  dialog.showModal();
}

const reelFrames=[
  'A grainy title card. The date is stamped in the corner.',
  'One bell, then the camp emblem. The sprocket marks run straight.',
  'White streaks and torn sprocket holes. The bell repeats twice.',
  'A second bell. The west-bank marker comes into focus.',
  'A flash of clear leader and a backwards frame counter.',
  'The sheriff shuts the west-bank gate. The date stamp is still visible.'
];
const damagedFrames=new Set([2,4]);

export class ReelEdit {
  frame=0;
  cuts=[];
  step(direction){
    this.frame=(this.frame+direction+reelFrames.length)%reelFrames.length;
    return this.preview();
  }
  preview(){
    return 'Frame '+(this.frame+1)+' / '+reelFrames.length+' · '+reelFrames[this.frame]+
      (this.cuts.includes(this.frame)?' Marked for removal.':'');
  }
  cut(){
    if(this.cuts.includes(this.frame))return 'That frame is already marked. Undo the last cut to restore it.';
    this.cuts.push(this.frame);
    return this.preview();
  }
  undo(){
    const frame=this.cuts.pop();
    if(frame===undefined)return 'There are no cuts to undo.';
    this.frame=frame;
    return this.preview();
  }
  review(){
    if(this.cuts.some(frame=>!damagedFrames.has(frame)))return 'Playback jumps over intact footage. Undo until the missing picture is restored.';
    if(this.cuts.length!==damagedFrames.size)return 'Playback still catches on damaged film. Scrub for torn sprocket holes or the reversed counter.';
    return '';
  }
}

export class BaitWatch {
  baited=false;
  tracked=false;
  angle='';
  elapsed=0;
  sighting='';
  tick(dt){
    if(!this.baited||!this.angle||this.sighting)return;
    this.elapsed+=dt;
    if(this.elapsed>=(this.angle==='bank'?12:6))this.sighting=this.angle==='bank'?'echo':'thief';
  }
  aim(angle){
    if(!this.tracked)return false;
    this.angle=angle;this.elapsed=0;this.sighting='';
    return true;
  }
}

// Fit the authored mesh to the tabletop, including models whose origin is above or below their base.
function stationProp(pipeline,source,position,scale){
  const prop=pipeline.prepare(source,{position:position.toArray(),scale});
  const bounds=new T.Box3().setFromObject(prop);
  const ground=height(position.x,position.z);
  const top=ground+.64;
  if(!bounds.isEmpty())prop.position.y+=top-bounds.min.y;
  const table=new T.Group();
  table.position.set(position.x,ground,position.z);
  const wood=new T.MeshStandardMaterial({color:0x674932,roughness:.92});
  const board=new T.Mesh(new T.BoxGeometry(.8,.08,.56),wood);
  board.position.y=.60;table.add(board);
  for(const x of [-.31,.31])for(const z of [-.21,.21]){
    const base=height(position.x+x,position.z+z)-ground;
    const leg=new T.Mesh(new T.BoxGeometry(.08,Math.max(.1,.56-base),.08),wood);
    leg.position.set(x,(.56+base)/2,z);table.add(leg);
  }
  // Keep the supported prop independently rotatable at camera stations.
  return {prop,table};
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
      const voice=this.compareBankVoice();
      if(voice)return voice;
      if(this.crateJammed())return '“A crate is blocking the grate. Hook it from the bank and clear the current before you cross.”';
      if(this.stage===1)return '“The ford’s clear. Get into the intake while the pressure’s down. I’ll watch the gauges.”';
      return '';
    };
    this.positions=[point(-7.2,-7.5,.84),point(-9,-7,.84),point(-10.8,-6.6,.84)];
    this.intake=point(-12.6,-6.9,.9);
    this.lookout=point(cabinX+6,cabinZ+5,1.1);
    this.scene=mechanics.scenes[0];
    this.installRunawayCrate(notice);
    this.installWrongBankVoice(notice);
    this.installPatrolTruck(notice);
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
        return (this.flood>.24?'The ford is flooding. Correct the gates or take the bank. ':'')+'Gates '+this.gates.join(' / ')+' · balance the intake. Target: 2 / 0 / 1.';
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
    this.supportedModel(this.lookout,pipeline,models.receiver,1.22);
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
    this.supportedModel(bulletin,pipeline,models.receiver,.55);
    this.station(bulletin,'Check the post office radio',()=>{
      const echoEnding=this.echoEnding?.();
      if(bag.records.has('extraction-return')&&echoEnding){
        return echoEnding==='seal'?
          'Post office relay: The returned man is safe at camp. The second radio has fallen silent.' :
          'Post office relay: The returned man is marking the next crossing. A second voice is still on the open channel.';
      }
      if(this.choice==='public')return 'The postmaster cuts into the broadcast. “I logged Cal’s parcel the morning after the rescue. If the sheriff wants that ledger, he can ask me in front of everyone.”';
      if(this.choice==='private')return 'The public channel is quiet. On the ranger’s frequency: “I have Cal’s tape locked up. Meet me at dawn, before the sheriff starts his rounds.”';
      if(this.stage>0)return 'Post office advisory: the ford has reopened. Keep clear of the intake while the ranger checks the gate seals.';
      return this.flood>.24?'Post office advisory: ford closed. Use the high bank path.':'Post office advisory: crews are working at the spillway.';
    });
    const supply=plots[1];
    this.installBaitWatch(supply,pipeline,models);
    this.installTownRounds(supply);
    const reelBench=point(supply.x-4.3,supply.z+2.7,.95);
    this.supportedModel(reelBench,pipeline,models.receiver,.62);
    const edit=new ReelEdit();
    this.station(reelBench,'Restore the damaged reel',()=>{
      if(bag.records.has('restored-reel'))return 'The restored reel is in your backpack. The last intact frame shows the sheriff closing the west-bank gate.';
      chooseAtStation('The Wrong Reel',
        'Scrub the reel. Mark damaged frames, preserve the intact footage, then review the splice. '+edit.preview(),
        [['Previous frame','back'],['Next frame','forward'],['Mark frame for removal','cut'],['Undo last cut','undo'],['Review splice','review']],
        action=>{
          if(action==='back'||action==='forward')return {message:edit.step(action==='back'?-1:1),frame:['reel',edit.frame]};
          if(action==='cut')return {message:edit.cut()};
          if(action==='undo')return {message:edit.undo(),frame:['reel',edit.frame]};
          const problem=edit.review();
          if(problem)return {message:problem};
          bag.record('restored-reel','Restored west-bank reel','The final intact frame shows the sheriff shutting the west-bank gate. The date stamp survived the splice.');
          return {done:true,frame:['reel',5],message:'Splice holds. The final frame shows the sheriff at the west-bank gate. The reel is in your backpack.'};
        },['reel',edit.frame]);
      return '';
    });
    const evidenceDesk=point(this.lookout.x+3.2,this.lookout.z+1.1,.95);
    this.supportedModel(evidenceDesk,pipeline,models.receiver,.55);
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
  installPatrolTruck(notice){
    const road=point(trailX(18)-2.7,18,.58);
    const ridge=point(trailX(20)+3.6,20,.95);
    const truck=this.mechanics.car.visual.clone(true);
    truck.position.copy(road);truck.rotation.y=.36;truck.visible=false;
    this.scene.add(truck);
    let phase='waiting',elapsed=0,away=0,last='',rocks=0;
    const record=(id,name,description)=>this.bag.record(id,name,description);
    const station=(p,name,action)=>{
      const sensor=this.mechanics.world.createCollider(R.ColliderDesc.ball(.55)
        .setTranslation(...p.toArray()).setSensor(true).setCollisionGroups((128<<16)|2));
      this.mechanics.tag(sensor,{name,action});
      sensor.setEnabled(false);
      return sensor;
    };
    const close=()=>{
      phase='closed';truck.visible=false;cab.setEnabled(false);path.setEnabled(false);
    };
    const cab=station(road.clone().add(new T.Vector3(1,0,.6)),'Help with the stalled patrol truck',()=>{
      chooseAtStation('Stalled patrol truck','A rear wheel is caught in a rut. Alternate forward and reverse to build momentum, or listen to the radio.',
        [['Rock forward','forward'],['Rock backward','reverse'],['Listen to the radio','radio']],
        action=>{
          if(phase!=='active')return {done:true,message:'The patrol truck has left.'};
          if(action==='radio'){
            record('patrol-radio','Patrol radio log','Dispatch reports a vehicle waiting on the ridge and tells the sheriff to keep the lookout road clear.');
            return {message:'“Unit Three, ridge turnout. Keep the lookout road clear.”'};
          }
          rocks=action===last?1:rocks+1;
          last=action;
          truck.rotation.z=(action==='forward'?1:-1)*Math.min(.12,rocks*.024);
          if(rocks<5)return {message:'Rocking momentum '+rocks+' / 5. '+(action==='forward'?'Reverse next.':'Go forward next.')};
          record('patrol-truck','Patrol truck recovered','You rocked the sheriff’s truck out of the rut.');
          close();
          return {done:true,message:'The tire catches. The sheriff pulls away and clears the road.'};
        });
      return '';
    });
    const path=station(ridge,'Check the patrol truck ridge detour',()=>{
      record('patrol-detour','Ridge turnout','A marked turnout bypasses the stalled patrol truck.');
      return 'The ridge turnout rejoins the road farther uphill. You can leave the sheriff to recover the truck.';
    });
    this.updateTruck=dt=>{
      if(phase==='closed'||this.rescue.story.area!==0||this.rescue.stage<2)return;
      if(this.bag.records.has('patrol-truck')||this.bag.records.has('patrol-tow'))return;
      elapsed+=dt;
      const distance=this.mechanics.walker.current.distanceToSquared(road);
      if(phase==='waiting'){
        if(elapsed<35||distance>100)return;
        phase='active';truck.visible=true;cab.setEnabled(true);path.setEnabled(true);
        notice('A patrol truck is stuck. Help rock it free or look for the ridge turnout.');
        return;
      }
      away=distance>225?away+dt:0;
      if(away<45)return;
      record('patrol-tow','Patrol tow report','Dispatch sent a tow crew after the truck was left in the rut.');
      close();
    };
  }
  installWrongBankVoice(notice){
    const bend=point(4.9,2.8,1.05);
    const source=point(7.9,-1.1,1.05);
    const line='Come east. Leave the rope.';
    let phase='waiting',remaining=0,cooldown=0;
    const setup=(where,name,action)=>{
      const sensor=this.mechanics.world.createCollider(R.ColliderDesc.ball(.58)
        .setTranslation(...where.toArray()).setSensor(true).setCollisionGroups((128<<16)|2));
      this.mechanics.tag(sensor,{name,action});
      sensor.setEnabled(false);
      return sensor;
    };
    const record=(id,name,description)=>this.bag.record(id,name,description);
    const call=setup(bend,'Listen for the wrong-bank voice',()=>{
      if(phase!=='calling')return '';
      if(typeof SpeechSynthesisUtterance==='function'&&globalThis.speechSynthesis){
        const utterance=new SpeechSynthesisUtterance(line);
        utterance.rate=.78;utterance.pitch=.64;
        globalThis.speechSynthesis.speak(utterance);
      }
      record('bank-voice-sample','Wrong-bank voice field log','An imitation of the ranger called from the east bank: “Come east. Leave the rope.”');
      call.setEnabled(false);origin.setEnabled(true);phase='tracing';remaining=35;
      return 'Field log saved. Follow the voice toward the east bend or check with the ranger.';
    });
    const origin=setup(source,'Trace the voice to the bend',()=>{
      if(phase!=='tracing')return '';
      origin.setEnabled(false);phase='resolved';
      record('bank-voice-origin','Empty east bank','The voice came from the bend, but the wet bank showed no footprints.');
      return 'The voice cuts off. Nobody is here. Ask the ranger to compare your field log.';
    });
    this.compareBankVoice=()=>{
      const compared=this.bag.records.has('bank-voice-compared');
      if(compared||(!this.bag.records.has('bank-voice-sample')&&phase!=='calling'))return '';
      if(phase==='calling'){
        call.setEnabled(false);phase='resolved';
        record('bank-voice-checked','Ranger’s alibi','The ranger stayed on his rounds. The voice on the east bank was someone or something else.');
        return '“That wasn’t me. If you hear my voice ask you to leave the rope, stay where you are.”';
      }
      origin.setEnabled(false);phase='resolved';
      record('bank-voice-compared','Wrong-bank voice comparison','The voice used the ranger’s cadence but gave the opposite of his rescue instruction.');
      return '“That sounds like me, but I’d never tell you to leave the rope. Someone wanted you on the wrong bank.”';
    };
    this.updateBankVoice=dt=>{
      if(phase==='resolved'||this.rescue.story.area!==0||this.rescue.stage<2)return;
      if(phase==='waiting'){
        if(this.bag.records.has('bank-voice-compared')||this.bag.records.has('bank-voice-checked')||
           this.bag.records.has('bank-voice-origin'))return;
        cooldown=Math.max(0,cooldown-dt);
        if(cooldown>0||this.mechanics.walker.current.distanceToSquared(bend)>64)return;
        phase='calling';remaining=28;call.setEnabled(true);
        notice('A voice from the east bend sounds like the ranger. “Come east. Leave the rope.”');
        return;
      }
      remaining-=dt;
      if(remaining>0)return;
      call.setEnabled(false);origin.setEnabled(false);
      if(phase==='tracing'){phase='resolved';return;}
      phase='waiting';cooldown=90;
      notice('The voice fades downriver.');
    };
  }
  installTownRounds(supply){
    const sheriff=person(0x464b39),projectionist=person(0x703f38);
    const reel=new T.Mesh(new T.CylinderGeometry(.13,.13,.055,24),
      new T.MeshStandardMaterial({color:0x9b9b89,metalness:.48,roughness:.4}));
    reel.rotation.z=Math.PI/2;reel.position.set(0,-.34,.11);projectionist.arms[0].add(reel);
    const patrol=[point(4,20,0),point(3,10,0),point(2,5,0)];
    const lookout=this.lookout.clone().add(new T.Vector3(-2.9,0,1.4));
    const movie=[point(supply.x-4.4,supply.z+2.7,0),point(supply.x-5,supply.z+5.4,0)];
    const lantern=new T.PointLight(0xffa75d,0,6,2);
    lantern.position.copy(movie[1]).y+=1.2;this.scene.add(lantern);
    const setup=(actor,name,action)=>{
      this.scene.add(actor.root);
      const sensor=this.mechanics.world.createCollider(R.ColliderDesc.ball(.43)
        .setSensor(true).setCollisionGroups((128<<16)|2));
      this.mechanics.tag(sensor,{name,action});
      return sensor;
    };
    let sheriffArrived=false,showReady=false;
    const law=setup(sheriff,'Speak to the sheriff',()=>{
      if(this.flood>.24)return '“I’ve closed the ford. If you need the far bank, take the ridge path until the intake drains.”';
      if(!sheriffArrived&&this.stage>0)return '“The ford’s open again. I’ll check the turnout for anyone who got stranded.”';
      if(!sheriffArrived)return this.stage>=3?'“I’m heading to the lookout. We need to talk about that tape.”':'“Keep the creek crossing clear. I’m on patrol.”';
      if(this.choice==='public')return '“The whole town heard it. Bring the ledger to my office tomorrow. I’ll explain why I changed the report.”';
      if(this.choice==='private')return '“The ranger has your copy. Tell him to check the back page of the log before he calls me.”';
      return '“Yes, I changed the report. The voice on dispatch sounded like Cal, and Cal was standing right beside me.”';
    });
    const film=setup(projectionist,'Speak to the projectionist',()=>{
      if(this.bag.records.has('restored-reel')&&this.bag.records.has('timeline-conflict')){
        this.bag.record('projectionist-timecode','Projectionist’s timecode',
          'The west-bank frame retains its original date stamp. It matches the postmark, one day after the official rescue date.');
        return '“Look at the date in the corner. It matches Cal’s postmark. This reel can back up the letter.”';
      }
      if(this.choice==='public')return '“People are coming to movie night to see the west-bank footage for themselves.”';
      if(this.choice==='private')return '“I’ll keep the original reel in its can until the ranger comes by.”';
      if(this.bag.records.has('restored-reel'))return '“That gate footage was spliced into a family reel. Whoever hid it expected nobody to check the last frame.”';
      return showReady?'“The reel is threaded and the lamp is warm. Movie night is ready.”':'“I’m carrying the reels out from the repair bench. Come back when the lamp is on.”';
    });
    const place=(actor,sensor,from,to,progress,walking,time)=>{
      actor.root.position.lerpVectors(from,to,progress);
      const {x,z}=actor.root.position;
      actor.root.position.y=height(x,z);
      actor.root.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
      actor.legs.forEach((leg,i)=>{leg.rotation.x=walking?Math.sin(time*7+i*Math.PI)*.29:0;});
      actor.arms.forEach((arm,i)=>{arm.rotation.x=walking?Math.sin(time*7+i*Math.PI)*.27:-.12;});
      sensor.setTranslation({x,y:actor.root.position.y+1.04,z});
    };
    let time=0,departure=null,travel=0;
    this.updateTown=dt=>{
      time+=dt;
      const cycle=time%24,leg=Math.floor(cycle/8),step=(cycle%8)/8;
      if(this.stage>=3){
        departure??=sheriff.root.position.clone();
        travel=Math.min(1,travel+dt/26);
        place(sheriff,law,departure,lookout,travel,travel<1,time);
        sheriffArrived=travel===1;
      }else place(sheriff,law,patrol[leg],patrol[(leg+1)%patrol.length],step,true,time);
      const filmTime=time%26;
      showReady=filmTime>=9&&filmTime<21;
      const returning=filmTime>=21;
      place(projectionist,film,returning?movie[1]:movie[0],returning?movie[0]:movie[1],
        returning?(filmTime-21)/5:Math.min(1,filmTime/9),!showReady,time);
      projectionist.arms[0].rotation.x=-1.05;
      reel.visible=!showReady;
      lantern.intensity=showReady?4.2:0;
    };
    this.updateTown(0);
  }
  installRunawayCrate(notice){
    const start=point(5.7,-.8,.52);
    const grate=point(-5.9,-5.1,.52);
    const position=start.clone();
    const world=this.mechanics.world;
    const collider=world.createCollider(R.ColliderDesc.ball(.43).setTranslation(...start.toArray())
      .setSensor(true).setCollisionGroups((128<<16)|2));
    // Reuse the detailed wooden crate mesh without keeping its dynamic body.
    const sample=this.mechanics.crate(start.toArray());
    const visual=sample.visual.clone(true);
    const owned=new Map();
    visual.traverse(node=>{
      if(!node.isMesh)return;
      node.geometry=node.geometry.clone();
      if(!owned.has(node.material))owned.set(node.material,node.material.clone());
      node.material=owned.get(node.material);
    });
    this.mechanics.remove(sample);
    this.scene.add(visual);
    visual.visible=false;
    let phase='waiting',elapsed=0,cooldown=8;
    const recover=hook=>{
      if(phase!=='moving'&&phase!=='jammed')return '';
      const wasJammed=phase==='jammed';
      if(wasJammed&&!hook)return 'The current pins the crate against the grate. Aim the hook at it from the bank.';
      phase='recovered';visual.visible=false;collider.setEnabled(false);
      this.bag.record('runaway-crate','Recovered supply crate','The ranger logged the crate as recovered. Its shipping stencil matches Bellwether Supply.','Cargo');
      return wasJammed?'You pull the crate off the grate. The current eases.':'You recover the crate before it reaches the grate.';
    };
    this.mechanics.tag(collider,{name:'Catch the runaway crate',action:()=>recover(false),onGrapple:()=>recover(true)});
    collider.setEnabled(false);
    this.updateCrate=dt=>{
      if(phase==='recovered'||this.bag.records.has('runaway-crate'))return;
      const player=this.mechanics.walker.current;
      if(phase==='waiting'){
        if(this.rescue.stage<2||this.rescue.story.area!==0)return;
        cooldown-=dt;
        if(cooldown>0||player.distanceToSquared(start)>81)return;
        phase='moving';visual.visible=true;collider.setEnabled(true);
        notice('A supply crate breaks loose in the creek. Chase it down or catch it with the hook.');
      }
      if(phase==='moving'){
        elapsed=Math.min(1,elapsed+dt/10);
        position.lerpVectors(start,grate,elapsed);
        position.y=height(position.x,position.z)+.52+Math.sin(elapsed*24)*.09;
        visual.position.copy(position);
        visual.rotation.set(.12*Math.sin(elapsed*18),elapsed*3,.09);
        collider.setTranslation(position);
        if(elapsed>=1){
          phase='jammed';
          if(this.rescue.story.area===0)notice('The crate jams the grate. The creek current picks up.');
        }
      }
      if(phase==='jammed'){
        this.mechanics.creekFlow+=.65;
      }
    };
    this.crateJammed=()=>phase==='jammed';
    this.rescue.grateDetour=()=>this.crateJammed()?point(grate.x+2.2,grate.z-2.8,0):null;
  }
  installBaitWatch(supply,pipeline,models){
    const watch=this.baitWatch=new BaitWatch();
    const crate=point(supply.x+2,supply.z+4,.65);
    const tracks=point(supply.x+3.7,supply.z+2.7,.35);
    const stand=point(supply.x+1,supply.z+1.3,1.03);
    this.model(crate,pipeline,models.lantern,.5);
    const camera=this.supportedModel(stand,pipeline,models.receiver,.48);
    const prints=new T.Group();
    prints.position.copy(tracks);
    const dirt=new T.MeshStandardMaterial({color:0x3b3024,roughness:1});
    const pad=new T.CircleGeometry(.068,12);
    for(let i=0;i<5;i++){
      const x=i%2?.11:-.11,z=(i-2)*.23;
      for(const [dx,dz,scale] of [[0,0,1],[-.045,-.078,.42],[0,-.095,.48],[.045,-.078,.42]]){
        const mark=new T.Mesh(pad,dirt);
        mark.rotation.x=-Math.PI/2;
        mark.position.set(x+dx,height(tracks.x+x+dx,tracks.z+z+dz)-tracks.y+.025,z+dz);
        mark.scale.setScalar(scale);prints.add(mark);
      }
    }
    prints.visible=false;this.scene.add(prints);
    const done=()=>this.bag.records.has('bait-echo');
    const visit=(p,name,action)=>{
      const c=this.mechanics.world.createCollider(R.ColliderDesc.ball(.38).setTranslation(...p.toArray())
        .setSensor(true).setCollisionGroups((128<<16)|2));
      this.mechanics.tag(c,{name,action});
    };
    visit(crate,'Set bait behind Bellwether Supply',()=>{
      if(done())return 'The Echo left the bait untouched.';
      if(watch.baited)return 'The bait is set. Look for prints along the side of the building.';
      watch.baited=true;prints.visible=true;
      return 'Bait set. Check the prints beside the store before you aim the field camera.';
    });
    visit(tracks,'Inspect tracks behind the store',()=>{
      if(!watch.baited)return 'Set bait at the lantern marker first.';
      watch.tracked=true;
      return 'Small pawprints lead to the crate. A second trail begins halfway down the creek bank and has no return prints.';
    });
    visit(stand,'Aim or review the bait camera',()=>{
      if(done())return 'The Echo recording is filed in your backpack.';
      if(!watch.tracked)return 'Inspect the tracks by the store to pick a camera angle.';
      chooseAtStation('Night at the Bait Shop',
        'The crate gives you a close shot of the bait. The creek bank is farther out, where the second trail begins.',
        [['Aim at the bait crate','crate'],['Aim at the creek bank','bank'],['Review recording','review']],
        action=>{
          if(action!=='review'){
            if(watch.angle!==action)watch.aim(action);
            camera.rotation.y=action==='bank'?Math.PI:.65;
            return {message:'Camera aimed. '+(action==='bank'?'Give it twelve seconds.':'Give it six seconds.')};
          }
          if(!watch.angle)return {message:'Choose a camera angle first.'};
          if(!watch.sighting)return {message:'Still recording. Check again in '+Math.max(1,Math.ceil((watch.angle==='bank'?12:6)-watch.elapsed))+' seconds.'};
          if(watch.sighting==='thief'){
            this.bag.record('bait-thief','Bait thief recording','A raccoon lifted the bait and left the pawprints behind Bellwether Supply.');
            return {recording:'thief',message:'A raccoon raids the crate. You can keep the recording and aim at the creek to investigate the second trail.'};
          }
          this.bag.record('bait-echo','Creek bank Echo recording','A figure appears at the end of the trackway. In the next frame it is gone, with no return prints.');
          return {done:true,recording:'echo',message:'A figure flickers into view at the creek and disappears. The recording is filed in your backpack.'};
        });
      return '';
    });
  }
  supportedModel(point,pipeline,source,scale){
    const {prop,table}=stationProp(pipeline,source,point,scale);
    this.scene.add(prop,table);
    return prop;
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
    this.baitWatch.tick(dt);
    this.updateTown(dt);
    this.updateBankVoice(dt);
    this.updateTruck(dt);
    this.water.uniforms.current.value+=dt*this.mechanics.creekFlow;
    if(this.rescue.stage!==4){this.mechanics.creekFlow=.76;this.updateCrate(dt);return;}
    this.boom.rotation.y=T.MathUtils.lerp(this.boom.rotation.y,this.boomAligned||this.stage>0?-.16:.95,1-Math.exp(-dt*3));
    const draining=this.stage>0||this.gates.filter(n=>n===2).length<2;
    if(draining)this.flood=Math.max(0,this.flood-dt*(this.pulleyRigged?.38:.16));
    this.water.uniforms.flood.value=this.flood;
    if(this.stage>0){this.mechanics.creekFlow=.55;this.updateCrate(dt);return;}
    const balanced=this.boomAligned&&this.gates.join('')==='201';
    this.pressure=T.MathUtils.lerp(this.pressure,balanced?.12:.84,1-Math.exp(-dt*1.2));
    this.mechanics.creekFlow=.35+this.pressure*1.65;
    this.hold=balanced?this.hold+dt:0;
    if(this.hold>=3)this.advance(1);
    this.updateCrate(dt);
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
      const detour=this.flood>.24?'Ford closed · use the high bank · ':'';
      return {text:detour+'Balance intake gates 2 / 0 / 1 · '+this.gates.join(' / ')+' · pressure '+Math.round(this.pressure*100)+'%',target:this.positions[index]??this.intake};
    }
    if(this.stage===1)return {text:'Search the drained intake chamber',target:this.intake};
    if(this.stage===2)return {text:'Align the dispatch tape with the siren and winch',target:this.lookout};
    return {text:'Broadcast the evidence or give the tape to the ranger privately',target:this.lookout};
  }
}

export class MailRoute {
  constructor(mechanics,bag,pipeline,models,finale){
    const post=plots[2],vale=plots[0];
    const start=point(post.x+3.8,post.z,1.1);
    const valeDoor=point(vale.x-3.6,vale.z+1.6,.82);
    const oldAddress=point(cabinX+2.4,cabinZ+4.4,.86);
    const newAddress=point(cabinX-3.4,cabinZ+5.9,.86);
    const floodDrop=point(11.5,8.3,.92);
    const flooded=()=>finale.flood>.24;
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
      const {prop,table}=stationProp(pipeline,models.receiver,p,.48);
      mechanics.scenes[0].add(prop,table);
      const c=mechanics.world.createCollider(R.ColliderDesc.ball(.32).setTranslation(...p.toArray())
        .setSensor(true).setCollisionGroups((128<<16)|2));
      mechanics.tag(c,{name,action});
    };
    const worker=person(0x36576a);
    mechanics.scenes[0].add(worker.root);
    const satchel=new T.Mesh(new T.BoxGeometry(.19,.23,.11),
      new T.MeshStandardMaterial({color:0x674530,roughness:.9}));
    satchel.position.set(.24,.94,-.08);
    worker.root.add(satchel);
    const stops=[
      [point(start.x+.1,start.z-1.5),'sorting outgoing mail',5],
      [point(start.x+2,start.z-1.5),'loading the satchel',4],
      [point(start.x+2,start.z-3.1),'checking the creek advisory',5]
    ];
    const sensor=mechanics.world.createCollider(R.ColliderDesc.ball(.43)
      .setSensor(true).setCollisionGroups((128<<16)|2));
    let activity=stops[0][1];
    mechanics.tag(sensor,{name:'Speak to the postmaster',action:()=>{
      if(flooded())return '“The ford is closed. Bring the camp parcel to the emergency mail drop south of the creek, beside the supply store.”';
      if(bag.records.has('timeline-conflict'))return '“I logged Cal’s parcel after the date in the report. The timestamp on my ledger matches your postmark.”';
      if(complete)return '“Both deliveries made it. Check the dispatch ledger if you still need a signed copy.”';
      return '“I’m '+activity+'. Outbound mail is sorted by address. Read the label before you load it.”';
    }});
    this.tick=time=>{
      let elapsed=time%26;
      for(const [i,[stop,label,wait]] of stops.entries()){
        if(elapsed>=wait+4){elapsed-=wait+4;continue;}
        const next=stops[(i+1)%stops.length][0];
        const progress=T.MathUtils.clamp((elapsed-wait)/4,0,1);
        worker.root.position.lerpVectors(stop,next,progress);
        const {x,z}=worker.root.position;
        worker.root.position.y=height(x,z);
        worker.root.rotation.y=Math.atan2(next.x-stop.x,next.z-stop.z);
        activity=progress>0?'making my rounds':label;
        satchel.visible=i!==0||progress>0;
        worker.legs.forEach((leg,index)=>{leg.rotation.x=progress>0?Math.sin(progress*23+index*Math.PI)*.28:0;});
        worker.arms.forEach((arm,index)=>{
          arm.rotation.x=progress>0?Math.sin(progress*23+index*Math.PI)*.24:-.78+Math.sin(elapsed*4+index)*.16;
        });
        sensor.setTranslation({x,y:worker.root.position.y+1.02,z});
        break;
      }
    };
    this.tick(0);
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
      if(!complete&&flooded())return 'Ford closed. Take the parcel to the emergency mail drop south of the creek beside the supply store.';
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
    const deliverParcel=rerouted=>{
      if(rerouted&&!flooded())return 'The ford is open. Deliver to the caretaker at the west bunkhouse.';
      if(!rerouted&&flooded())return 'The caretaker is collecting mail south of the creek until the ford drains. Use the emergency mail drop by the supply store.';
      if(complete)return 'The caretaker thanks you for delivering the mail.';
      if(!forwarded&&!rerouted)return 'Check the forwarding slip at the main cabin so you can verify the recipient.';
      if(!delivered)return 'Finish the Vale House letter first so the caretaker can sign off on the route.';
      if(packed!=='parcel')return 'Bring the camp parcel from the post office.';
      complete=true;packed='';persist();
      bag.record('cals-letter','Cal’s undelivered letter','Postmarked a day after the date on the sheriff’s rescue report.');
      return rerouted?'Flood route complete. Cal’s undelivered letter is waiting in the caretaker’s return pouch.':
        'Last Delivery complete. The caretaker gives you Cal’s undelivered letter.';
    };
    station(newAddress,'Deliver to the caretaker',()=>deliverParcel(false));
    station(floodDrop,'Check the emergency mail drop',()=>deliverParcel(true));
  }
}
