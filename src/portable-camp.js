import * as T from 'three';
import R from 'rapier';
import {height,inCreek} from './terrain.js';
import {part} from './mechanics.js';

export class PortableCamp {
  constructor(mechanics,camp){
    Object.assign(this,{mechanics,camp});
    this.kit=new T.Group();
    const stove=0x615248,metal=0x4d585a;
    part(this.kit,[.47,.19,.39],[-.29,.115,0],stove,.038);
    const pan=new T.Mesh(new T.CylinderGeometry(.19,.16,.055,22),new T.MeshStandardMaterial({color:0x303234}));
    pan.position.set(-.29,.24,0);this.kit.add(pan);
    part(this.kit,[.21,.039,.05],[-.58,.23,0],metal,.013);
    this.food=new T.Mesh(new T.CylinderGeometry(.136,.127,.02,20),
      new T.MeshStandardMaterial({color:0xbe7637,roughness:.9}));
    this.food.position.set(-.29,.277,0);this.food.visible=false;this.kit.add(this.food);
    this.heat=new T.PointLight(0xffa04a,0,2.5,2);
    this.heat.position.set(-.29,.2,.15);this.kit.add(this.heat);
    const kettle=new T.Mesh(new T.SphereGeometry(.132,22,14),new T.MeshStandardMaterial({color:metal,metalness:.45}));
    kettle.position.set(.16,.15,0);kettle.scale.set(1,.78,1);this.kit.add(kettle);
    const handle=new T.Mesh(new T.TorusGeometry(.095,.013,8,20,Math.PI),
      new T.MeshStandardMaterial({color:0x555a56,metalness:.53}));
    handle.position.set(.16,.23,0);this.kit.add(handle);
    part(this.kit,[.078,.17,.078],[.43,.096,0],0x528c86,.019);
    this.targets=[
      this.sensor(-.29,'Cook on the portable stove',()=>camp.cook(this)),
      this.sensor(.21,'Refill through the portable water filter',()=>this.refill())
    ];
    mechanics.scenes[0].add(this.kit);
    this.kit.visible=false;
  }

  sensor(x,name,action){
    const m=this.mechanics;
    const collider=m.world.createCollider(R.ColliderDesc.ball(.195).setSensor(true)
      .setCollisionGroups((128<<16)|2));
    collider.setEnabled(false);
    m.tag(collider,{name,action});
    return {x,collider};
  }

  toggle(camera){
    const m=this.mechanics;
    if(m.area!==0||m.driving||m.carried)return 'Stand on foot with both hands free to set up camp.';
    if(this.kit.visible){
      if(this.camp.elapsed!==null&&this.camp.hearth===this)return 'Lift the skillet off the heat before packing the camp.';
      this.kit.visible=false;
      for(const {collider} of this.targets)collider.setEnabled(false);
      return 'Portable camp packed.';
    }
    const direction=camera.getWorldDirection(new T.Vector3()).setY(0).normalize();
    const site=m.walker.current.clone().addScaledVector(direction,1.65);
    const ground=height(site.x,site.z);
    if(ground<-1.64||Math.abs(height(site.x+.52,site.z)-ground)>.25||
      Math.abs(height(site.x-.52,site.z)-ground)>.25)return 'Find a level spot above the water to set up camp.';
    this.kit.position.set(site.x,ground+.035,site.z);
    this.kit.visible=true;
    for(const {x,collider} of this.targets){
      collider.setTranslation({x:site.x+x,y:ground+.255,z:site.z});
      collider.setEnabled(true);
    }
    return 'Portable stove, kettle and filter set up. Aim at the stove to cook or the kettle to refill.';
  }

  refill(){
    const {x,z}=this.kit.position;
    for(const [dx,dz] of [[0,0],[1.7,0],[-1.7,0],[0,1.7],[0,-1.7],[1.7,1.7],[-1.7,-1.7]]){
      if(inCreek(x+dx,z+dz))return this.camp.refill();
    }
    return 'Set up beside flowing creek water to use the filter.';
  }
}
