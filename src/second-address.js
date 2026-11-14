import * as T from 'three';
import R from 'rapier';
import {part,vec} from './mechanics.js';
import {height,plots,secondAddress as lot,trailX} from './terrain.js';
import {groundPoint,station} from './field-stations.js';
import {person} from './rescue.js';

export class SurveyTrial {
  phase='idle';
  begin(){
    if(this.phase==='idle'){this.phase='control';return 'control';}
    if(this.phase==='control-ready'){this.phase='echo';return 'echo';}
    return '';
  }
  observe(offset){
    if(this.phase==='control'&&offset>.35){this.phase='control-ready';return 'control';}
    if(this.phase==='echo'&&offset<-.35){this.phase='proved';return 'echo';}
    return '';
  }
}

const getawayKey='second-address-getaway';
const leadKey='founders-depot';

export class SecondAddress {
  trial=new SurveyTrial();
  constructor(mechanics,pipeline,models,bag,notice,chapters){
    Object.assign(this,{mechanics,bag,notice});
    const scene=mechanics.scenes[0];
    const at=(x,y,z)=>new T.Vector3(lot.x+x,lot.y+y,lot.z+z);
    const house=pipeline.place(models.cabin,{position:at(0,0,0).toArray(),scale:1,collider:'authored'});
    house.traverse(node=>{
      if(!node.isMesh||!node.visible||!node.material.color)return;
      node.material=node.material.clone();
      node.material.color.multiply(new T.Color(0xaec6ad));
    });
    pipeline.place(models.pairedKitchen,{position:at(0,.3,0).toArray(),collider:'authored'});
    const door=mechanics.staticBox([1.54,2.36,.12],at(0,1.4,2.55).toArray(),0x455d56);
    part(door.visual,[.11,.12,.08],[.54,-.04,.085],0xb8954d,.022);
    this.door=door;
    const savedRoute=bag.records.get('second-address-entry')?.description;
    if(bag.records.has('pond-records')&&['utility bluff','grapple latch','followed resident'].includes(savedRoute)){
      this.route=savedRoute;
      door.visual.visible=false;
      door.collider.setEnabled(false);
    }
    this.entry=at(0,1.38,3.55);
    mechanics.tag(door.collider,{name:'Ask to inspect the house as a utility worker',action:()=>this.open('utility bluff')});
    const latchPoint=at(1.36,2.74,4.56);
    const latch=new T.Mesh(new T.TorusGeometry(.15,.029,8,18),new T.MeshStandardMaterial({
      color:0xce9f59,metalness:.63,roughness:.36
    }));
    latch.position.copy(latchPoint);scene.add(latch);
    part(scene,[.055,.29,.068],at(1.36,2.94,4.56).toArray(),0x5a5444);
    const latchTarget=mechanics.staticBox([.34,.33,.16],latchPoint.toArray(),0x87774f);
    latchTarget.visual.visible=false;
    mechanics.tag(latchTarget.collider,{name:'Grapple the porch service latch',onGrapple:()=>this.open('grapple latch')});

    const resident=person(0x765247);
    scene.add(resident.root);
    this.resident=resident;
    this.mailbox=groundPoint(lot.x+4.3,lot.z+5.45);
    this.walkIn=groundPoint(lot.x+1.3,lot.z+4.95);
    this.front=groundPoint(lot.x+1.35,lot.z+4.55);
    this.escapeRoute=[
      {name:'the orchard turnout',point:groundPoint(20,30)},
      {name:'the ridge fork',point:groundPoint(11,34)},
      {name:'the main road',point:groundPoint(trailX(36),36)}
    ];
    const inspector=person(0x39444b);
    this.inspector=inspector;
    inspector.root.visible=false;
    scene.add(inspector.root);
    this.inspectorStart=groundPoint(lot.x+7,lot.z+7.4);
    resident.root.position.copy(this.mailbox);
    const personSensor=mechanics.world.createCollider(R.ColliderDesc.ball(.45).setSensor(true)
      .setTranslation(this.mailbox.x,this.mailbox.y+1,this.mailbox.z).setCollisionGroups((128<<16)|2));
    this.personSensor=personSensor;
    mechanics.tag(personSensor,{name:'Talk to the resident at the mailbox',action:()=>{
      if(!this.unlocked())return '“Can I help you? The utility office is across town.”';
      const statement=this.crossingResident?.();
      if(statement)return statement;
      if(chapters?.ending&&!bag.records.has('extraction-return')){
        return chapters.ending==='seal'?
          '“I finally slept through nine o’clock. I miss hearing him, though. I still leave the lamp on when it rains.”':
          '“The ranger asked me to write down every time the wall knocks. If Cal’s still out there, he ought to know somebody’s listening.”';
      }
      if(bag.records.has('extraction-return')&&chapters?.ending){
        return chapters.ending==='seal'?
          '“The knocking stopped the night you closed the arch. The man you brought home recognized the chair before I said a word.”':
          '“He recognized the chair. Then someone on the other side knocked the same three beats. I’m leaving the porch light on.”';
      }
      if(bag.records.has('flooded-knock')&&!bag.records.has('resident-knock')){
        bag.record('resident-knock','The resident knew the knock',
          'She says Cal knocked three times when the creek rose. She heard it through this kitchen wall after the other address was underwater.');
        return '“Three knocks was Cal’s signal when he got home with his hands full. I heard it through this wall after the other house went under. Check the kitchen clock. It stopped right after the last knock.”';
      }
      if(this.route==='grapple latch')return '“Something just tripped the porch latch. If you’re here about the clock, go ahead. I’ve tried everything.”';
      if(this.route==='utility bluff'){
        if(this.getaway)return '“Take the wagon around the orchard. I’ll keep him at the house.”';
        if(bag.records.has(getawayKey)||bag.records.has('second-address-filed')){
          return '“Take both observations to the post office. The clerk knows what to do with them.”';
        }
        if(this.hasBothClues())return this.startGetaway();
        return '“The meter is fine. It’s the clock that stopped. Your office sent you about that, right?”';
      }
      if(this.route)return '“I’ll stay out here. That clock makes me remember things that never happened to me.”';
      this.follow=0;
      return '“The meter is this way. Keep up.” Follow her to the porch.';
    }});

    this.clockPoint=at(.15,1.83,-2.45);
    const clock=pipeline.prepare(models.kitchenClock,{position:this.clockPoint.toArray()});
    scene.add(clock);
    const clockSensor=mechanics.world.createCollider(R.ColliderDesc.ball(.27)
      .setTranslation(...this.clockPoint.clone().add(new T.Vector3(0,0,.13)).toArray())
      .setSensor(true).setCollisionGroups((128<<16)|2));
    mechanics.tag(clockSensor,{name:'Inspect the stopped kitchen clock',action:()=>{
      if(!this.route)return 'The clock is inside the house.';
      const observation=this.crossingClock?.();
      if(observation)return observation;
      if(bag.records.has('second-address-clock'))return 'The hands still read 9:00. The owner remembers Mom saying it only stops when it rains.';
      bag.record('second-address-clock','The clock only stops when it rains',
        'The occupant repeats a private line Mom used about her kitchen clock. The cracked clock and the child’s chair with red tape match the kitchen at the flooded address.');
      return 'From the porch, the resident says, “Your mom always said the kitchen clock only stops when it rains.” You remember her saying that when the two of you were alone.';
    }});
    this.tray=at(0,.93,-.94);
    for(const z of [-.58,.58]){
      const top=.94-z*.13;
      mechanics.staticBox([.57,top-.30,.21],at(0,(top+.30)/2,-.94+z).toArray(),0x625243);
    }
    const visual=pipeline.prepare(models.echoSurveyTray,{position:this.tray.toArray()});
    visual.rotation.x=.13;
    visual.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true;});
    scene.add(visual);
    const receiverStand=mechanics.staticBox([.53,.85,.42],at(.91,.73,-1.42).toArray(),0x675645);
    const receiver=pipeline.prepare(models.receiver,{position:at(.91,1.155,-1.42).toArray(),scale:.67});
    const base=new T.Box3().setFromObject(receiver).min.y;
    if(Number.isFinite(base))receiver.position.y+=receiverStand.visual.position.y+.425-base;
    scene.add(receiver);
    this.receiverLamp=new T.PointLight(0x7cc7b9,0,2.2,2);
    this.receiverLamp.position.copy(at(.91,1.46,-1.42));scene.add(this.receiverLamp);
    const trayFloor=R.ColliderDesc.cuboid(.225,.031,.77).setTranslation(this.tray.x,this.tray.y+.02,this.tray.z)
      .setRotation(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.13));
    mechanics.world.createCollider(trayFloor);
    this.trayControl=at(.91,1.30,-1.19);
    const trayPrompt=mechanics.world.createCollider(R.ColliderDesc.ball(.27)
      .setTranslation(...this.trayControl.toArray()).setSensor(true).setCollisionGroups((128<<16)|2));
    this.trayInteraction={name:'Release the brass survey ball',action:()=>this.tryBall()};
    mechanics.tag(trayPrompt,this.trayInteraction);
    const post=plots[2];
    this.drop=station(mechanics,0,groundPoint(post.x+3.4,post.z+3.6),'Compare the two addresses at the post office',()=>{
      if(!this.hasBothClues()){
        return 'The clerk has the old map. Bring the clock observation and the slope experiment from the dry address.';
      }
      if(bag.records.has('second-address-filed'))return 'The clerk keeps both house records side by side.';
      if(this.getaway)this.finishGetaway(false);
      bag.record('second-address-filed','Two addresses, one evacuee',
        'The clerk shows you two signatures dated the same night. One was filed after the reservoir covered its address. Ask who moves the original tapes during Founders’ Night.');
      return 'Two signatures, same night. The clerk whispers that the original tapes leave the archive during the parade.';
    },{color:0x8d7950}).point;
  }

  unlocked(){return this.bag.records.has('pond-records');}

  hasBothClues(){
    return this.bag.records.has('echo-slope')&&this.bag.records.has('second-address-clock');
  }

  startGetaway(){
    this.getaway={time:45,checkpoint:0};
    this.inspector.root.position.copy(this.inspectorStart);
    this.inspector.root.visible=true;
    return 'A real utility inspector calls from the lane. “Nobody sent a crew.” The resident points uphill. “Take the wagon around the orchard and I can get the archive route to you. You can still file both clues at the post office.”';
  }

  finishGetaway(escaped){
    this.getaway=null;
    this.inspector.root.visible=false;
    this.bag.record(getawayKey,escaped?'Slipped the utility inspector':'Utility cover exposed',
      escaped?'The resident slipped the archive delivery destination over the radio.':
        'The utility inspector wrote down the wagon plate. Both observations can still be filed at the post office.');
    if(!escaped)return 'The inspector got your plate. The post office can still file both clues and has a backup delivery receipt.';
    if(!this.bag.records.has(leadKey)){
      this.bag.record(leadKey,'Archive delivery destination',
        'The resident radioed after the getaway. The parade load goes to the creek storehouse.');
    }
    return 'You clear the ridge. The resident radios that the archive load goes to the creek storehouse. File both clues at the post office first.';
  }

  tickGetaway(dt){
    const run=this.getaway,m=this.mechanics;
    if(!run||m.area!==0)return;
    run.time-=dt;
    const {root,legs}=this.inspector;
    const step=Math.min(1,(45-run.time)/6);
    root.position.lerpVectors(this.inspectorStart,this.mailbox,step);
    root.position.y=height(root.position.x,root.position.z);
    root.rotation.y=Math.atan2(this.mailbox.x-this.inspectorStart.x,this.mailbox.z-this.inspectorStart.z);
    legs.forEach((leg,i)=>{leg.rotation.x=step===1?0:Math.sin(step*34+i*Math.PI)*.3;});
    if(run.time<=0){
      this.notice(this.finishGetaway(false));
      return;
    }
    if(!m.driving)return;
    const target=this.escapeRoute[run.checkpoint].point;
    const wagon=m.car.body.translation();
    if(Math.hypot(wagon.x-target.x,wagon.z-target.z)>4.2)return;
    run.checkpoint++;
    if(run.checkpoint===this.escapeRoute.length)this.notice(this.finishGetaway(true));
  }

  open(route){
    if(!this.unlocked())return 'The address means nothing yet. Check the missing-person ledger from the submerged street.';
    if(this.route)return 'The front door is already open.';
    this.route=route;
    this.bag.record('second-address-entry','Entry at the dry address',route);
    this.door.visual.visible=false;
    this.door.collider.setEnabled(false);
    return route==='utility bluff'?
      '“Utility office? Fine. Check the meter inside.”':
      route==='grapple latch'?'The brass latch snaps upward and releases the front door.':
      'The resident opens the front door and gestures you inside.';
  }

  tryBall(){
    if(!this.route)return 'Find a way into the house first.';
    if(this.bag.records.has('echo-slope'))return 'The ball climbed against the marked slope when the Echo answered.';
    const mode=this.trial.begin();
    if(!mode)return 'Let the ball finish rolling first.';
    if(this.ball&&this.mechanics.items.has(this.ball.collider.handle))this.mechanics.remove(this.ball);
    const visual=new T.Mesh(new T.SphereGeometry(.064,14,10),
      new T.MeshStandardMaterial({color:0xe2b66d,metalness:.67,roughness:.32}));
    const origin=this.tray.clone().add(new T.Vector3(0,.15,0));
    this.ball=this.mechanics.dynamic({position:origin.toArray(),name:'Survey ball',area:0,visual,life:12,
      shape:R.ColliderDesc.ball(.064).setFriction(.35).setDensity(4)});
    this.mechanics.tag(this.ball.collider,{name:'Watch the survey ball',action:()=> 'Let it roll without touching it.'});
    this.ballAge=0;
    this.receiverLamp.intensity=mode==='echo'?3.4:0;
    return mode==='control'?'Watch where the ball goes before you turn on the old receiver.':
      'You turn on the receiver and release the ball from the same mark.';
  }

  tick(dt){
    const m=this.mechanics;
    this.tickGetaway(dt);
    if(this.follow!==undefined&&!this.route&&m.area===0){
      const root=this.resident.root;
      if(root.position.distanceTo(m.walker.current)<5.6&&!m.driving){
        this.follow=Math.min(1,this.follow+dt*.34);
        const next=this.follow<.72?this.walkIn:this.front;
        root.position.lerpVectors(this.follow<.72?this.mailbox:this.walkIn,next,
          this.follow<.72?this.follow/.72:(this.follow-.72)/.28);
        root.position.y=height(root.position.x,root.position.z);
        root.rotation.y=-Math.PI/2;
        this.resident.legs.forEach((leg,i)=>{leg.rotation.x=this.follow===1?0:Math.sin(this.follow*33+i*Math.PI)*.31;});
        this.personSensor.setTranslation({x:root.position.x,y:root.position.y+1,z:root.position.z});
        if(this.follow===1)this.notice(this.open('followed resident'));
      }
    }
    if(!this.ball||!['control','echo'].includes(this.trial.phase))return;
    const ball=this.ball;
    if(!m.items.has(ball.collider.handle)){
      this.ball=null;this.trial.phase=this.trial.phase==='echo'?'control-ready':'idle';
      this.receiverLamp.intensity=0;
      this.trayInteraction.name='Reset the brass-ball experiment';
      this.notice('The ball left the tray. Use the tray to reset and try again.');
      return;
    }
    this.ballAge+=dt;
    const position=vec(ball.body.translation());
    const offset=position.z-this.tray.z;
    if(this.trial.phase==='echo'&&this.ballAge>.28){
      const force=ball.body.mass()*dt;
      ball.body.applyImpulse({x:0,y:0,z:-8*force},true);
    }
    const result=this.trial.observe(offset);
    if(result==='control'){
      this.trayInteraction.name='Switch on the receiver and repeat the test';
      this.notice('It rolls downhill. Use the receiver to repeat the same test with it on.');
    }
    if(result==='echo'){
      this.trayInteraction.name='Review the brass-ball experiment';
      this.bag.record('echo-slope','The uphill ball',
        'With the receiver off the brass ball rolled downhill. With it on, the ball climbed the same slope. Entered by '+this.route+'.');
      this.notice(this.bag.records.has('second-address-clock')?
        'The ball climbs uphill. Bring both clues to the post office.':
        'The ball climbs uphill. Inspect the stopped clock before you leave.');
    }
  }

  objective(){
    if(this.mechanics.area!==0||!this.unlocked()||this.bag.records.has('second-address-filed'))return null;
    const clock=this.bag.records.has('second-address-clock');
    if(this.getaway){
      const stop=this.escapeRoute[this.getaway.checkpoint];
      return {text:'Optional getaway · Drive through '+stop.name+' · '+Math.ceil(this.getaway.time)+' s',
        target:stop.point};
    }
    if(this.hasBothClues())return {text:'The Second Address · Compare records at the post office',target:this.drop};
    if(this.route&&!clock)return {text:'The Second Address · Inspect the stopped clock',target:this.clockPoint};
    if(this.route)return {text:this.trial.phase==='control-ready'?'The Second Address · Run the experiment with the receiver on':
      'The Second Address · Release the test ball from the receiver stand',target:this.trayControl};
    if(this.follow!==undefined)return {text:'The Second Address · Follow the resident to the porch',target:this.resident.root.position};
    return {text:'The Second Address · Talk, grapple the eave latch, or follow the resident',target:this.entry};
  }
}
