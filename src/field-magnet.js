import * as T from 'three';
import R from 'rapier';
import {cabinX,cabinZ,height,plots} from './terrain.js';
import {part,vec} from './mechanics.js';

const finds=[
  {id:'spanner',name:'Dropped spanner',x:cabinX+7.1,z:cabinZ+2.5,description:'A bent ring spanner from the camp repair bench.'},
  {id:'key',name:'Lost gate key',x:cabinX+8.5,z:cabinZ+4.6,description:'A corroded key with an old maintenance tag.'},
  {id:'plate',name:'Archive truck plate',x:8.7,z:9.1,description:'A spare registration plate from the archive truck.'},
  {id:'lure',name:'Lost fishing lure',x:plots[1].x-4.2,z:plots[1].z+2.4,description:'A battered steel spoon lure with the hook removed.'}
];
const steel=0x676f70,brass=0xb18a47;

function model(id){
  const root=new T.Group();
  if(id==='plate'){
    part(root,[.29,.025,.15],[0,0,0],0x9caa8a,.011);
    for(const x of [-.09,-.045,0,.045,.09])part(root,[.018,.006,.067],[x,.016,0],steel,.003);
  }else{
    part(root,[.05,.031,.23],[0,0,0],id==='key'?brass:steel,.011);
    const ring=new T.Mesh(new T.TorusGeometry(.047,.013,8,18),
      new T.MeshStandardMaterial({color:id==='key'?brass:steel,metalness:.61,roughness:.46}));
    ring.rotation.x=-Math.PI/2;ring.position.z=-.10;root.add(ring);
    if(id==='key')part(root,[.085,.024,.041],[.027,0,.089],brass,.005);
    if(id==='lure'){
      const spoon=new T.Mesh(new T.SphereGeometry(.085,16,10),ring.material);
      spoon.scale.set(.68,.25,1.4);spoon.position.z=.05;root.add(spoon);
    }
  }
  return root;
}

export class FieldMagnet {
  constructor(mechanics,bag,notice){
    Object.assign(this,{mechanics,bag,notice});
    const line=new T.BufferGeometry();
    line.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(6),3));
    this.line=new T.Line(line,new T.LineBasicMaterial({color:0x75d9dd}));
    this.line.frustumCulled=false;
    this.line.visible=false;
    mechanics.scenes[0].add(this.line);
    for(const find of finds){
      if(bag.records.has('magnet-'+find.id))continue;
      const {x,z}=find,home=new T.Vector3(x,height(x,z)+.085,z);
      const item=mechanics.dynamic({position:home.toArray(),home,visual:model(find.id),area:0,
        name:find.name,shape:R.ColliderDesc.cuboid(.145,.035,.13).setDensity(1.8).setFriction(.78)});
      item.magneticFind=find;
      mechanics.tag(item.collider,{name:find.name,action:()=> 'Use the Field Kit magnet to retrieve this piece of metal.'});
    }
  }
  use(camera){
    const m=this.mechanics;
    if(this.pull){this.cancel();return 'Magnet released.';}
    if(m.area!==0||m.driving||m.carried)return 'Stand on foot with both hands free to use the magnet.';
    const hit=m.aim(camera,9);
    const item=hit&&m.items.get(hit.collider.handle);
    if(!item?.magneticFind)return 'Aim the magnet at a dropped metal tool, key, plate, or lure.';
    this.pull={item,time:2.5};
    return 'Magnet attached. Keep the line clear.';
  }
  cancel(){
    this.pull=null;
    this.line.visible=false;
  }
  tick(dt,camera){
    if(!this.pull)return;
    const {item}=this.pull,m=this.mechanics;
    const invalid=m.area!==0||m.driving||m.carried||!m.items.has(item.collider.handle);
    if(invalid||(this.pull.time-=dt)<=0){
      this.cancel();
      if(!invalid)this.notice('The magnet slipped. Move closer and try again.');
      return;
    }
    const position=vec(item.body.translation());
    const from=m.walker.current.clone().add(new T.Vector3(0,.35,0));
    const delta=from.clone().sub(position);
    const distance=delta.length();
    const blocked=m.ray(position,delta.clone().normalize(),distance,item);
    if(distance<.85&&!blocked){
      const {id,name,description}=item.magneticFind;
      this.cancel();
      m.remove(item);
      this.bag.record('magnet-'+id,name,description,'Keepsakes');
      this.notice(name+' recovered.');
      return;
    }
    item.body.applyImpulse(delta.normalize().multiplyScalar(item.body.mass()*dt*23),true);
    const points=this.line.geometry.attributes.position;
    const hand=camera.localToWorld(new T.Vector3(.18,-.17,-.32));
    points.setXYZ(0,hand.x,hand.y,hand.z);
    points.setXYZ(1,position.x,position.y,position.z);
    points.needsUpdate=true;
    this.line.visible=true;
  }
}
