import * as T from 'three';
import R from 'rapier';
import {cabinX,cabinZ,height} from './terrain.js';
import {groundPoint,station} from './field-stations.js';
import {part} from './mechanics.js';

const siteX=cabinX+10.1,siteZ=cabinZ+3.3;
const key='workshop-crawler-repair';
export const nearWorkshop=(x,z,padding)=>Math.abs(x-siteX)<4+padding&&Math.abs(z-siteZ)<4+padding;

export class Workshop {
  constructor(mechanics,bag){
    Object.assign(this,{mechanics,bag});
    const scene=mechanics.scenes[0],y=height(siteX,siteZ)+.48;
    this.origin=new T.Vector3(siteX,y,siteZ);
    const point=(x,h,z)=>[siteX+x,y+h,siteZ+z];
    const steel=0x536b68,wood=0x816044;
    const stationBase=groundPoint(siteX-1.65,siteZ+2.15);
    this.control=station(mechanics,0,stationBase,'Connect to the workshop crawler',()=>this.toggle(),{color:steel}).point;
    for(const x of [-1.13,1.13]){
      mechanics.staticBox([.56,.21,5.6],point(x,-.15,-.65),wood);
      for(const z of [-2.7,1.5]){
        const foot=height(siteX+x,siteZ+z);
        part(scene,[.17,Math.max(.16,y-foot),.17],[siteX+x,(y+foot)/2,siteZ+z],steel,.012);
      }
    }
    mechanics.staticBox([1.53,.11,4.6],point(0,-.055,-.65),steel);
    const door=mechanics.staticBox([1.59,1.18,.14],point(0,.83,.14),0x77685a);
    this.door=door;
    for(const x of [-.78,.78])part(scene,[.12,1.48,.2],point(x,.69,.14),steel,.018);
    this.ramp=part(scene,[1.51,.073,1.44],point(0,.28,-1.38),steel,.008);
    this.ramp.rotation.x=.43;
    mechanics.staticBox([1.52,.12,1.36],point(0,.55,-2.71),steel);
    this.latch=part(scene,[.15,.18,.105],point(-.5,.78,-2.18),0xb87a3a,.023);
    this.pipe=new T.Mesh(new T.CylinderGeometry(.16,.16,.88,18,true),
      new T.MeshStandardMaterial({color:0x71644f,side:T.DoubleSide,metalness:.6}));
    this.pipe.rotation.x=Math.PI/2;
    this.pipe.position.set(...point(.34,.76,-2.82));
    scene.add(this.pipe);
    const cableGeometry=new T.BufferGeometry().setFromPoints([
      new T.Vector3(...point(.34,.76,-2.38)),new T.Vector3(...point(.34,.76,-3.25)),
      new T.Vector3(...point(.34,.49,-3.42))
    ]);
    this.cable=new T.Line(cableGeometry,new T.LineBasicMaterial({color:0xf8ac61}));
    this.cable.visible=bag.records.has(key);
    scene.add(this.cable);
    this.latched=bag.records.has(key);
    if(this.latched)this.openDoor();
    this.robot=new T.Group();
    part(this.robot,[.22,.104,.29],[0,.075,0],0x536961,.024);
    for(const x of [-.125,.125])part(this.robot,[.055,.12,.3],[x,.057,0],0x272d2f,.017);
    part(this.robot,[.09,.067,.082],[0,.12,-.126],0x324143,.014);
    const lamp=new T.PointLight(0xa3ffdf,3.5,4,2);
    lamp.position.set(0,.15,-.17);this.robot.add(lamp);
    this.robot.visible=false;
    scene.add(this.robot);
    this.installBench();
  }

  installBench(){
    const m=this.mechanics,scene=m.scenes[0];
    const x=siteX+2.6,z=siteZ+.5,y=height(x,z);
    m.staticBox([1.48,.09,.65],[x,y+.86,z],0x876347);
    for(const dx of [-.62,.62])for(const dz of [-.23,.23]){
      const foot=height(x+dx,z+dz);
      const h=Math.max(.1,y+.82-foot);
      part(scene,[.105,h,.105],[x+dx,foot+h/2,z+dz],0x545858,.01);
    }
    for(const [name,color,px,pz,size] of [
      ['Workshop tool tray',0x56656a,x+.3,z,[.36,.075,.25]],
      ['Movable workshop stool',0x96704b,x-.15,z+1.03,[.34,.43,.34]]
    ]){
      const home=new T.Vector3(px,name.endsWith('tray')?y+.95:height(px,pz)+.24,pz);
      const visual=new T.Group();
      part(visual,size,[0,0,0],color,.024);
      m.dynamic({position:home.toArray(),home,visual,name,area:0,
        shape:R.ColliderDesc.cuboid(...size.map(n=>n/2)).setDensity(1.1).setFriction(.72)});
    }
  }

  toggle(){
    const m=this.mechanics;
    if(this.active){
      this.active=false;
      this.robot.visible=false;
      return 'Crawler recalled.';
    }
    if(m.area!==0||m.driving||m.carried)return 'Stand on foot with both hands free to use the workshop crawler.';
    if(m.walker.current.distanceTo(this.control)>4)return 'The crawler controller is by the workshop bench.';
    this.x=0;this.z=1.4;
    this.active=true;
    this.robot.visible=true;
    this.place();
    return 'Crawler camera connected. Drive under the door. Use works the latch or cable. Select Crawler again to recall.';
  }

  place(){
    const rise=T.MathUtils.clamp((-this.z-.71)*.43,0,.61);
    this.robot.position.copy(this.origin).add(new T.Vector3(this.x,rise,this.z));
  }

  step(move,dt){
    this.x=T.MathUtils.clamp(this.x+move.x*dt*1.28,-.56,.56);
    this.z=T.MathUtils.clamp(this.z-move.z*dt*1.8,-2.36,1.57);
    this.place();
  }

  openDoor(){
    this.door.collider.setEnabled(false);
    this.door.visual.position.y=this.origin.y+1.93;
    this.latch.rotation.z=-.7;
  }

  hint(){
    if(this.z>-1.7)return 'Crawler · Steer under the door and up the steel ramp';
    if(!this.latched)return 'Crawler · Move left to the latch';
    if(!this.bag.records.has(key))return 'Crawler · Line up with the pipe on the right';
    return 'Crawler · Repair complete. Select Crawler to recall';
  }

  use(){
    if(this.z>-1.7)return 'Drive farther up the steel ramp.';
    if(!this.latched){
      if(this.x>-.23)return 'Steer left to reach the latch.';
      this.latched=true;
      this.openDoor();
      return 'The crawler pulls the latch. The workshop door lifts. Now line up with the pipe on the right.';
    }
    if(this.bag.records.has(key))return 'The cable is in place. Recall the crawler to return to your view.';
    if(this.x<.18||this.z>-2.1)return 'Move to the right and line up with the pipe mouth.';
    this.cable.visible=true;
    this.bag.record('bolt-cutters','Bolt cutters','Use O or Cutters on the chained workshop service gate.','Gear');
    this.bag.record(key,'Workshop signal cable restored','The crawler opened the latch and threaded a pull line through the old workshop conduit.');
    return 'The crawler threads the pipe. The shop has its signal line back.';
  }

  view(camera){
    camera.position.copy(this.robot.position).add(new T.Vector3(0,.161,-.174));
    camera.rotation.set(-.09,0,0);
  }
}
