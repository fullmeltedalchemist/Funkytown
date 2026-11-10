import * as T from 'three';
import R from 'rapier';
import {groundPoint,station} from './field-stations.js';
import {height,trailX} from './terrain.js';
import {vec} from './mechanics.js';
import {person} from './rescue.js';

const key='ford-rescue-call';
const startZ=6.8;
const routes={
  grapple:{label:'grapple tether',intact:true, prediction:'You’ll hook the bracket next.'},
  foot:{label:'on-foot evacuation',intact:false,prediction:'You’ll step toward her next.'},
  high:{label:'high-bank tow line',intact:true,prediction:'You’ll pull the high-bank line next.'},
  missed:{label:'late arrival',intact:false,prediction:'You’ll go looking for the ranger next.'}
};

export class FordRescue {
  constructor(mechanics,pipeline,models,story,rescue,bag,notice,sound){
    Object.assign(this,{mechanics,pipeline,models,story,rescue,bag,notice,sound});
    const x=trailX(startZ)+.45;
    this.start=groundPoint(x,startZ);
    this.state=bag.records.has(key)?'finished':'waiting';
    const radio=station(mechanics,0,groundPoint(x+2.6,9.2),'Listen to the ford emergency radio',()=>this.startCall(),
      {color:0x6c7561});
    const radioModel=pipeline.prepare(models.receiver,{position:[0,.945,0],scale:.68});
    const radioBase=new T.Box3().setFromObject(radioModel).min.y;
    if(Number.isFinite(radioBase))radioModel.position.y+=.945-radioBase;
    radio.body.add(radioModel);
    this.radio=radio.point;
    this.anchorPost=groundPoint(x+4.65,6.65);
    this.high=station(mechanics,0,this.anchorPost,'Pull the high-bank tow line',
      ()=>this.resolve('high'),{color:0x9a723e}).point;

    const {root}=person(0x62536c);
    this.woman=root;
    this.womanSite=groundPoint(x-2.8,4.05);
    root.position.copy(this.womanSite);
    root.visible=false;
    mechanics.scenes[0].add(root);
    this.womanTarget=mechanics.world.createCollider(R.ColliderDesc.ball(.43)
      .setTranslation(this.womanSite.x,this.womanSite.y+.99,this.womanSite.z)
      .setSensor(true).setCollisionGroups((128<<16)|2));
    this.womanTarget.setEnabled(false);
    mechanics.tag(this.womanTarget,{name:'Help the woman clear the tow rope',action:()=>this.resolve('foot')});
  }

  startCall(){
    if(this.story.state<4)return 'The emergency channel is quiet. Follow Mom’s trail first.';
    if(this.state==='finished')return 'The conflicting dispatch is saved in your Field Bag.';
    if(this.state==='moving')return '“Cut the rope!” Her voice answers through the radio: “Pull it harder.”';
    this.state='moving';
    this.elapsed=0;
    const m=this.mechanics;
    const wagon=m.car.visual.clone(true);
    wagon.traverse(node=>{
      if(!node.isMesh)return;
      node.geometry=node.geometry.clone();node.material=node.material.clone();
    });
    this.cart=m.dynamic({position:this.start.clone().add(new T.Vector3(0,.62,0)).toArray(),
      kind:'prop',name:'Runaway rescue wagon',visual:wagon,
      shape:R.ColliderDesc.cuboid(.84,.49,1.48).setDensity(7).setFriction(.18)
        .setFrictionCombineRule(R.CoefficientCombineRule.Min)});
    this.cart.body.setEnabledRotations(false,false,false,true);
    m.tag(this.cart.collider,{name:'Runaway rescue wagon',action:()=> 'Aim the grapple at the brass bracket on the back.'});
    const hardware=this.pipeline.prepare(this.models.fordRescueBracket,{position:[0,.5,1.55],yaw:Math.PI});
    wagon.add(hardware);
    const ring=new T.Mesh(new T.TorusGeometry(.145,.023,8,16),
      new T.MeshStandardMaterial({color:0xd5a651,metalness:.62,roughness:.36}));
    ring.position.set(0,.64,1.65);wagon.add(ring);
    const hook=m.world.createCollider(R.ColliderDesc.ball(.23).setTranslation(0,.64,1.65)
      .setSensor(true).setCollisionGroups((128<<16)|2),this.cart.body);
    m.tag(hook,{name:'Grapple the rescue wagon bracket',onGrapple:()=>this.resolve('grapple')});
    this.hook=hook;
    this.load=m.crate(this.start.clone().add(new T.Vector3(0,1.23,1.04)).toArray());
    this.load.body.setEnabled(false);
    wagon.add(this.load.visual);
    this.load.visual.position.set(0,.72,1.03);
    this.woman.visible=true;
    this.womanTarget.setEnabled(true);
    this.sound(this.radio);
    return 'The wagon starts to slip. The woman yells, “Cut the rope!” On the radio, her voice insists, “Pull it harder.”';
  }

