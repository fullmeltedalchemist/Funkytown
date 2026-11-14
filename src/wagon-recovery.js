import * as T from 'three';
import R from 'rapier';
import {relayRecording,relayCallSign} from './storehouse-relay.js';
import {dispatchLog,dispatchReceipt} from './archive-window.js';
import {groundPoint} from './field-stations.js';
import {part,vec} from './mechanics.js';
import {person} from './rescue.js';

export const recoveryNote='lower-road-recovery-note';
export const identifiedNote='lower-road-note-identified';

export class WagonRecovery {
  constructor(mechanics,bag,tow,notice,pipeline,models,unlocked){
    Object.assign(this,{mechanics,bag,tow,notice,unlocked});
    const m=mechanics,scene=m.scenes[0];
    this.home=groundPoint(-1,-15.6).add(new T.Vector3(0,.59,0));
    this.shoulder=groundPoint(-1,-21.2);
    this.driver=groundPoint(1.6,-18.85);
    const ed=person(0x576b56).root;
    ed.position.copy(this.driver);
    ed.rotation.y=-Math.PI/2;
    scene.add(ed);
    const driver=m.world.createCollider(R.ColliderDesc.capsule(.57,.24)
      .setTranslation(this.driver.x,this.driver.y+.82,this.driver.z)
      .setSensor(true).setCollisionGroups((128<<16)|2));
    m.tag(driver,{name:'Talk to Ed, the road crew driver',action:()=>this.speak()});

    for(const x of [-2.5,.5]){
      const marker=groundPoint(x,-19.8);
      part(scene,[.095,.64,.095],[x,marker.y+.29,marker.z],0x614c38,.014);
      part(scene,[.19,.17,.097],[x,marker.y+.56,marker.z],0xe6bb6a,.012);
    }

    for(const x of [-2.63,.63]){
      const base=groundPoint(x,-12.85);
      part(scene,[.16,.8,.16],[x,base.y+.35,base.z],0x6e5137,.019);
    }
    if(bag.records.has(recoveryNote))return;
    const gate=groundPoint(-1,-12.85);
    this.barrier=m.staticBox([3.18,.16,.15],[gate.x,gate.y+.67,gate.z],0xc38745);
    for(const x of [-1.18,-.6,0,.6,1.18]){
      part(this.barrier.visual,[.24,.151,.018],[x,0,.078],0xffd68e);
    }
    m.tag(this.barrier.collider,{name:'Read the lower-road closure',action:()=>{
      if(!unlocked())return 'The lower cut is closed until the ford rescue is over.';
      return 'The road crew closed the cut when their wagon slipped into the ditch. Ed is waiting near the gravel shoulder.';
    }});

    const visual=pipeline.prepare(models.archiveTruck,{position:[0,-.58,0]});
    visual.traverse(node=>{
      if(!node.isMesh)return;
      node.castShadow=node.receiveShadow=true;
      // Give the road crew its own fleet color and keep the archive truck untouched.
      if(node.material.name==='Archive utility paint'){
        node.material=node.material.clone();
        node.material.color.setHex(0x8e7347);
      }
    });
    const wagon=new T.Group();
    wagon.add(visual,pipeline.prepare(models.fordRescueBracket,{position:[0,.16,-1.56]}));
    const shape=R.ColliderDesc.cuboid(.82,.62,1.53).setTranslation(0,.04,0)
      .setDensity(5.5).setFriction(.23).setFrictionCombineRule(R.CoefficientCombineRule.Min);
    const load=m.dynamic({position:this.home.toArray(),visual:wagon,shape,home:this.home,name:'Road crew wagon'});
    load.towPoint=new T.Vector3(0,.16,-1.71);
    load.body.setEnabledRotations(false,true,false,true);
    load.body.setLinearDamping(.75);
    load.body.sleep();
    m.tag(load.collider,{name:'Inspect the road crew wagon’s tow eye',action:()=>!this.active?
      'The tow eye is intact. Talk to Ed by the shoulder before moving the wagon.':
      'Hook the brass eye on the bumper, then hook your camp wagon. Pull south toward the two stakes.'});
    this.load=load;
  }

