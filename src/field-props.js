import * as T from 'three';
import R from 'rapier';
import {part,vec} from './mechanics.js';
import {cabinX,cabinZ,plots,height} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const props={
  water:{model:'waterJug',name:'Glass water jug',size:[.56,.72,.56],minY:-.34,impactLimit:4.2},
  empty:{model:'waterJug',name:'Empty glass jug',size:[.56,.72,.56],minY:-.34,impactLimit:3.6},
  fuel:{model:'fuelCan',name:'Red fuel can',size:[.49,.36,.7],minY:-.34,impactLimit:Infinity}
};

export class FieldProps {
  constructor(mechanics,pipeline,models,rescue,bag,notice,playSound){
    Object.assign(this,{mechanics,pipeline,models,notice,playSound});
    this.sites=[];
    this.bursts=[];
    const supply=plots[1];
    this.rack(cabinX+7.1,cabinZ+4.45,'water');
    this.rack(supply.x-4.9,supply.z+.6,'water');
    this.rack(-4.3,10.2,'water');
    this.rack(supply.x-4.9,supply.z-1.2,'fuel');
    this.rack(supply.x-4.9,supply.z-2.7,'fuel');
    this.rack(cabinX+6.7,cabinZ-1.8,'fuel');
    this.rack(-3.1,10.2,'empty');

    const ranger=mechanics.fixed.get(rescue.rangerSensor.handle);
    ranger.acceptName='Give the ranger the water jug';
    ranger.accept=item=>{
      if(item.fieldProp!=='water')return 'The ranger asked for a water jug.';
      if(rescue.story.state<4)return 'Set the jug on the camp rack until the ranger is back.';
      if(bag.records.has('pump-water-delivery'))return '“I’ve got enough water. Keep that one for the road.”';
      mechanics.remove(item);
      bag.record('pump-water-delivery','Water for the ranger',
        'The ranger heard the abandoned pump start after the town cut its power. Bring fuel to the creek pump and listen for the second start.');
      return '“Thanks. I heard the abandoned pump start twice with its power cut. Fuel it up and listen for the second start.”';
    };
    const pump=station(mechanics,0,groundPoint(-3.7,-8.8),'Listen at the creek pump',()=>{
      if(!bag.records.has('creek-pump-fueled'))return 'The pump is dry. Its service tag calls for a red fuel can.';
      if(bag.records.has('creek-pump-echo'))return 'The second start still arrives after you turn away.';
      if(this.echoDelay>0)return 'Wait. The pump is quiet again.';
      this.echoDelay=1.3;
      this.pulse(pump.point,0xffc575,.55);
      this.playSound('pump',pump.point);
      return 'The stand shakes as the motor starts. Wait for the noise to die down.';
    },{color:0x56685e});
    const relay=station(mechanics,0,groundPoint(-3.7,6.9),'Inspect the silent relay by the ford',()=>{
      if(bag.records.has('creek-pump-echo'))return 'No vibration. No moving parts. Only the copied sound.';
      if(!this.heardEcho)return 'The relay is cold. Its cable has been cut.';
      bag.record('creek-pump-echo','The second start',
        'The pump shook its stand on startup. The cut relay across the bank repeated the sound without moving. The Echo copies sounds without their physical effects.');
      this.heardEcho=false;
      return 'The relay’s cable is cut and its casing is still. Something copied the sound of the pump without starting it.';
    },{color:0x4f6869});
    this.pumpPoint=pump.point;
    this.echoPoint=relay.point;
    mechanics.fixed.get(relay.collider.handle).contact=()=>({
      strength:0,
      message:this.heardEcho?'The microphone reads zero vibration. The sound came through the air.':
        'The microphone reads zero vibration. The relay casing is still.'
    });
    const pumpModel=pipeline.prepare(models.transferPump,{position:[0,.944,0]});
    pumpModel.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true;});
    pump.body.add(pumpModel);
    const refill=mechanics.fixed.get(pump.collider.handle);
    refill.contact=()=>this.echoDelay>0?{
      strength:.82,message:'Strong contact signal. You can feel the motor shake its mount.'
    }:{strength:0,message:'The pump is stationary. Try sampling it right after startup.'};
    refill.acceptName='Fuel the creek pump';
    refill.accept=item=>{
      if(item.fieldProp!=='fuel')return 'This connection takes a red fuel can.';
      if(bag.records.has('creek-pump-fueled'))return 'The creek pump already has fuel.';
      mechanics.remove(item);
      bag.record('creek-pump-fueled','Creek pump primed','Use the pump again to compare its start with the sound from across the bank.');
      return 'Fuel delivered. Use the pump again to listen.';
    };
  }

  rack(x,z,type){
    const scene=this.mechanics.scenes[0],y=height(x,z);
    const top=y+.44;
    this.mechanics.staticBox([.86,.08,.65],[x,top-.04,z],0x775437);
    for(const dx of [-.34,.34])for(const dz of [-.23,.23]){
      const base=Math.min(top-.1,height(x+dx,z+dz));
      part(scene,[.08,top-base,.08],[x+dx,(base+top)/2,z+dz],0x614830,.009);
    }
    const slot={type,position:[x,top-props[type].minY+.015,z],wait:0};
    this.sites.push(slot);
    this.stock(slot);
  }

  stock(slot){
    const {type,position}=slot;
    const {model,name,size,impactLimit}=props[type];
    const m=this.mechanics;
    const asset=this.pipeline.loose(this.models[model],1);
    if(type==='empty'){
      asset.shape.setDensity(.34);
      asset.visual.traverse(node=>{
        if(node.isMesh&&node.material.name==='Creek water behind glass')node.visible=false;
      });
    }
    const item=m.dynamic({...asset,position,home:new T.Vector3(...position),name,size,area:0,impactLimit,
      breakEffect:(origin,velocity)=>type==='fuel'?this.blast(origin):this.shatter(origin,velocity,type==='water')});
    if(type!=='fuel'){
      item.floatSurface=-1.38;
      item.floatLift=type==='empty'?54:21;
    }
    item.fieldProp=type;
    slot.item=item;
  }

  shatter(origin,velocity,filled){
    const m=this.mechanics;
    this.playSound('glass');
    for(let i=0;i<9;i++){
      const a=i*2.399;
      const direction=new T.Vector3(Math.cos(a),.27+(i%3)*.19,Math.sin(a));
      const shard=new T.Mesh(new T.TetrahedronGeometry(.085+(i%3)*.012),
        new T.MeshStandardMaterial({color:0x81d4c7,transparent:true,opacity:.55,roughness:.18,metalness:.25}));
      shard.scale.set(.48,1.4,.33);
      const piece=m.dynamic({position:origin.clone().addScaledVector(direction,.19).toArray(),
        name:'Bottle glass shard',area:0,visual:shard,life:7,shape:R.ColliderDesc.ball(.043)});
      piece.body.setLinvel(direction.multiplyScalar(3.2).addScaledVector(velocity,.23),true);
    }
    for(let i=0;filled&&i<22&&m.drops.length<96;i++){
      const a=i*2.399;
      const direction=new T.Vector3(Math.cos(a),.35+(i%4)*.19,Math.sin(a));
      const drop=m.dynamic({position:origin.clone().addScaledVector(direction,.13).toArray(),kind:'water',area:0,
        life:1.8,shape:R.ColliderDesc.ball(.055).setDensity(12)});
      drop.body.setLinvel(direction.multiplyScalar(2.9).addScaledVector(velocity,.3),true);
      m.drops.push(drop);
    }
    this.pulse(origin,0x89cacf,.32);
  }

  blast(origin){
    const m=this.mechanics;
    this.pulse(origin,0xffa43d,.51);
    this.playSound('blast');
    for(const item of [...m.items.values()]){
      if(item.area!==0||item.kind!=='prop'||item===m.cargo||item===m.carried)continue;
      const direction=vec(item.body.translation()).sub(origin);
      const distance=direction.length();
      if(distance>3.7||distance<.04)continue;
      const hit=m.ray(origin,direction.clone().normalize(),distance);
      if(hit&&hit.collider.handle!==item.collider.handle)continue;
      if(item.fieldProp==='fuel'&&distance<2.15){
        m.fracture(item);
      }else{
        direction.y+=.75;
        item.body.applyImpulse(direction.normalize().multiplyScalar((3.8-distance)*2.3*item.body.mass()),true);
      }
    }
  }

  pulse(origin,color,duration){
    const scene=this.mechanics.scenes[0];
    const ball=new T.Mesh(new T.IcosahedronGeometry(1,1),
      new T.MeshBasicMaterial({color,transparent:true,opacity:.75,depthWrite:false,blending:T.AdditiveBlending}));
    ball.position.copy(origin);
    const light=new T.PointLight(color,18,7,2);
    light.position.copy(origin);
    scene.add(ball,light);
    this.bursts.push({ball,light,duration,left:duration});
  }

  objective(){
    const m=this.mechanics;
    if(!this.heardEcho||m.area!==0)return null;
    const player=m.driving?m.car.body.translation():m.walker.current;
    const nearby=[this.pumpPoint,this.echoPoint].some(point=>Math.hypot(player.x-point.x,player.z-point.z)<14);
    return nearby?{text:'Optional · Find the source of the second pump start',target:this.echoPoint}:null;
  }

  tick(dt){
    if(this.echoDelay>0){
      this.echoDelay-=dt;
      if(this.echoDelay<=0){
        this.heardEcho=true;
        this.pulse(this.echoPoint,0x83cbcf,.75);
        this.playSound('echo',this.echoPoint);
        this.notice('The pump sits still. The same sound answers across the creek.');
      }
    }
    const m=this.mechanics;
    for(const site of this.sites){
      if(m.items.has(site.item.collider.handle)){site.wait=0;continue;}
      site.wait+=dt;
      const [x,,z]=site.position;
      if(site.wait>19&&(m.area!==0||Math.hypot(m.walker.current.x-x,m.walker.current.z-z)>7))this.stock(site);
    }
    this.bursts=this.bursts.filter(burst=>{
      burst.left-=dt;
      const t=1-burst.left/burst.duration;
      burst.ball.scale.setScalar(.14+t*1.6);
      burst.ball.material.opacity=Math.max(0,.56*(1-t));
      burst.light.intensity=Math.max(0,22*(1-t));
      if(burst.left>0)return true;
      burst.ball.removeFromParent();burst.light.removeFromParent();
      burst.ball.material.dispose();burst.ball.geometry.dispose();
      return false;
    });
  }
}
