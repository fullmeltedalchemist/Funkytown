import * as T from 'three';
import R from 'rapier';
import {height} from './terrain.js';
import {vec} from './mechanics.js';

const sites=[[-14,19],[18,9],[-10,-17]];
const echoSite=[-12,4.8];

export class Wildlife {
  constructor(mechanics,pipeline,model,bag,notice){
    Object.assign(this,{mechanics,bag,notice});
    this.animals=[...sites,echoSite].map(([x,z],index)=>{
      const echo=index===sites.length;
      const visual=pipeline.prepare(model,{position:[x,height(x,z),z],scale:echo?1.38:1});
      const home=visual.position.clone();
      visual.traverse(node=>{
        if(!node.isMesh)return;
        node.castShadow=!echo;node.receiveShadow=true;
        if(echo){
          node.material=node.material.clone();
          node.material.color.setHex(0x8edcc5);
          node.material.emissive.setHex(0x28675c);
          node.material.transparent=true;node.material.opacity=.42;node.material.depthWrite=false;
        }
      });
      mechanics.scenes[0].add(visual);
      const body=mechanics.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(x,home.y,z));
      const collider=mechanics.world.createCollider(R.ColliderDesc.ball(.24).setTranslation(0,.23,0)
        .setSensor(true).setCollisionGroups((1<<16)|10),body);
      const animal={visual,home,body,collider,echo,state:'alive',phase:index*1.7};
      mechanics.onImpact.set(collider.handle,()=>this.hit(animal));
      mechanics.tag(collider,{name:echo?'Observe the Echo cottontail':'Observe the cottontail',action:()=>this.use(animal)});
      return animal;
    });
  }
  hit(animal){
    if(animal.state!=='alive')return;
    if(animal.echo){
      animal.state='gone';animal.wait=32;
      animal.visual.visible=false;
      animal.collider.setEnabled(false);
      this.bag.record('echo-cottontail','The cottontail that vanished',
        'The Echo scattered after impact and left no carcass.','Evidence');
      this.notice('The pale cottontail flickers out. Nothing falls.');
    }else{
      animal.state='down';
      animal.visual.rotation.z=1.42;
      this.mechanics.fixed.get(animal.collider.handle).name='Collect cottontail meat';
    }
  }
  use(animal){
    if(animal.echo){
      this.bag.record('echo-cottontail','The cottontail that vanished',
        'A pale cottontail moved before your footsteps reached it.','Evidence');
      return 'The cottontail turns a beat before you step.';
    }
    if(animal.state!=='down')return 'It tenses, ready to bolt for the brush.';
    if(this.bag.records.has('cottontail-meat'))return 'There’s already a portion in your field bag. Cook or use it first.';
    this.bag.record('cottontail-meat','Cottontail meat','Cook this at the Foxglove Camp skillet.','Cargo');
    animal.state='gone';animal.wait=45;
    animal.visual.visible=false;
    animal.collider.setEnabled(false);
    return 'Meat packed. Cook it at the camp skillet.';
  }
  tick(dt){
    const m=this.mechanics;
    if(m.area!==0)return;
    const player=m.driving?vec(m.car.body.translation()):m.walker.current;
    for(const animal of this.animals){
      const {visual,home,body,collider}=animal;
      if(animal.state==='gone'){
        animal.wait-=dt;
        if(animal.wait>0||home.distanceTo(player)<10)continue;
        animal.state='alive';visual.visible=true;visual.rotation.z=0;
        visual.position.copy(home);
        body.setTranslation(home,true);body.setNextKinematicTranslation(home);
        collider.setEnabled(true);
        m.fixed.get(collider.handle).name=animal.echo?'Observe the Echo cottontail':'Observe the cottontail';
      }
      if(animal.state!=='alive')continue;
      animal.phase+=dt;
      const position=visual.position;
      const toPlayer=player.clone().sub(position);toPlayer.y=0;
      const toHome=home.clone().sub(position);toHome.y=0;
      const fleeing=toPlayer.lengthSq()<23&&toHome.lengthSq()<72;
      const direction=fleeing?toPlayer.normalize().negate():
        toHome.lengthSq()>7?toHome.normalize():new T.Vector3(Math.sin(animal.phase*.7),0,Math.cos(animal.phase*.7));
      const speed=fleeing?3.2:.51;
      position.addScaledVector(direction,speed*dt);
      position.y=height(position.x,position.z)+(fleeing?Math.abs(Math.sin(animal.phase*13))*.16:0);
      visual.rotation.y=Math.atan2(direction.x,direction.z);
      body.setNextKinematicTranslation(position);
    }
  }
}