  get connected(){
    const {tow,load,mechanics:m}=this;
    return tow.joint&&((tow.first.item===load&&tow.second.item===m.car)||
      (tow.second.item===load&&tow.first.item===m.car));
  }

  speak(){
    const records=this.bag.records;
    if(records.has(dispatchReceipt)&&records.has(relayRecording)&&!records.has(relayCallSign)){
      this.bag.record(relayCallSign,'Ed identified Birch Seven',
        'Birch Seven was Ed’s call sign. He recognizes Tower Two’s transmission and confirms he took the lower cut. The duplicate receipt carries no signature, so who authorized the order remains unresolved.');
      return '“Birch Seven was me. Tower Two said to follow the lights. I never heard a name on the order.”';
    }
    if(records.has(relayCallSign)&&records.has(recoveryNote)){
      return '“You can put Birch Seven in the ledger. That was my call sign. The name I need is whoever told Tower Two to send me.”';
    }
    if(this.bag.records.has(recoveryNote)){
      if(this.bag.records.has(dispatchLog))return '“Mercer signed it? He told me the order came from the bridge crew. I’ll tell June what he said over the radio.”';
      if(this.bag.records.has(dispatchReceipt))return '“Zero-seven C was my run. I heard the order on the radio. I never saw who signed it.”';
      if(this.bag.records.has(identifiedNote))return '“June told me she put the callout in her ledger. About time somebody wrote down which bell was which.”';
      return 'Ed points to the open cut. “That shaves a bend off the supply run. Show June my dispatch slip. She’ll want to see which bell they sent us out on.”';
    }
    if(!this.unlocked())return '“We’ve got a wagon down in the cut. See to the ford first. Mine can wait.”';
    if(this.connected)return '“You’ve got it rigged. Pull toward the two yellow stakes, or press Rig from the driver’s seat to reel in.”';
    const wasActive=this.active;
    this.active=true;
    if(wasActive||this.home.distanceToSquared(this.load.body.translation())>1.4){
      if(this.tow.first?.item===this.load||this.tow.second?.item===this.load)this.tow.clear();
      this.mechanics.resetProp(this.load,this.home);
      return 'Ed chocks the wagon back at the bottom of the ditch. Hook its tow eye and the camp wagon for another pull.';
    }
    return '“I backed in here the night the creek rose, too. Park south of the yellow stakes, hook both wagons, and reel in from the seat or drive south to pull me out.”';
  }

  tick(dt){
    if(!this.active||this.mechanics.area!==0)return;
    const p=vec(this.load.body.translation());
    const player=this.mechanics.driving?this.mechanics.car.body.translation():this.mechanics.walker.current;
    if(Math.hypot(player.x-this.driver.x,player.z-this.driver.z)>25){
      this.active=false;
      return;
    }
    const onShoulder=this.connected&&Math.abs(p.x-this.shoulder.x)<=1.75&&p.z<=-19.5&&p.z>=-25&&
      p.y>=this.shoulder.y+.3;
    this.settled=onShoulder?this.settled+dt:0;
    if(this.settled<.12)return;
    this.active=false;
    this.tow.clear();
    const m=this.mechanics;
    m.remove(this.load);
    this.barrier.visual.removeFromParent();
    m.fixed.delete(this.barrier.collider.handle);
    m.world.removeCollider(this.barrier.collider,false);
    this.bag.record(recoveryNote,'Ed’s flood dispatch slip',
      'Ed marked the lower cut passable after you recovered his wagon. His original callout time is penciled on the back. Compare it with June’s ledger.');
    this.notice('Ed chocks the wagon above the ditch and removes the closure bar. The lower cut is open. Take his dispatch slip to June.');
  }

  settled=0;

  objective(){
    if(!this.active||this.mechanics.area!==0)return null;
    if(this.connected){
      const label=this.tow.taut?'Line taut':'Take up slack';
      return {text:'Optional · '+label+' · Pull to the yellow stakes',target:this.shoulder};
    }
    const rigged=this.tow.first?.item===this.load||this.tow.second?.item===this.load;
    return {text:rigged?'Optional · Rig the camp wagon, or release the line and try again':'Optional · Rig the road crew wagon’s tow eye',
      target:this.load.visual.position};
  }
}
