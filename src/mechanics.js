import {inCreek} from './terrain.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {spillwayStream} from './effects.js';
import * as T from 'three';
import R from 'rapier';
import {STEP} from './walker.js';

export const vec=(p)=>new T.Vector3(p.x,p.y,p.z);
const material=(color)=>new T.MeshStandardMaterial({color,roughness:.72});
export function part(root,size,pos,color,round=0){
  const geometry=round?new RoundedBoxGeometry(...size,2,round):new T.BoxGeometry(...size);
  const mesh=new T.Mesh(geometry,material(color));
  mesh.position.set(...pos);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
  return mesh;
}
const bits={world:1,player:2,prop:4,round:8,water:16,car:32,held:64};
const groups=(member,mask)=>member<<16|mask;
const all=65535;
const roundGeometry=new T.CapsuleGeometry(.008,.17,4,8).rotateX(Math.PI/2);
const roundMaterial=new T.MeshBasicMaterial({color:0xffdfa6});
const fluidGeometry=new T.SphereGeometry(.022,7,5).scale(.62,.62,1.75);
const fluidMaterial=new T.MeshBasicMaterial({color:0xd2e6df,transparent:true,opacity:.43,depthWrite:false});

export class Mechanics {
  items=new Map();
  onImpact=new Map();
  fixed=new Map();
  drops=[];
  carried=null;
  anchor=null;
  driving=false;
  cooldown=0;
  creekFlow=.76;
  constructor(world,walker,scene,realm){
    this.world=world;this.walker=walker;this.scenes=[scene,realm];this.area=0;
    this.events=new R.EventQueue(true);
    walker.collider.setCollisionGroups(groups(bits.player,all&~(bits.held|bits.round)));
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.BufferAttribute(new Float32Array(6),3));
    this.line=new T.Line(geo,new T.LineBasicMaterial({color:0xffd498}));
    this.line.frustumCulled=false;this.line.visible=false;scene.add(this.line);
    this.fluid=new T.InstancedMesh(fluidGeometry,fluidMaterial,96);
    this.fluid.count=0;this.fluid.frustumCulled=false;scene.add(this.fluid);
    this.stream=spillwayStream();
    this.flowUntil=0;
    scene.add(this.stream);
  }
  staticBox(size,position,color,area=0){
    const visual=part(this.scenes[area],size,position,color);
    const collider=this.world.createCollider(R.ColliderDesc.cuboid(...size.map(n=>n*.5)).setTranslation(...position));
    return {visual,collider};
  }
  tag(collider,interaction){this.fixed.set(collider.handle,interaction);}
  dynamic({position,shape,visual,kind='prop',name,size,life=Infinity,area=this.area,home=null,breakEffect=null,impactLimit=6.5}){
    const body=this.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(...position).setCcdEnabled(kind!=='water'));
    const bit=bits[kind];
    const mask=kind==='round'?bits.world|bits.prop|bits.car:kind==='water'?all&~(bits.water|bits.round):all;
    shape.setCollisionGroups(groups(bit,mask));
    if(kind==='round'||size)shape.setActiveEvents(R.ActiveEvents.COLLISION_EVENTS);
    const collider=this.world.createCollider(shape,body);
    const item={body,collider,visual,kind,name,size,life,area,mask,home,breakEffect,impactLimit,speed:0};
    this.items.set(collider.handle,item);
    if(visual){visual.position.set(...position);this.scenes[area].add(visual);}
    return item;
  }
  crate(position,area=0){
    const size=[.65,.59,.61],visual=new T.Group();
    for(let i=0;i<4;i++){
      part(visual,[.65,.137,.61],[0,-.219+i*.146,0],[0x896142,0xa77d55,0x97704b,0xb68b62][i],.014);
    }
    for(const x of [-.24,.24])part(visual,[.075,.60,.645],[x,0,0],0x806246,.014);
    const iron=new T.MeshStandardMaterial({color:0x403c36,roughness:.67,metalness:.4});
    for(const x of [-.24,.24])for(const y of [-.23,.23])for(const side of [-1,1]){
      const nail=new T.Mesh(new T.SphereGeometry(.014,8,6),iron);
      nail.position.set(x,y,.326*side);nail.scale.z=.44;visual.add(nail);
    }
    return this.dynamic({position,size,visual,area,name:'Supply crate',shape:R.ColliderDesc.cuboid(.325,.295,.305)});
  }
  remove(item){
    if(this.carried===item)this.carried=null;
    if(this.cargo===item)this.cargo=null;
    this.fixed.delete(item.collider.handle);
    this.items.delete(item.collider.handle);this.world.removeRigidBody(item.body);
    if(!item.visual)return;
    item.visual.removeFromParent();
    if(item.kind!=='round')item.visual.traverse(node=>{node.geometry?.dispose();for(const mat of [node.material].flat())mat?.dispose();});
  }
  fracture(item){
    const origin=vec(item.body.translation());
    const velocity=vec(item.body.linvel());
    const rotation=new T.Quaternion().copy(item.body.rotation());
    const area=item.area;
    const effect=item.breakEffect;
    this.remove(item);
    if(effect){effect(origin,velocity,area);return;}
    for(let i=0;i<6;i++){
      const offset=new T.Vector3((i%3-1)*.21,(i<3?-.13:.13),Math.sin(i*3)*.1).applyQuaternion(rotation);
      const visual=new T.Group();
      part(visual,[.17,.19,.22],[0,0,0],i%2?0xc3905f:0x9d6240);
      const fragment=this.dynamic({position:origin.clone().add(offset).toArray(),visual,area,life:15,
        name:'Wood fragment',shape:R.ColliderDesc.cuboid(.085,.095,.11)});
      fragment.body.setLinvel(velocity.clone().multiplyScalar(.45).addScaledVector(offset,9).add(new T.Vector3(0,1.7,0)),true);
    }
  }
  ray(origin,dir,length,exclude){
    return this.world.castRayAndGetNormal(new R.Ray(origin,dir),length,true,undefined,undefined,
      exclude?.collider,this.walker.body,c=>this.items.get(c.handle)?.kind!=='water'&&this.items.get(c.handle)?.kind!=='round');
  }
  aim(camera,distance){
    const dir=camera.getWorldDirection(new T.Vector3());
    return this.ray(camera.position,dir,distance,this.carried);
  }
  target(camera){
    const hit=this.aim(camera,3.3);
    if(!hit)return null;
    return this.fixed.get(hit.collider.handle)||this.items.get(hit.collider.handle)||null;
  }
  use(camera){
    if(this.driving)return this.exitCar();
    const target=this.target(camera);
    if(this.carried){
      if(target?.accept)return target.accept(this.carried);
      if(target===this.car&&this.carried.size&&this.carried.area===0){
        if(this.cargo)return 'The wagon rack is full. Take out the current load first.';
        this.cargo=this.carried;
        this.release();
        this.cargo.body.setEnabled(false);
        this.cargo.visual.removeFromParent();
        this.car.visual.add(this.cargo.visual);
        this.cargo.visual.position.set(0,.62,1.02);
        this.cargo.visual.rotation.set(0,0,0);
        return this.cargo.name+' secured on the wagon rack.';
      }
      this.release();return 'Set down.';
    }
    if(target?.action)return target.action();
    if(target?.kind==='car'){
      if(this.canUnloadCargo())return this.unloadCargo();
      this.anchor=null;this.driving=true;this.walker.body.setEnabled(false);
      return 'Wagon controls: steer and accelerate with movement. Space or Jump drifts. Use exits.';
    }
    if(target?.kind==='prop')return this.grab(target);
    return '';
  }
  canUnloadCargo(){
    if(!this.cargo||this.driving)return false;
    const local=this.walker.current.clone().sub(vec(this.car.body.translation()))
      .applyQuaternion(new T.Quaternion().copy(this.car.body.rotation()).invert());
    return local.z>.85&&local.length()<3.6;
  }
  unloadCargo(){
    if(this.driving||!this.cargo)return '';
    const item=this.cargo;
    const center=vec(this.car.body.translation());
    if(center.distanceTo(this.walker.current)>3.6)return 'Stand by the wagon to unload its rack.';
    const position=this.walker.current.clone().lerp(center,.35).add(new T.Vector3(0,.38,0));
    this.cargo=null;
    this.scenes[0].add(item.visual);
    item.body.setTranslation(position,true);
    item.body.setRotation({x:0,y:0,z:0,w:1},true);
    item.body.setLinvel({x:0,y:0,z:0},true);
    item.body.setAngvel({x:0,y:0,z:0},true);
    item.body.setEnabled(true);
    return this.grab(item);
  }
  grab(target){
    this.carried=target;target.body.setGravityScale(0,true);
    target.collider.setCollisionGroups(groups(bits.held,all&~(bits.player|bits.round)));
    return 'Carrying '+target.name+'.';
  }
  release(velocity){
    const item=this.carried;if(!item)return;
    this.carried=null;item.body.setGravityScale(1,true);
    item.collider.setCollisionGroups(groups(bits.prop,item.mask));
    if(velocity)item.body.setLinvel(velocity,true);
  }
  fire(camera,scatter=false){
    if(this.cooldown||this.carried||this.driving)return;
    const forward=camera.getWorldDirection(new T.Vector3());
    const orientation=camera.getWorldQuaternion(new T.Quaternion());
    for(let i=0;i<(scatter?5:1);i++){
      const angle=i*Math.PI*.5;
      const dir=i===0?forward.clone():new T.Vector3(Math.cos(angle)*.045,Math.sin(angle)*.045,-1)
        .normalize().applyQuaternion(orientation);
      const round=this.dynamic({position:camera.position.toArray(),kind:'round',life:scatter?.43:1.65,
        visual:new T.Mesh(roundGeometry,roundMaterial),shape:R.ColliderDesc.ball(.065).setDensity(24)});
      round.visual.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),dir);
      round.body.setRotation(round.visual.quaternion,true);
      round.body.lockRotations(true,true);
      round.body.setGravityScale(.16,true);
      round.body.setLinvel(dir.multiplyScalar(scatter?36:47),true);
    }
    this.cooldown=scatter?.62:.15;
  }
  grapple(camera){
    if(this.driving)return '';
    if(this.anchor){this.anchor=null;return 'Hook released.';}
    const direction=camera.getWorldDirection(new T.Vector3());
    const hit=this.aim(camera,42);
    const hook=hit&&this.fixed.get(hit.collider.handle)?.onGrapple;
    if(hook)return hook();
    const visible=[];
    for(const root of this.scenes[this.area].children){
      if(!root.userData.grappleSurface)continue;
      root.traverseVisible(node=>{if(node.isMesh)visible.push(node);});
    }
    const surface=new T.Raycaster(camera.position,direction,0,42).intersectObjects(visible,false)[0];
    if(surface&&(!hit||surface.distance<=hit.timeOfImpact+.25)){
      this.anchor=surface.point.clone().addScaledVector(direction,-.55);
    }else{
      if(!hit||hit.collider.isSensor()||hit.collider.parent()?.isDynamic())return 'Aim at a tree, roof, wall, or solid terrain.';
      this.anchor=camera.position.clone().addScaledVector(direction,hit.timeOfImpact).addScaledVector(vec(hit.normal),.51);
    }
    return 'Hook attached. Tap Hook or press G again to release.';
  }
  drawWater(now){
    const flow=T.MathUtils.clamp((this.flowUntil-now)*2,0,1);
    this.stream.visible=flow>0;
    this.stream.material.uniforms.clock.value=now;
    this.stream.material.uniforms.flow.value=flow;
  }
  spawnFluid(position){
    this.stream.position.set(...position);
    this.flowUntil=performance.now()*.001+2.15;
    for(let i=0;i<28&&this.drops.length<96;i++){
      const p=[position[0]+(i%4-1.5)*.24,position[1]+Math.floor(i/16)*.24,position[2]+(Math.floor(i/4)%4)*.24];
      const drop=this.dynamic({position:p,kind:'water',life:2.1,shape:R.ColliderDesc.ball(.095).setDensity(15).setFriction(.025)});
      drop.body.setLinvel({x:.65,y:.1,z:2.5},true);this.drops.push(drop);
    }
  }
  makeCar(position){
    const visual=new T.Group();
    part(visual,[1.63,.53,2.98],[0,.05,0],0x8c4936,.19);
    part(visual,[1.39,.63,1.51],[0,.57,.25],0x304c50,.21);
    part(visual,[1.53,.15,1.72],[0,.94,.25],0xe0c393,.073);
    for(const x of [-.47,.47])part(visual,[.06,.19,.72],[x,.47,1.01],0x454543,.022);
    part(visual,[.98,.08,.7],[0,.39,1.01],0x575350,.025);
    for(const x of [-.58,.58])part(visual,[.3,.15,.1],[x,.17,-1.53],0xffe298,.045);
    for(const x of [-.81,.81])for(const z of [-.97,.97]){
      const wheel=new T.Mesh(new T.CylinderGeometry(.34,.34,.23,16),material(0x211d20));
      wheel.rotation.z=Math.PI*.5;wheel.position.set(x,-.23,z);visual.add(wheel);
      const hub=new T.Mesh(new T.CylinderGeometry(.177,.177,.037,20),material(0x8f8d7c));
      hub.rotation.z=Math.PI*.5;hub.position.set(x+Math.sign(x)*.125,-.23,z);visual.add(hub);
    }
    this.car=this.dynamic({position,kind:'car',name:'Camp wagon',visual,
      shape:R.ColliderDesc.cuboid(.84,.49,1.48).setDensity(7).setFriction(.18)});
    this.car.body.setEnabledRotations(false,true,false,true);
    this.carHome=position;
  }
  drive(movement){
    const body=this.car.body;
    const rot=new T.Quaternion().copy(body.rotation());
    const front=new T.Vector3(0,0,-1).applyQuaternion(rot);
    const right=new T.Vector3(1,0,0).applyQuaternion(rot);
    const current=vec(body.linvel()),along=current.dot(front),side=current.dot(right);
    const target=movement.z*(movement.z<0?6:15);
    const accel=T.MathUtils.clamp((target-along)*3,-18,13);
    const grip=movement.drift?1.1:8.5;
    const impulse=front.multiplyScalar(accel).addScaledVector(right,-side*grip).multiplyScalar(STEP*body.mass());
    body.applyImpulse(impulse,true);
    body.setAngvel({x:0,y:-movement.x*Math.min(1,Math.abs(along)*.45)*(along<0?-1:1)*(movement.drift?2.1:1.55),z:0},true);
  }
  exitCar(){
    const car=this.car;
    if(vec(car.body.linvel()).length()>2.5)return 'Slow down before exiting.';
    const center=vec(car.body.translation());
    const rot=new T.Quaternion().copy(car.body.rotation());
    for(const side of [-1,1]){
      const pos=center.clone().add(new T.Vector3(2.05*side,1.7,0).applyQuaternion(rot));
      const down=new T.Vector3(0,-1,0);
      const hit=this.ray(pos,down,5,car);
      if(!hit||hit.normal.y<.64)continue;
      pos.y-=hit.timeOfImpact-.88;
      const blocked=this.world.intersectionWithShape(pos,new T.Quaternion(),new R.Capsule(.51,.30),
        undefined,undefined,this.walker.collider,this.walker.body);
      if(blocked)continue;
      this.driving=false;this.walker.body.setEnabled(true);
      const spawn=this.walker.spawn;this.walker.teleport(pos.toArray());this.walker.spawn=spawn;
      return 'Exited wagon.';
    }
    return 'The doors are blocked.';
  }
  before(camera,movement,input){
    this.cooldown=Math.max(0,this.cooldown-STEP);
    for(const item of this.items.values())if(item.size)item.speed=vec(item.body.linvel()).length();
    for(const item of this.items.values()){
      if(item===this.cargo||item.area!==0||item.kind!=='prop'||item===this.carried)continue;
      const p=item.body.translation();
      if(p.y>-1.49||!inCreek(p.x,p.z))continue;
      const velocity=item.body.linvel();
      const submerged=T.MathUtils.clamp((-1.49-p.y)/.48,0,1);
      const scale=STEP*item.body.mass();
      item.body.applyImpulse({x:(this.creekFlow-velocity.x)*submerged*scale*3.1,
        y:(submerged*15-velocity.y*3.6*submerged)*scale,
        z:-velocity.z*submerged*scale*3.1},true);
    }
    if(this.driving)this.drive(movement);
    if(this.carried){
      const dir=camera.getWorldDirection(new T.Vector3());
      if(input.actions.has('throw'))this.release(dir.multiplyScalar(13).add(new T.Vector3(0,1.4,0)));
      else{
        const hit=this.ray(camera.position,dir,1.55,this.carried);
        const target=camera.position.clone().addScaledVector(dir,hit?Math.max(.55,hit.timeOfImpact-.37):1.55);
        const body=this.carried.body;
        if(target.distanceTo(body.translation())>4)this.release();
        else body.setLinvel(target.sub(body.translation()).multiplyScalar(13).clampLength(0,14),true);
      }
    }
    if(this.anchor&&this.anchor.distanceTo(this.walker.current)<1.2)this.anchor=null;
  }
  after(){
    const broken=new Set(),spent=new Set();
    this.events.drainCollisionEvents((a,b,started)=>{
      if(!started)return;
      const one=this.items.get(a),two=this.items.get(b);
      const solid=!(this.world.getCollider(a)?.isSensor()||this.world.getCollider(b)?.isSensor());
      if(one?.kind==='round'&&!spent.has(one)){spent.add(one);this.onImpact.get(b)?.();}
      if(two?.kind==='round'&&!spent.has(two)){spent.add(two);this.onImpact.get(a)?.();}
      if(solid&&one?.size&&one!==this.cargo&&one!==this.carried&&(one.speed>one.impactLimit||two?.kind==='round'))broken.add(one);
      if(solid&&two?.size&&two!==this.cargo&&two!==this.carried&&(two.speed>two.impactLimit||one?.kind==='round'))broken.add(two);
    });
    for(const item of spent)this.remove(item);
    for(const item of broken)if(this.items.has(item.collider.handle))this.fracture(item);
    for(const item of this.items.values()){
      if(item===this.cargo)continue;
      item.life-=STEP;
      const p=item.body.translation();
      if(item===this.car&&(p.y<-10||Math.abs(p.x)>57||Math.abs(p.z)>57)){
        item.body.setTranslation(new T.Vector3(...this.carHome),true);
        item.body.setLinvel({x:0,y:0,z:0},true);
      }else if(item.home&&(p.y<-10||Math.abs(p.x)>58||Math.abs(p.z)>58)){
        item.body.setTranslation(item.home,true);
        item.body.setLinvel({x:0,y:0,z:0},true);
      }else if(item.life<=0||p.y<-18)this.remove(item);
      else if(item.visual){item.visual.position.copy(p);item.visual.quaternion.copy(item.body.rotation());}
    }
    this.drops=this.drops.filter(drop=>this.items.has(drop.collider.handle));
    const spray=this.drops.filter(drop=>drop.life<1.72&&drop.life>.3&&vec(drop.body.linvel()).lengthSq()>1.25);
    this.fluid.count=spray.length;
    const matrix=new T.Matrix4();
    spray.forEach((drop,i)=>{
      const {x,y,z}=drop.body.translation();this.fluid.setMatrixAt(i,matrix.makeTranslation(x,y,z));
    });
    if(spray.length)this.fluid.instanceMatrix.needsUpdate=true;
  }
  draw(camera){
    this.line.visible=!!this.anchor;
    if(!this.anchor)return;
    const pos=this.line.geometry.attributes.position;
    const start=camera.localToWorld(new T.Vector3(.23,-.18,-.35));
    pos.setXYZ(0,start.x,start.y,start.z);
    pos.setXYZ(1,this.anchor.x,this.anchor.y,this.anchor.z);
    pos.needsUpdate=true;
  }
  changeArea(area){
    this.release();this.anchor=null;this.area=area;this.scenes[area].add(this.line);
  }
}
