import * as T from 'three';
import {groundPoint,station} from './field-stations.js';
import {part} from './mechanics.js';
import {dispatchLog,dispatchReceipt} from './archive-window.js';

const site={x:11.25,z:2.75};
const started='storehouse-relay-lead',opened='storehouse-relay-open';
export const relayRecording='storehouse-relay-recording';
export const relayComparison='storehouse-relay-compared';
export const relayCallSign='storehouse-relay-ed';
export const nearStorehouseRelay=(x,z,pad=0)=>Math.abs(x-site.x)<3.5+pad&&Math.abs(z-site.z)<2.6+pad;

export class StorehouseRelay {
  constructor(mechanics,bag,robot,pipeline,receiver,play){
    Object.assign(this,{mechanics,bag,robot,play});
    const m=mechanics,scene=m.scenes[0];
    const base=groundPoint(site.x,site.z);
    this.origin=base.add(new T.Vector3(0,1.37,0));
    const p=(x,y,z)=>this.origin.clone().add(new T.Vector3(x,y,z));
    const box=(size,x,y,z,color)=>m.staticBox(size,p(x,y,z).toArray(),color);
    const iron=0x465652,zinc=0x66766f,rust=0x866442,brass=0xd3ab65;
    box([3.45,.25,3.72],0,-.125,0,iron);
    box([3.46,2.56,.18],0,1.28,-1.83,zinc);
    for(const x of [-1.64,1.64]){
      box([.18,2.56,3.54],x,1.28,0,zinc);
      for(const z of [-1.55,1.55]){
        const foot=groundPoint(site.x+x,site.z+z).y;
        const depth=this.origin.y-foot;
        if(depth>.1)box([.23,depth,.23],x,-depth/2,z,iron);
      }
    }
    box([3.58,.15,3.82],0,2.54,0,iron);
    for(const x of [-1.42,-.94,-.47,0,.47,.94,1.42]){
      part(scene,[.025,.032,3.82],p(x,2.626,0).toArray(),zinc);
    }
    const landing=box([1.24,.14,1.14],-1.07,-.04,2.33,iron);
    for(const x of [-1.64,-.53]){
      const foot=groundPoint(site.x+x,site.z+2.72).y;
      const depth=landing.visual.position.y-foot;
      if(depth>.08)box([.11,depth,.11],x,-.04-depth/2,2.72,iron);
    }
    // The vent and service door share the front wall. A standing player fits only through the door.
    box([1.1,2.56,.18],.04,1.28,1.81,zinc);
    box([.94,2.27,.18],1.12,1.42,1.81,zinc);
    box([1.17,.43,.18],-1.07,2.35,1.81,zinc);
    box([.15,2.5,.18],1.65,1.25,1.81,zinc);
    this.door=box([1.15,2.12,.17],-1.07,1.06,1.81,rust);
    for(const y of [.18,1.74])part(this.door.visual,[1.13,.06,.036],[0,y-1.06,.095],iron);
    m.tag(this.door.collider,{name:'Inspect the jammed relay door',action:()=>
      'The lower latch is jammed. Use the crawler at the floor vent or grapple the roof service ring.'});

    const water=new T.Mesh(new T.PlaneGeometry(2.27,.94).rotateX(-Math.PI/2),
      new T.MeshStandardMaterial({color:0x34706c,roughness:.23,metalness:.27}));
    water.position.copy(p(-.47,.021,.18));scene.add(water);
    const cable=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
      p(1.08,.023,2.23),p(1.08,.023,.72),p(1.04,.023,-.42),p(.57,.025,-1.02),p(-.96,.025,-1.19)
    ]),28,.018,6,false),new T.MeshStandardMaterial({color:brass,emissive:0x241607}));
    scene.add(cable);
    this.latch=part(scene,[.22,.12,.15],p(-1.04,.17,-1.44).toArray(),brass,.02);
    const plate=box([.56,.39,.3],-1.03,2.91,2.37,zinc);
    box([.13,.13,.72],-1.03,2.91,2.02,iron);
    this.ledge=p(-1.03,2.62,1.99);
    box([1.29,.13,.79],-1.03,2.55,2.04,iron);
    const ring=new T.Mesh(new T.TorusGeometry(.145,.033,8,24),
      new T.MeshStandardMaterial({color:brass,metalness:.62,roughness:.44}));
    ring.position.copy(p(-1.03,2.94,2.54));scene.add(ring);
    this.ring=ring.position;
    m.tag(plate.collider,{name:'Pull the roof service release',
      onGrapple:()=>{
        if(!this.started)return 'Ask the archive clerk about the relay room first.';
        m.anchor=this.ledge.clone().add(new T.Vector3(0,1.75,.59));
        return 'Grapple attached. Land on the ledge and use the roof release.';
      },
      action:()=>{
        const player=m.walker.current;
        if(!this.started)return 'Ask the archive clerk about the relay room first.';
        if(player.y<this.ledge.y+.48||Math.hypot(player.x-this.ledge.x,player.z-this.ledge.z)>1.45){
          return 'Grapple up to the service ledge first.';
        }
        return this.open('The roof release frees the service door. Drop back to the landing to enter.');
      }});

    for(const x of [.66,1.51])part(scene,[.06,.32,.08],p(x,.16,1.92).toArray(),rust,.01);
    this.pullLine=new T.Line(new T.BufferGeometry().setFromPoints([p(1.05,.14,2.24),p(-1.04,.17,-1.44)]),
      new T.LineBasicMaterial({color:0xffb362}));
    this.pullLine.frustumCulled=false;
    this.pullLine.visible=false;
    scene.add(this.pullLine);
    const controller=station(m,0,groundPoint(site.x+2.14,site.z+1.92),'Connect crawler at the floor vent',
      ()=>this.toggle(),{color:iron});
    this.control=controller.point;
    part(controller.body,[.26,.13,.18],[0,.995,0],zinc,.016);
    const cabinet=box([.54,.63,.28],.61,1.05,-1.63,iron);
    const radio=pipeline.prepare(receiver,{position:p(.61,1.37,-1.57).toArray(),groundY:this.origin.y+1.37,scale:.59});
    scene.add(radio);
    this.cabinet=cabinet.visual.position;
    m.tag(cabinet.collider,{name:'Play the storehouse relay recording',action:()=>this.listen()});
    if(bag.records.has(opened))this.raiseDoor();
  }

  get started(){return this.bag.records.has(started);}
  get doorOpen(){return this.bag.records.has(opened);}

  brief(){
    const records=this.bag.records;
    if(!records.has(dispatchLog)&&!records.has(dispatchReceipt))return '';
    if(records.has(relayRecording))return '“You have the relay recording. Match it to the signed log with June, or ask Ed about his call sign if you only have the receipt.”';
    this.tracked=true;
    if(!this.started)this.bag.record(started,'Storehouse relay room',
      'The archive clerk traced dispatch 07-C to the relay cabinet behind the jammed service door. The crawler fits through the floor vent, and there is a manual release on the roof ledge.');
    return '“The relay room is downhill behind the bay. Send the crawler through the floor vent and stay on the yellow cable around the floodwater. Or grapple the brass roof ring and work the service release.”';
  }

  toggle(){
    const m=this.mechanics;
    if(this.active){
      this.active=false;
      this.robot.visible=false;
      this.pullLine.visible=false;
      return 'Crawler recalled to the vent entrance.';
    }
    if(m.area!==0||m.driving||m.carried||m.anchor)return 'Stand on foot with both hands free to connect the crawler.';
    if(m.walker.current.distanceTo(this.control)>4)return 'The relay crawler connection is at the floor vent.';
    if(!this.started)return 'Ask the archive clerk about the relay room first.';
    if(this.doorOpen)return 'The service door is open. Go inside and play the relay recording.';
    this.tracked=true;
    this.active=true;
    this.x=1.05;this.z=2.24;
    this.robot.visible=true;
    this.place();
    return 'Crawler connected. Drive forward through the vent and keep the yellow cable in view.';
  }

  place(){
    this.robot.position.copy(this.origin).add(new T.Vector3(this.x,0,this.z));
  }

  step(move,dt){
    const x=T.MathUtils.clamp(this.x+move.x*dt*1.28,-1.42,1.42);
    const z=T.MathUtils.clamp(this.z-move.z*dt*1.8,-1.47,2.28);
    if(this.z>=1.72&&z<1.95&&(x<.78||x>1.39))return;
    if(this.z<1.72&&z>=1.72&&(x<.78||x>1.39))return;
    this.x=x;this.z=z;
    this.place();
    if(z<.7&&z>-.36&&x<.78){
      this.x=1.05;this.z=2.24;
      this.toggle();
      return 'The crawler hit floodwater. Reconnect at the vent and stay on the right-hand dry strip.';
    }
    return '';
  }

  hint(){
    if(this.z>1.6)return 'Crawler · Forward through the floor vent';
    if(this.z>-.52)return 'Crawler · Keep right of the flooded junction';
    return 'Crawler · Follow the cable left and use the brass latch';
  }

  view(camera){
    camera.position.copy(this.robot.position).add(new T.Vector3(0,.164,-.168));
    camera.rotation.set(-.11,0,0);
  }

  use(){
    if(this.z>-1||this.x>-.68)return 'Follow the cable around the water and line up with the brass latch.';
    const point=this.pullLine.geometry.attributes.position;
    point.setXYZ(0,this.robot.position.x,this.robot.position.y+.13,this.robot.position.z);
    point.needsUpdate=true;
    this.toggle();
    this.pullLine.visible=true;
    return this.open('The crawler pulls the latch. The service door swings clear. Enter and play the relay recording.');
  }

  raiseDoor(){
    this.door.collider.setEnabled(false);
    this.door.visual.position.x-=.59;
    this.door.visual.position.z+=.58;
    this.door.visual.rotation.y=-Math.PI/2;
    this.latch.rotation.z=.65;
  }

  open(message){
    if(this.doorOpen)return 'The service door is already open.';
    this.raiseDoor();
    this.tracked=true;
    this.bag.record(opened,'Storehouse service door opened','The jammed latch released. The relay cabinet is accessible from the landing.');
    return message;
  }

  listen(){
    if(!this.doorOpen)return 'Free the service door latch first.';
    if(this.mechanics.walker.current.z>site.z+1.84)return 'Step inside the relay room to reach the playback controls.';
    this.pullLine.visible=false;
    this.play(this.cabinet);
    if(!this.bag.records.has(relayRecording))this.bag.record(relayRecording,'Relay recording for dispatch 07-C',
      'Tower Two relayed dispatch 07-C after the second bell: “Bridge instructions. Unit Birch Seven, follow the lights into the lower cut.” The tape identifies the relay channel but carries no signature.');
    return 'The speaker crackles. “Tower Two to Birch Seven. Bridge instructions. Follow the lights into the lower cut.” The field bag holds the transcript.';
  }

  objective(){
    if(!this.tracked||this.mechanics.area!==0||this.bag.records.has(relayRecording))return null;
    return this.doorOpen?{text:'Optional · Play the storehouse relay recording',target:this.cabinet}:
      {text:'Optional · Use the floor vent or grapple to the roof release',target:this.control};
  }
}
