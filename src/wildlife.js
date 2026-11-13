import * as T from 'three';
import R from 'rapier';
import {height} from './terrain.js';
import {vec} from './mechanics.js';
import {groundPoint,station} from './field-stations.js';

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
    const ordinary=this.animals[0];
    const trail=groundPoint(ordinary.home.x+2.4,ordinary.home.z+.8);
    const prints=new T.MeshBasicMaterial({color:0x594936,polygonOffset:true,polygonOffsetFactor:-1});
    for(let i=0;i<5;i++){
      const x=trail.x-i*.35,z=trail.z+(i%2)*.15;
      const print=new T.Mesh(new T.CircleGeometry(.07,8),prints);
      print.position.set(x,height(x,z)+.02,z);
      print.rotation.x=-Math.PI/2;
      mechanics.scenes[0].add(print);
    }
    const setBait=bait=>{
      if(ordinary.state!=='alive')return 'Fresh tracks lead to the brush. Check again after the rabbit returns.';
      if(ordinary.bait)return 'Bait is down. Back away from the station and watch the tracks.';
      if(!bag.records.has(bait))return bait==='cottontail-meat'?
        'The bait hook is empty. Bring a portion of meat to set it here.':
        'Paired prints lead into the brush. Bring camp ingredients or bait from the refilled tin.';
      bag.forget(bait);
      ordinary.bait=trail;
      ordinary.baitTime=45;
      return 'Bait set. Give the cottontail room to follow the tracks.';
    };
    station(mechanics,0,trail,'Inspect cottontail tracks and set pantry bait',
      ()=>setBait(bag.records.has('cottontail-lure')?'cottontail-lure':'camp-ingredients'),{color:0x766047});
    station(mechanics,0,groundPoint(trail.x+.45,trail.z+1.45),'Set meat bait by the cottontail trail',
      ()=>setBait('cottontail-meat'),{color:0x826052});
    const home=this.animals.at(-1).home;
    this.tracks=new T.Group();
    const print=new T.MeshBasicMaterial({color:0x75ffd2,transparent:true,opacity:.73,depthWrite:false});
    for(let i=0;i<6;i++){
      const x=home.x-1.2-i*.36,z=home.z+.6+(i%2)*.23;
      const mark=new T.Mesh(new T.CircleGeometry(.087,10),print);
      mark.scale.y=1.65;
      mark.rotation.x=-Math.PI/2;
      mark.position.set(x,height(x,z)+.045,z);
      this.tracks.add(mark);
    }
    this.tracks.visible=false;
    mechanics.scenes[0].add(this.tracks);
  }
  photograph(camera){
    const m=this.mechanics;
    const echo=this.animals.at(-1);
    if(m.area!==0)return '';
    const hit=m.aim(camera,16);
    if(echo.state==='alive'&&hit?.collider.handle===echo.collider.handle){
      this.bag.record('echo-cottontail-photo','Photo of the Echo cottontail',
        'The field camera caught a pale cottontail before its outline dissolved.');
      return 'Echo cottontail photographed. Evidence saved.';
    }
    const direction=camera.getWorldDirection(new T.Vector3());
    if(!this.tracks.visible||!this.tracks.children.some(mark=>{
      const offset=mark.position.clone().sub(camera.position);
      return offset.length()<10&&offset.normalize().dot(direction)>.975;
    }))return '';
    this.bag.record('echo-cottontail-tracks','Tracks lit by a flare',
      'Six prints stopped short of the creek. No return prints followed them.');
    return 'Flare-lit tracks photographed. Evidence saved.';
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
  tick(dt,noise){
    const m=this.mechanics;
    if(m.area!==0)return;
    const echo=this.animals.at(-1);
    this.tracks.visible=[...m.items.values()].some(item=>{
      if(!item.signalFlare||item.area!==0)return false;
      const p=item.body.translation();
      return Math.hypot(p.x-echo.home.x,p.z-echo.home.z)<7&&Math.abs(p.y-echo.home.y)<5;
    });
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
      if(animal.bait&&(animal.baitTime-=dt)<=0)animal.bait=null;
      animal.phase+=dt;
      const position=visual.position;
      const threat=noise&&noise.distanceToSquared(position)<35?noise:player;
      const toPlayer=threat.clone().sub(position);toPlayer.y=0;
      const toHome=home.clone().sub(position);toHome.y=0;
      const fleeing=toPlayer.lengthSq()<23&&toHome.lengthSq()<72;
      const toBait=animal.bait?.clone().sub(position).setY(0);
      if(!fleeing&&toBait?.lengthSq()<.08){
        animal.bait=null;
        this.bag.record('cottontail-track-study','Cottontail track study',
          'A cottontail followed the tracks back to the bait once the trail was quiet.');
      }
      const direction=fleeing?toPlayer.normalize().negate():
        toBait&&animal.bait?toBait.normalize():
        toHome.lengthSq()>7?toHome.normalize():new T.Vector3(Math.sin(animal.phase*.7),0,Math.cos(animal.phase*.7));
      const speed=fleeing?3.2:.51;
      position.addScaledVector(direction,speed*dt);
      position.y=height(position.x,position.z)+(fleeing?Math.abs(Math.sin(animal.phase*13))*.16:0);
      visual.rotation.y=Math.atan2(direction.x,direction.z);
      body.setNextKinematicTranslation(position);
    }
  }
}
