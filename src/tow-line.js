import * as T from 'three';
import R from 'rapier';
import {vec} from './mechanics.js';

export class TowLine {
  constructor(mechanics){
    this.mechanics=mechanics;
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));
    this.visual=new T.Line(geo,new T.LineBasicMaterial({color:0xf3b45b}));
    this.visual.frustumCulled=false;this.visual.visible=false;
    mechanics.scenes[0].add(this.visual);
  }
  select(camera){
    const m=this.mechanics;
    if(m.area!==0||m.carried)return 'Stand on foot with both hands free to rig the tow line.';
    if(m.driving){
      if(!this.joint||(this.first.item!==m.car&&this.second.item!==m.car))return 'Attach the tow line to the wagon before using its winch.';
      this.reeling=!this.reeling;
      this.reelTimer=0;
      return this.reeling?'Winch reeling in. Press Rig again to stop.':'Winch stopped.';
    }
    if(this.joint){this.clear();return 'Tow line released.';}
    const hit=m.aim(camera,12);
    if(!hit||hit.collider.isSensor())return 'Aim at the wagon, a loose prop, or a solid surface.';
    const item=m.items.get(hit.collider.handle);
    const point=camera.position.clone().addScaledVector(camera.getWorldDirection(new T.Vector3()),hit.timeOfImpact);
    if(!this.first){
      if(!item||!['car','prop'].includes(item.kind)||item.name==='Burning signal flare')return 'Choose the wagon or a loose prop for the first hook.';
      this.first={item,point:item.towPoint??this.localPoint(item.body,point)};
      return 'First hook attached. Aim at a second object or fixed surface and press Rig again.';
    }
    const first=this.first;
    if(!m.items.has(first.item.collider.handle)){this.clear();return 'The first anchor is gone. Choose another.';}
    if(item===first.item)return 'Choose a different anchor.';
    const targetBody=hit.collider.parent();
    if(!item&&targetBody&&!targetBody.isFixed())return 'Choose a loose prop or fixed surface. The parade float and archive truck move on their own.';
    const start=this.worldPoint(first.item.body,first.point);
    const end=item?.towPoint?this.worldPoint(item.body,item.towPoint):point;
    const length=start.distanceTo(end);
    if(length>12||length<.35)return 'Pick an anchor between half a meter and twelve meters away.';
    if(item&&item.name==='Burning signal flare')return 'The flare is too hot for a line.';
    const body=item?.body??m.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(...point.toArray()));
    this.second={body,item,point:item?.towPoint??this.localPoint(body,point)};
    this.length=length+.18;
    this.joint=m.world.createImpulseJoint(R.JointData.rope(this.length,first.point,this.second.point),
      first.item.body,body,true);
    this.visual.visible=true;
    return 'Tow line rigged. Pull a load or use it as a safety tether. Rig releases it.';
  }
  localPoint(body,point){
    return point.clone().sub(vec(body.translation())).applyQuaternion(new T.Quaternion().copy(body.rotation()).invert());
  }
  worldPoint(body,point){
    return point.clone().applyQuaternion(new T.Quaternion().copy(body.rotation())).add(vec(body.translation()));
  }
  taut=false;
  holdWinchBrake(active){
    if(Boolean(this.brakedCar)===active)return;
    const car=this.brakedCar??this.mechanics.car.body;
    car.setEnabledTranslations(!active,true,!active,true);
    this.brakedCar=active?car:null;
  }
  clear(){
    const world=this.mechanics.world;
    this.holdWinchBrake(false);
    if(this.joint?.isValid())world.removeImpulseJoint(this.joint,true);
    if(this.second&&!this.second.item)world.removeRigidBody(this.second.body);
    this.joint=this.first=this.second=null;
    this.reeling=this.taut=false;
    this.visual.visible=false;
  }
  tick(dt=0,movement){
    if(!this.first)return;
    const m=this.mechanics;
    if(m.area!==0||this.first.item===m.cargo||(m.cargo&&this.second?.item===m.cargo)||
      !m.items.has(this.first.item.collider.handle)||
      (this.second?.item&&!m.items.has(this.second.item.collider.handle))){
      this.clear();
      return;
    }
    if(!this.joint)return;
    const winding=this.reeling&&m.driving;
    // A stationary driver can hold the wagon on its parking brake while the spool pulls.
    const speed=m.car?.body.linvel();
    const still=speed&&Math.hypot(speed.x,speed.z)<.35;
    this.holdWinchBrake(Boolean(winding&&Math.abs(movement?.z??0)<.15&&(this.brakedCar||still)));
    if(winding){
      this.reelTimer+=dt;
      if(this.reelTimer>=.1&&this.length>.68){
        this.reelTimer-=.1;
        this.length=Math.max(.68,this.length-.085);
        m.world.removeImpulseJoint(this.joint,true);
        this.joint=m.world.createImpulseJoint(R.JointData.rope(this.length,this.first.point,this.second.point),
          this.first.item.body,this.second.body,true);
      }
    }else this.reeling=false;
    const start=this.worldPoint(this.first.item.body,this.first.point);
    const end=this.worldPoint(this.second.body,this.second.point);
    const distance=start.distanceTo(end);
    if(distance>this.length+1.15){this.clear();return;}
    this.taut=distance>=this.length-.12;
    this.visual.material.color.setHex(this.taut?0xffe2a6:0xb3976e);
    const points=this.visual.geometry.attributes.position;
    points.setXYZ(0,start.x,start.y,start.z);points.setXYZ(1,end.x,end.y,end.z);
    points.needsUpdate=true;
  }
}
