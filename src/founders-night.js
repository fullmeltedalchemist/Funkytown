import * as T from 'three';
import R from 'rapier';
import {person} from './rescue.js';
import {groundPoint,station} from './field-stations.js';
import {height,plots,trailX} from './terrain.js';
import {part,vec} from './mechanics.js';

const startZ=27.2,finishZ=3.4;
const tapeKey='founders-original-tape';
const leadKey='founders-depot';
const latchKey='founders-latch-open';
const routePoint=z=>groundPoint(trailX(z)+.6,z);
const bellFloatSite={x:-6.3,z:24.4};
const bellRouteLength=6.2;
export const nearParadeStaging=(x,z)=>Math.abs(x-bellFloatSite.x)<4.5&&
  z>bellFloatSite.z-bellRouteLength-4.5&&z<bellFloatSite.z+4.5;

export class FoundersNight {
  constructor(mechanics,pipeline,models,bag,notice){
    Object.assign(this,{mechanics,bag,notice,pipeline,models});
    const post=plots[2];
    const dispatch=station(mechanics,0,groundPoint(post.x+3.55,post.z+6.1),'Read the archive dispatch board',()=>{
      if(!this.unlocked())return 'The dispatch board is covered. Finish comparing the two addresses first.';
      if(bag.records.has(tapeKey))return 'The original tape is already filed in your bag.';
      if(bag.records.has(leadKey))return 'The archive load went to the creek storehouse.';
      if(this.tail)return 'The archive truck is on the south road. Use the receipt beside the board if you lose it.';
      this.tail={z:startZ,started:false,contact:0};
      this.truck.position.copy(routePoint(startZ));
      this.truck.rotation.y=0;
      this.truck.visible=true;
      this.truckBody.setTranslation(this.truck.position,true);
      this.truckBody.setRotation(this.truck.quaternion,true);
      this.truckBody.setEnabled(true);
      return 'The truck waits on the south road. Bring the wagon close and follow it through town.';
    },{color:0x526959});
    this.dispatch=dispatch.point;
    const clerk=mechanics.fixed.get(dispatch.collider.handle);
    clerk.acceptName='Hand the archive case to the clerk';
    clerk.accept=item=>this.fileTape(item);
    const receipt=station(mechanics,0,groundPoint(post.x+4.55,post.z+6.95),'Read the backup delivery receipt',()=>{
      if(!this.unlocked())return 'The receipt is clipped under the archive dispatch board.';
      if(bag.records.has(tapeKey))return 'The receipt matches the original tape in your bag.';
      return this.revealDepot('delivery receipt');
    },{color:0xae8959});
    this.receipt=receipt.point;
    for(let i=0;i<3;i++)part(receipt.body,[.27,.012,.19],[i*.019,.951+i*.012,0],0xd7bf91,.004);
    this.truck=pipeline.prepare(models.archiveTruck,{position:routePoint(startZ).toArray()});
    this.truck.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true;});
    this.truck.visible=false;
    mechanics.scenes[0].add(this.truck);
    this.truckBody=mechanics.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    mechanics.world.createCollider(R.ColliderDesc.cuboid(.76,.65,1.55).setTranslation(0,.88,0),this.truckBody);
    this.truckBody.setEnabled(false);
    if(this.unlocked())this.installParade();
    const location=groundPoint(7.8,7.7);
    pipeline.place(models.archiveLoadingBay,{position:location.toArray(),collider:'authored'});
    const depot=station(mechanics,0,location,'Inspect the archive loading cage',()=>{
      if(bag.records.has(tapeKey))return 'The archive tape has already been recovered.';
      if(!bag.records.has(leadKey))return 'The cage is tagged with an archive delivery number. Find the matching dispatch first.';
      if(!bag.records.has(latchKey))return 'The cage is jammed. Grapple the brass ring to lift the shutter.';
      const item=this.case;
      if(item&&mechanics.items.has(item.collider.handle)&&mechanics.cargo!==item&&mechanics.carried!==item&&
        this.caseHome.distanceToSquared(item.body.translation())>16){
        mechanics.resetProp(item,this.caseHome);
        return 'The storehouse attendant puts the lost tape case back on the shelf.';
      }
      return 'Take the archive case to the clerk at the dispatch board.';
    },{color:0x536961});
    this.depot=depot.point;
    const scene=mechanics.scenes[0];
    const stand=mechanics.staticBox([.91,.10,.69],
      [location.x,location.y+.92,location.z-.19],0x4f5650);
    this.caseHome=stand.visual.position.clone().add(new T.Vector3(0,.078,0));
    for(const x of [-.48,.48]){
      part(scene,[.085,1.63,.1],[location.x+x,location.y+.815,location.z-.19],0x4a5150,.018);
    }
    this.gate=mechanics.staticBox([.97,.66,.12],
      [location.x,location.y+1.31,location.z+.24],0x475b58);
    for(const x of [-.31,-.16,0,.16,.31]){
      part(this.gate.visual,[.055,.59,.07],[x,0,.066],0x879087,.008);
    }
    this.ringPoint=new T.Vector3(location.x,location.y+1.82,location.z+.27);
    this.ring=new T.Mesh(new T.TorusGeometry(.126,.027,8,20),new T.MeshStandardMaterial({
      color:0xc69b58,metalness:.58,roughness:.4
    }));
    this.ring.position.copy(this.ringPoint);scene.add(this.ring);
    const hook=mechanics.staticBox([.3,.3,.12],this.ringPoint.toArray(),0xc69b58);
    hook.visual.visible=false;
    mechanics.tag(hook.collider,{name:'Grapple the archive shutter ring',onGrapple:()=>this.openCage()});
    if(bag.records.has(latchKey))this.raiseShutter();
    if(bag.records.has(latchKey)&&!bag.records.has(tapeKey))this.stockCase();
  }

  installParade(){
    const m=this.mechanics;
    const site=groundPoint(-.4,18);
    this.float=this.pipeline.place(this.models.paradeFloat,{position:site.toArray(),collider:'authored'});
    for(const z of [site.z-1.4,site.z+.8]){
      const base=groundPoint(site.x-1.95,z);
      m.staticBox([.11,.12,1.63],[base.x,base.y+.66,base.z],0xb99762);
      for(const offset of [-.74,.74]){
        const foot=groundPoint(base.x,z+offset);
        part(m.scenes[0],[.13,Math.max(.15,base.y+.68-foot.y),.14],
          [foot.x,(base.y+.68+foot.y)/2,foot.z],0x526351,.012);
      }
    }
    for(const [z,coat] of [[site.z-1.45,0x7c5350],[site.z-.05,0x57566d]]){
      const spectator=person(coat).root;
      spectator.position.copy(groundPoint(site.x-2.55,z));
      spectator.rotation.y=Math.PI/2;
      m.scenes[0].add(spectator);
    }
    const recorder=site.clone().add(new T.Vector3(0,1.08,1.52));
    const radio=this.pipeline.prepare(this.models.receiver,{position:recorder.toArray(),scale:.48});
    radio.position.y+=site.y+.71-new T.Box3().setFromObject(radio).min.y;
    m.scenes[0].add(radio);
    this.recorder=recorder.setY(radio.position.y+.15);
    const target=m.world.createCollider(R.ColliderDesc.ball(.25)
      .setTranslation(...this.recorder.toArray())
      .setSensor(true).setCollisionGroups((128<<16)|2));
    m.tag(target,{name:'Listen to the recorder aboard the parade float',action:()=>{
      if(this.bag.records.has('founders-float-audio'))return 'The recorder has already captured the dispatcher’s order.';
      this.bag.record('founders-float-audio','Parade dispatch recording',
        'A dispatcher orders the unedited roll-call tape moved to the creek storehouse before the last float clears Main Street.');
      this.revealDepot('parade dispatch recording');
      return 'The recorder catches an order to move the unedited roll-call tape to the creek storehouse. You keep the recording.';
    }});
    const bellBase=groundPoint(bellFloatSite.x,bellFloatSite.z);
    this.bellBase=bellBase;
    this.bellTime=0;
    this.bellPaused=false;
    this.bellBody=m.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(...bellBase.toArray()));
    const bellFloat=this.bellFloat=this.pipeline.place(this.models.paradeFloat,{
      position:bellBase.toArray(),yaw:0,scale:.8,collider:'authored',body:this.bellBody
    });
    bellFloat.traverse(node=>{
      if(!node.isMesh||!node.visible||!node.material.color)return;
      node.material=node.material.clone();
      node.material.color.multiply(new T.Color(0xc7d5a9));
    });
    const bell=new T.Mesh(new T.LatheGeometry([
      new T.Vector2(.24,0),new T.Vector2(.17,.09),new T.Vector2(.13,.26),new T.Vector2(.045,.34)
    ],20),new T.MeshStandardMaterial({color:0xc49a51,metalness:.55,roughness:.35,side:T.DoubleSide}));
    bell.position.set(0,.71,0);
    bellFloat.add(bell);
    this.bellSpectators=[
      {name:'Inez',x:bellBase.x-1.75,z:bellBase.z-1.65,coat:0x816643,
        listen:()=>this.memorialWitness()},
      {name:'Wes',x:bellBase.x+1.95,z:bellBase.z-2.1,coat:0x596a66,
        listen:()=>this.routeMarshal()}
    ].map(({name,x,z,coat,listen})=>{
      const {root:spectator,arms}=person(coat);
      spectator.position.copy(groundPoint(x,z));
      m.scenes[0].add(spectator);
      const sensor=m.world.createCollider(R.ColliderDesc.capsule(.28,.34)
        .setTranslation(x,spectator.position.y+1,z).setSensor(true).setCollisionGroups((128<<16)|2));
      m.tag(sensor,{name:'Talk to '+name,action:listen});
      return {root:spectator,arm:arms[1]};
    });
    station(m,0,groundPoint(bellBase.x+2.35,bellBase.z+1.6),'Read the memorial float program',()=>{
      const corrected=this.bag.records.has(tapeKey);
      this.bag.record('founders-memorial-program','Founders’ Night memorial program',corrected?
        'The postmaster added Cal to the memorial program after hearing the original tape.' :
        'The bell float stops at the ford to read the missing names. The printed list leaves Cal off because the official roll call marked him safe.');
      return corrected?
        'Cal’s name is penciled into the margin. The postmaster has written “two replies, one name” beside it.' :
        'The bell float will stop at the ford to read the missing names. Cal is absent from the list. The program says he answered the roll call from the safe bank.';
    },{color:0x756c48});
    const worker=person(0x594946);
    const base=groundPoint(-4.7,19.6);
    worker.root.position.copy(base);
    m.scenes[0].add(worker.root);
    const crew=m.world.createCollider(R.ColliderDesc.capsule(.32,.36)
      .setTranslation(base.x,base.y+1,base.z)
      .setSensor(true).setCollisionGroups((128<<16)|2));
    m.tag(crew,{name:'Ask the stagehand where the archive load goes',action:()=>{
      if(this.bag.records.has('founders-stagehand'))return '“I already told you where they’re taking it. Don’t use my name.”';
      this.bag.record('founders-stagehand','Stagehand’s delivery tip',
        'You say you are clearing the parade route. A stagehand names the creek storehouse but asks you to keep the conversation private.');
      this.revealDepot('backstage bluff');
      return '“Route crew? Tell the truck to use the creek storehouse.” The stagehand lowers her voice. “My dad is on the memorial list. I want the tape heard, but leave my name out of it.”';
    }});
  }

  memorialWitness(){
    if(this.bag.records.has(tapeKey))return 'Inez folds her program around the pencil marks. “When they read his name, I’ll ring once for the man who came back and once for the voice we left behind.”';
    if(this.bag.records.has('founders-bell-witness'))return '“Look at the program. I rang the bell from the bank. The man calling for me was still across the creek.”';
    this.bag.record('founders-bell-witness','Inez’s evacuation account',
      'Inez used to signal the mill shift with the bell. She was on the near bank when Cal answered from across the creek, after dispatch marked him safe.');
    return '“I rang that bell at the mill for thirty years. On flood night I rang it from this bank. Cal answered from the other side after dispatch had already marked him safe.”';
  }

  routeMarshal(){
    if(this.bag.records.has(tapeKey))return 'Wes lowers the route flag. “The clerk says the tape’s safe. We can read the names without hurrying now.”';
    return this.bellPaused?
      '“Hold there. I stopped the float because someone’s in the lane. Walk along the shoulder and I’ll wave it through.”':
      '“The bell crew uses this lane. The archive truck takes the main road. If you lose it, the clerk has the delivery receipt beside the dispatch board.”';
  }

  advanceParade(dt,player){
    const {x,z}=this.bellBase;
    const nextTime=this.bellTime+dt;
    // Hold at the memorial stop before returning to the staging lane.
    const phase=nextTime%34;
    const progress=phase<14?phase/14:phase<18?1:phase<32?1-(phase-18)/14:0;
    const nextZ=z-progress*bellRouteLength;
    this.bellPaused=Math.abs(player.x-x)<1.22&&Math.abs(player.z-nextZ)<2.85;
    if(!this.bellPaused){
      this.bellTime=nextTime;
      const position=this.bellFloat.position.set(x,height(x,nextZ),nextZ);
      this.bellBody.setNextKinematicTranslation(position);
    }
    const float=this.bellFloat.position;
    for(const {root,arm} of this.bellSpectators){
      root.rotation.y=Math.atan2(float.x-root.position.x,float.z-root.position.z);
      arm.rotation.x=this.bellPaused||phase>=14&&phase<18?-.85+Math.sin(this.bellTime*7)*.12:0;
    }
  }

  raiseShutter(){
    this.gate.collider.setEnabled(false);
    this.gate.visual.position.y=this.ringPoint.y+.33;
    this.ring.rotation.y=Math.PI*.45;
  }

  openCage(){
    if(!this.bag.records.has(leadKey))return 'Find the matching archive dispatch before opening this cage.';
    if(this.bag.records.has(latchKey))return 'The archive cage is already open.';
    this.bag.record(latchKey,'Archive cage opened','The shutter was lifted with the grapple at the creek storehouse.');
    this.raiseShutter();
    this.stockCase();
    return 'The shutter lifts. Carry the tape case back to the archive dispatch board.';
  }

  stockCase(){
    const m=this.mechanics;
    const source=this.pipeline.loose(this.models.archiveTapeCase,1);
    this.case=m.dynamic({...source,position:this.caseHome.toArray(),home:this.caseHome,size:[.56,.29,.46],
      area:0,name:'Archive tape case',impactLimit:Infinity,breakEffect:()=>{}});
  }

  fileTape(item){
    if(item!==this.case)return 'The clerk is waiting for the archive tape case.';
    this.mechanics.remove(item);
    this.case=null;
    this.bag.record(tapeKey,'Original evacuation tape',
      'The official roll call ends early. On the original tape, two people answer to the same name from opposite banks. Mom asks the ranger to keep the crossing open.');
    const witness=this.bag.records.has('founders-float-audio')?
      ' The clerk recognizes the dispatcher’s voice from the parade recording.' :
      this.bag.records.has('founders-stagehand')?' The clerk agrees to keep the stagehand out of the report.':'';
    const corroboration=this.bag.records.has('founders-bell-witness')?
      ' The clerk marks Inez’s bell in the margin, just before the second reply.' : '';
    return 'The clerk plays the tape. Two people answer to the same name. Then you hear Mom ask the ranger to keep the crossing open.'+
      witness+corroboration;
  }

  unlocked(){return this.bag.records.has('second-address-filed');}

  revealDepot(method){
    if(!this.bag.records.has(leadKey)){
      this.bag.record(leadKey,'Archive delivery destination',
        'The creek storehouse received the archive load. Lead found via '+method+'.');
    }
    this.tail=null;
    this.truck.visible=false;
    this.truckBody.setEnabled(false);
    return 'The load went to the creek storehouse. Find the matching crate by the water.';
  }

  tick(dt){
    const m=this.mechanics;
    if(m.area!==0)return;
    if(!this.float&&this.unlocked())this.installParade();
    const player=m.driving?vec(m.car.body.translation()):m.walker.current;
    if(this.bellFloat)this.advanceParade(dt,player);
    if(this.bag.records.has(latchKey)&&!this.bag.records.has(tapeKey)&&
      (!this.case||!m.items.has(this.case.collider.handle)))this.stockCase();
    if(!this.tail)return;
    const {tail,truck}=this;
    const near=Math.hypot(player.x-truck.position.x,player.z-truck.position.z);
    if(!tail.started){
      if(!m.driving||near>9)return;
      tail.started=true;
      this.notice('The archive truck is moving. Stay close enough to follow it.');
    }
    tail.inRange=m.driving&&near<13;
    if(tail.inRange)tail.contact+=dt;
    tail.z=Math.max(finishZ,tail.z-dt*3.65);
    const next=routePoint(tail.z);
    const delta=next.clone().sub(truck.position);
    if(delta.lengthSq()>0)truck.rotation.y=Math.atan2(-delta.x,-delta.z);
    truck.position.copy(next);
    this.truckBody.setNextKinematicTranslation(next);
    this.truckBody.setNextKinematicRotation(truck.quaternion);
    if(tail.z>finishZ)return;
    if(tail.contact>=3.2){this.notice(this.revealDepot('following the archive truck'));return;}
    this.tail=null;
    truck.visible=false;
    this.truckBody.setEnabled(false);
    this.notice('The truck got away. The backup receipt at the post office still has its destination.');
  }

  objective(){
    if(this.mechanics.area!==0||!this.unlocked()||this.bag.records.has(tapeKey))return null;
    if(this.bag.records.has(latchKey)){
      const carrying=this.case&&(this.mechanics.carried===this.case||this.mechanics.cargo===this.case);
      if(carrying)return {text:'Founders’ Night · Take the tape case to the clerk',target:this.dispatch};
      return {text:'Founders’ Night · Pick up the archive tape case',
        target:this.case?vec(this.case.body.translation()):this.caseHome};
    }
    if(this.bag.records.has(leadKey))return {text:'Founders’ Night · Grapple the brass ring at the creek storehouse',target:this.ringPoint};
    if(this.tail)return {text:this.tail.started?
      this.tail.inRange?'Founders’ Night · Tracking the truck · '+Math.min(100,Math.floor(this.tail.contact/3.2*100))+'%':
        'Founders’ Night · Close the gap or use the backup receipt':
      'Founders’ Night · Bring the wagon to the south road',target:this.truck.position};
    return {text:'Founders’ Night · Check the dispatch board, parade float, stagehand, or receipt',target:this.dispatch};
  }
}
