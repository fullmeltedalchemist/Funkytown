import * as T from 'three';
import R from 'rapier';
export const STEP=1/60;
export class Walker {
  velocity=new T.Vector3();
  previous=new T.Vector3();
  current=new T.Vector3();
  jumpBuffer=0;
  grace=0;
  constructor(world,spawn){
    this.world=world;this.spawn=spawn;
    this.body=world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(...spawn));
    this.collider=world.createCollider(R.ColliderDesc.capsule(.51,.30),this.body);
    this.control=world.createCharacterController(.025);
    this.control.enableAutostep(.39,.28,false);
    this.control.enableSnapToGround(.29);
    this.control.setMaxSlopeClimbAngle(Math.PI*.29);
    this.control.setMinSlopeSlideAngle(Math.PI*.35);
    this.current.set(...spawn);this.previous.copy(this.current);
  }
  teleport(position){
    this.spawn=position;
    this.current.set(...position);this.previous.copy(this.current);
    this.velocity.set(0,0,0);this.grace=this.jumpBuffer=0;
    this.body.setTranslation(this.current,true);
    this.body.setNextKinematicTranslation(this.current);
  }
  step({x,z,jump,sprint,pull},yaw,events){
    const grounded=this.control.computedGrounded();
    this.grace=grounded?.105:Math.max(0,this.grace-STEP);
    this.jumpBuffer=jump?.13:Math.max(0,this.jumpBuffer-STEP);
    const wish=new T.Vector3(x,0,-z).clampLength(0,1).applyAxisAngle(new T.Vector3(0,1,0),yaw);
    const speed=sprint?6.2:4.35;
    wish.multiplyScalar(speed);
    const blend=1-Math.exp(-(grounded?(wish.lengthSq()?24:33):7)*STEP);
    this.velocity.x=T.MathUtils.lerp(this.velocity.x,wish.x,blend);
    this.velocity.z=T.MathUtils.lerp(this.velocity.z,wish.z,blend);
    if(this.grace&&this.jumpBuffer){
      this.velocity.y=4.85;this.grace=this.jumpBuffer=0;
    }else if(grounded&&this.velocity.y<=0)this.velocity.y=-1.9;
    else this.velocity.y=Math.max(-26,this.velocity.y-15.8*STEP);
    if(pull){
      const delta=pull.clone().sub(this.current);
      const distance=delta.length();
      if(distance>1) this.velocity.lerp(delta.setLength(Math.min(14,distance*3)),.19);
    }
    this.control.computeColliderMovement(this.collider,this.velocity.clone().multiplyScalar(STEP));
    const movement=this.control.computedMovement();
    if(this.velocity.y>0&&movement.y<this.velocity.y*STEP*.5)this.velocity.y=0;
    this.body.setNextKinematicTranslation(this.current.clone().add(movement));
    this.previous.copy(this.current);
    this.world.step(events);
    this.current.copy(this.body.translation());
    if(this.current.y<-14||Math.abs(this.current.x-this.spawn[0])>65||Math.abs(this.current.z)>61){
      this.teleport(this.spawn);
    }
  }
}
