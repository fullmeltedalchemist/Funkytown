import * as T from 'three';
import R from 'rapier';
import {part,vec} from './mechanics.js';
import {height,plots,secondAddress as lot} from './terrain.js';
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

export class SecondAddress {
  trial=new SurveyTrial();
  constructor(mechanics,pipeline,models,bag,notice){
    Object.assign(this,{mechanics,bag,notice});
    const scene=mechanics.scenes[0];
    const at=(x,y,z)=>new T.Vector3(lot.x+x,lot.y+y,lot.z+z);
    const house=pipeline.place(models.cabin,{position:at(0,0,0).toArray(),scale:1,collider:'authored'});
    house.traverse(node=>{
      if(!node.isMesh||!node.visible||!node.material.color)return;
      node.material=node.material.clone();
      node.material.color.multiply(new T.Color(0xaec6ad));
    });
    const door=mechanics.staticBox([1.54,2.36,.12],at(0,1.4,2.55).toArray(),0x455d56);
    part(door.visual,[.11,.12,.08],[.54,-.04,.085],0xb8954d,.022);
    this.door=door;
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
    resident.root.position.copy(this.mailbox);
    const personSensor=mechanics.world.createCollider(R.ColliderDesc.ball(.45).setSensor(true)
      .setTranslation(this.mailbox.x,this.mailbox.y+1,this.mailbox.z).setCollisionGroups((128<<16)|2));
    this.personSensor=personSensor;
    mechanics.tag(personSensor,{name:'Talk to the resident at the mailbox',action:()=>{
      if(!this.unlocked())return '“Can I help you? The utility office is across town.”';
      if(this.route)return '“Funny you should ask. Your mom used to say, ‘The kitchen clock only stops when it rains.’” She never said that outside the kitchen.';
      this.follow=0;
      return '“The meter is this way. Keep up.” Follow her to the porch.';
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
    const trayPrompt=mechanics.world.createCollider(R.ColliderDesc.ball(.22)
      .setTranslation(this.tray.x,this.tray.y+.28,this.tray.z+.45).setSensor(true).setCollisionGroups((128<<16)|2));
    mechanics.tag(trayPrompt,{name:'Release the brass survey ball',action:()=>this.tryBall()});
    const post=plots[2];
    this.drop=station(mechanics,0,groundPoint(post.x+3.4,post.z+3.6),'Compare the two addresses at the post office',()=>{
      if(!bag.records.has('echo-slope'))return 'The clerk has the old map. Bring evidence from the dry address first.';
      if(bag.records.has('second-address-filed'))return 'The clerk keeps both house records side by side.';
      bag.record('second-address-filed','Two addresses, one evacuee',
        'The clerk shows you two signatures dated the same night. One was filed after the reservoir covered its address. Ask who moves the original tapes during Founders’ Night.');
      return 'Two signatures, same night. The clerk whispers that the original tapes leave the archive during the parade.';
    },{color:0x8d7950}).point;
  }

  unlocked(){return this.bag.records.has('pond-records');}

  open(route){
    if(!this.unlocked())return 'The address means nothing yet. Check the missing-person ledger from the submerged street.';
    if(this.route)return 'The front door is already open.';
    this.route=route;
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
    if(result==='control')this.notice('It rolls downhill. Use the tray again to run the same test with the receiver on.');
    if(result==='echo'){
      this.bag.record('echo-slope','The uphill ball',
        'With the receiver off the brass ball rolled downhill. With it on, the ball climbed the same slope. Entered by '+this.route+'.');
      this.notice('The ball climbs uphill. Bring the result to the post office and compare the two house records.');
    }
  }

  objective(){
    if(this.mechanics.area!==0||!this.unlocked()||this.bag.records.has('second-address-filed'))return null;
    if(this.bag.records.has('echo-slope'))return {text:'The Second Address · Compare records at the post office',target:this.drop};
    if(this.route)return {text:'The Second Address · Test the slope inside the house',target:this.tray};
    if(this.follow!==undefined)return {text:'The Second Address · Follow the resident to the porch',target:this.resident.root.position};
    return {text:'The Second Address · Find a way into the house listed twice',target:this.entry};
  }
}