  resolve(route){
    if(this.state!=='moving')return 'There’s no moving wagon to stop. Check the emergency radio.';
    const m=this.mechanics;
    const result=routes[route];
    this.state='finished';
    const position=vec(this.cart.body.translation());
    const velocity=vec(this.cart.body.linvel());
    this.cart.body.setLinvel({x:0,y:0,z:0},true);
    this.cart.body.sleep();
    if(result.intact){
      const fixed=this.anchorPost.clone().add(new T.Vector3(0,.9,0));
      const start=position.clone().add(new T.Vector3(0,.64,1.65));
      const length=start.distanceTo(fixed);
      const anchor=m.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(...fixed.toArray()));
      m.world.createImpulseJoint(R.JointData.rope(length,{x:0,y:.64,z:1.65},{x:0,y:0,z:0}),
        this.cart.body,anchor,false);
      const geometry=new T.BufferGeometry().setFromPoints([start,fixed]);
      m.scenes[0].add(new T.Line(geometry,new T.LineBasicMaterial({color:0xe3a452})));
    }
    this.hook.setEnabled(false);
    this.woman.visible=false;
    this.womanTarget.setEnabled(false);
    const worldLoad=this.load.visual.getWorldPosition(new T.Vector3());
    m.scenes[0].add(this.load.visual);
    this.load.body.setTranslation(worldLoad,true);
    this.load.body.setEnabled(true);
    if(!result.intact){
      this.load.body.setLinvel(velocity,true);
      m.fracture(this.load);
    }
    this.load=null;
    this.bag.record(key,'Conflicting ford dispatch',
      'The woman said cut the rope. Her voice on the radio said pull harder, then predicted the next move: “'+(this.prediction??result.prediction)+'” Route: '+result.label+'. Rescue load: '+(result.intact?'intact.':'broken.'));
    this.sound(position);
    const outcome=result.intact?'The wagon stops with the rescue load intact.':
      'The woman gets clear, but the rescue load breaks.';
    return outcome+' You saved the radio call. Meet her at Foxglove Camp.';
  }

  tick(dt){
    if(this.state!=='moving'||this.story.area!==0)return;
    this.elapsed+=dt;
    if(!this.prediction&&this.elapsed>=.65){
      const player=this.mechanics.walker.current;
      const hook=vec(this.cart.body.translation()).add(new T.Vector3(0,.64,1.65));
      const nearest=[['grapple',hook],['high',this.high],['foot',this.womanSite]]
        .reduce((a,b)=>a[1].distanceToSquared(player)<b[1].distanceToSquared(player)?a:b);
      this.prediction=routes[nearest[0]].prediction;
      this.sound(this.radio);
      this.notice('The radio answers in her voice. “'+this.prediction+'”');
    }
    const body=this.cart.body;
    const speed=body.linvel();
    if(speed.z<-2.2)body.setLinvel({x:speed.x,y:speed.y,z:-2.2},true);
    else body.applyImpulse({x:0,y:0,z:-Math.max(0,2.2+speed.z)*dt*body.mass()*1.6},true);
    if(this.load){
      // This load has no active body while strapped in. Keep its rack-local transform.
      this.load.visual.position.set(0,.72,1.03);
      this.load.visual.quaternion.identity();
    }
    if(this.elapsed>=12||body.translation().z<.4)this.notice(this.resolve('missed'));
  }

  objective(){
    if(this.story.area!==0||this.story.state<4||this.state==='finished')return null;
    if(this.state==='waiting')return this.rescue.stage===0?
      {text:'The Rescue That Happens Twice · Check the ford emergency radio',target:this.radio}:null;
    return {text:'Stop the wagon · Hook its bracket, help the woman, or pull the high-bank line',
      target:vec(this.cart.body.translation())};
  }
}
