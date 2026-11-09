import {RescueLine} from './rigging.js';
import * as T from 'three';
import R from 'rapier';
import {fieldPistol} from './effects.js';
import {part} from './mechanics.js';
import {cabinX,cabinZ,height,inCreek,trailX} from './terrain.js';

const point=(x,z,h=0)=>new T.Vector3(x,height(x,z)+h,z);
export function person(coat){
  const root=new T.Group();
  const material=(color)=>new T.MeshStandardMaterial({color,roughness:.84});
  const cloth=material(coat), trousers=material(0x343935), skin=material(0xba896d), leather=material(0x392d28);
  function mesh(geometry,mat,x,y,z){
    const o=new T.Mesh(geometry,mat);o.position.set(x,y,z);root.add(o);return o;
  }
  mesh(new T.CapsuleGeometry(.21,.33,8,16),cloth,0,1.13,0).scale.z=.67;
  mesh(new T.SphereGeometry(.12,20,14),skin,0,1.6,0).scale.y=1.21;
  mesh(new T.SphereGeometry(.127,18,12),leather,0,1.66,-.019).scale.y=.55;
  const arms=[-.249,.249].map(x=>{
    const pivot=new T.Group();pivot.position.set(x,1.31,0);root.add(pivot);
    const sleeve=mesh(new T.CapsuleGeometry(.063,.29,6,12),cloth,0,-.19,0);
    const hand=mesh(new T.SphereGeometry(.053,12,8),skin,0,-.4,0);
    pivot.add(sleeve,hand);pivot.rotation.z=Math.sign(x)*.15;
    return pivot;
  });
  const legs=[-.102,.102].map(x=>mesh(new T.CapsuleGeometry(.079,.52,6,12),trousers,x,.43,0));
  for(const x of [-.102,.102])mesh(new T.SphereGeometry(.093,12,8),leather,x,.095,.05).scale.set(.87,.63,1.43);
  return {root,legs,arms};
}

function campfire(scene,base){
  const group=new T.Group();group.position.copy(base);scene.add(group);
  const logs=new T.MeshStandardMaterial({color:0x30201a,roughness:1});
  const rocks=new T.MeshStandardMaterial({color:0x645b50,roughness:1});
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5,o=new T.Mesh(new T.DodecahedronGeometry(.17),rocks);
    o.position.set(Math.sin(a)*.54,.08,Math.cos(a)*.54);o.scale.set(1.1,.66,.82);o.rotation.y=a;group.add(o);
  }
  for(let i=0;i<4;i++){
    const o=new T.Mesh(new T.CylinderGeometry(.085,.105,.67,12),logs);
    o.position.y=.12+i*.039;o.rotation.set(Math.PI/2,0,i*1.93);group.add(o);
  }
  const light=new T.PointLight(0xff963e,8,7,2);
  light.position.y=.55;group.add(light);
  const material=new T.ShaderMaterial({
    transparent:true,side:T.DoubleSide,depthWrite:false,
    uniforms:{time:{value:0}},
    vertexShader:`varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec2 v;uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){
        float y=v.y;
        vec2 p=vec2(v.x*6.,y*5.-time*2.9);
        float n=noise(p)*.59+noise(p*2.1)*.27+noise(p*4.2)*.14;
        float x=abs(v.x-.5+(noise(vec2(y*4.,time*2.))-.5)*y*.26);
        float width=(1.-pow(y,.73))*.34;
        float flame=smoothstep(-.026,.1,width-x+(n-.51)*.22)*(1.-smoothstep(.63,.99,y));
        float core=clamp(flame*(1.-y)*1.9,0.,1.);
        vec3 color=mix(vec3(.83,.12,.013),vec3(1.,.83,.39),core);
        gl_FragColor=vec4(color,flame*.89);
        #include <colorspace_fragment>
      }`
  });
  for(let i=0;i<3;i++){
    const o=new T.Mesh(new T.PlaneGeometry(.94,1.36),material);
    o.rotation.y=i*Math.PI/3;o.position.y=.76;group.add(o);
  }
  return time=>{material.uniforms.time.value=time;light.intensity=7+Math.sin(time*17)*1.2+Math.sin(time*29)*.65;};
}

export class Rescue {
  constructor(mechanics,story,bag,notice){
    this.mechanics=mechanics;this.story=story;
    let saved=0;try{saved=Number(localStorage.getItem('bellwether-rescue-v1'));}catch{}
    this.stage=Number.isInteger(saved)&&saved>=0&&saved<=4?saved:0;
    this.bank=point(cabinX-3.4,cabinZ-6);
    this.fire=point(cabinX+4.3,cabinZ+6.7);
    this.route=[this.fire.clone().add(new T.Vector3(1,0,0)),point(4.2,2.7),point(-4.6,-6.1)];
    this.route[0].y=height(this.route[0].x,this.route[0].z);
    const [town]=mechanics.scenes;
    const mother=person(0x60536b);mother.root.position.copy(this.bank);town.add(mother.root);
    this.mother=mother.root;
    const ranger=person(0x655743);town.add(ranger.root);this.ranger=ranger;
    const wrench=new T.Group();
    const metal=new T.MeshStandardMaterial({color:0x8c9897,metalness:.65,roughness:.48});
    const handle=new T.Mesh(new T.CylinderGeometry(.018,.022,.19,10),metal);
    const jaw=new T.Mesh(new T.TorusGeometry(.035,.012,8,16,Math.PI*1.55),metal);
    jaw.position.y=-.11;wrench.add(handle,jaw);
    wrench.position.set(0,-.41,.03);wrench.rotation.x=Math.PI/2;
    ranger.arms[1].add(wrench);wrench.visible=false;this.wrench=wrench;
    this.animateFire=campfire(town,this.fire);
    this.register(this.bank,mother.root,'Speak to the woman',()=>{
      if(this.stage!==0)return 'She looks toward the spillway. “Ask him why they sent him east.”';
      this.save(1);
      return 'She calls you Cal. Then she whispers, “Your mother knew which bank I was on.”';
    });
    this.register(this.route[0],ranger.root,'Speak to the ranger',()=>{
      if(this.stage>=4&&bag?.records.has('cals-letter')&&bag.records.has('dispatch-tape')){
        if(!bag.records.has('timeline-conflict'))bag.record('timeline-conflict','The missing day','Cal’s letter was postmarked a day after the official rescue date. The original tape runs beyond the official transcript.');
        return [this.spillwayReaction?.(), 'You show the ranger the letter and tape. He taps the postmark: “The report is a day early. And they cut the recording short.”'].filter(Boolean).join(' ');
      }
      const reaction=this.spillwayReaction?.();
      if(reaction)return reaction;
      if(this.stage!==1)return 'The ranger is '+(this.rangerActivity??'checking the rescue line')+'.';
      this.save(2);
      return '“Dispatch said east bank. The tape mentions two bells. Check the numbered markers for yourself.”';
    },true);
    const east=this.route[1],west=this.route[2];
    const rig=point(this.fire.x+1.6,this.fire.z+1.5);
    this.zipline=new RescueLine(mechanics,notice,()=>story.state>=4&&this.stage>=1,
      ()=>bag.records.has('spare-pulley'),()=>{
        bag.record('spare-pulley','Spare rescue pulley','Recovered after bringing the practice stretcher across the creek.','Gear');
        bag.record('rigging-clue','Rescue rig test','A rig overloaded near the rock shelf, but the recovered line has clean cuts instead of torn fibers.');
        notice('The Line That Held complete. Use the winch again to ride the rescue line.');
      });
    this.marker(rig,0xc3a375,'Read rescue practice sign',()=>{
      if(this.stage<1)return 'Speak to the woman at the bank first.';
      this.showPractice=true;
      return 'The rescue winch is on the south bank upstream of the ford. Follow the arrow to the orange crank.';
    });
    const rack=point(this.fire.x+2.6,this.fire.z-1.1);
    const rackTop=rack.y+.95;
    part(town,[1.1,.1,.45],[rack.x,rackTop-.05,rack.z],0x64452e);
    for(const x of [-.44,.44])for(const z of [-.16,.16]){
      const ground=height(rack.x+x,rack.z+z);
      part(town,[.085,rackTop-ground,.085],[rack.x+x,(ground+rackTop)/2,rack.z+z],0x64452e);
    }
    const gun=fieldPistol(true);
    gun.rotation.set(0,Math.PI/2,Math.PI/2);
    gun.position.set(rack.x+.24,rackTop+.18,rack.z);
    gun.updateMatrixWorld(true);
    gun.position.y+=rackTop-new T.Box3().setFromObject(gun).min.y;
    town.add(gun);
    gun.visible=!bag.records.has('scattergun');
    this.register(rack,gun,'Collect camp scattergun',()=>{
      bag.record('scattergun','Camp scattergun','X or the weapon button switches weapons. Fires five close-range physical pellets.','Gear');
      gun.visible=false;
      return 'Scattergun added. Use X or the weapon button to equip it.';
    });
    this.marker(east,0x929784,'East rescue marker',()=>{this.checkedEast=true;return 'East station: one bell. The dispatch claimed this was the pickup point.';});
    this.marker(west,0x9b7b55,'West rescue marker',()=>{
      if(this.stage<2)return 'Two bells hang from a weathered rescue post.';
      if(this.stage===2){
        if(!this.checkedEast)return 'Two bells. Compare this with the east marker the dispatch named.';
        this.approach??='On foot: from the west station, you can hear both bells.';
        this.save(3);
        return this.approach+' Two bells. Dispatch sent the ranger to the wrong bank. Look for the orange rope on the low timber stand next to this post.';
      }
      return 'The west station matches the recording.';
    });
    this.evidence=point(west.x-1.25,west.z+.65,.78);
    const line=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
      new T.Vector3(-.58,.03,0),new T.Vector3(-.25,.08,.13),new T.Vector3(.05,.02,-.02),new T.Vector3(.38,.09,.09)
    ]),24,.041,8,false),new T.MeshStandardMaterial({color:0xe99248,roughness:.9}));
    const stand=new T.Group();
    stand.position.copy(this.evidence);
    const wood=new T.MeshStandardMaterial({color:0x775136,roughness:.88});
    const board=new T.Mesh(new T.BoxGeometry(1.27,.1,.56),wood);
    board.position.y=-.065;stand.add(board);
    for(const x of [-.49,.49])for(const z of [-.19,.19]){
      const bottom=height(this.evidence.x+x,this.evidence.z+z)-this.evidence.y;
      const leg=new T.Mesh(new T.BoxGeometry(.095,-.1-bottom,.095),wood);
      leg.position.set(x,(bottom-.1)/2,z);stand.add(leg);
    }
    town.add(stand);
    line.position.copy(this.evidence);town.add(line);this.line=line;
    this.register(this.evidence.clone().add(new T.Vector3(0,-.98,0)),line,'Recover the cut rescue line',()=>{
      if(this.stage<3)return 'The line runs back toward the two-bell marker.';
      if(this.stage===3){
        this.save(4);this.line.visible=false;
        bag?.record('cut-line','Cut rescue line','Clean cut fibers. Recovered by the two-bell station.');
        return 'Recovered: the cut line. Both ends are clean. Someone cut it under tension.';
      }
      return 'You already recovered the line.';
    });
  }
  save(stage){
    this.stage=stage;
    try{localStorage.setItem('bellwether-rescue-v1',String(stage));}catch{}
  }
  register(base,visual,name,action,moving=false){
    const collider=this.mechanics.world.createCollider(R.ColliderDesc.capsule(.34,.34)
      .setTranslation(base.x,base.y+.98,base.z).setSensor(true).setCollisionGroups((128<<16)|2));
    this.mechanics.tag(collider,{name,action:()=>this.story.state>=4&&visual.visible?action():'Nothing to investigate yet.'});
    if(moving)this.rangerSensor=collider;
  }
  marker(p,color,name,action){
    const town=this.mechanics.scenes[0],group=new T.Group();
    group.position.copy(p);town.add(group);
    const oak=new T.MeshStandardMaterial({color:0x554637,roughness:.91});
    const metal=new T.MeshStandardMaterial({color,metalness:.48,roughness:.46});
    const pole=new T.Mesh(new T.CylinderGeometry(.065,.10,1.6,13),oak);pole.position.y=.8;group.add(pole);
    const count=name.startsWith('West')?2:1;
    for(let i=0;i<count;i++){
      const bell=new T.Mesh(new T.CylinderGeometry(.055,.16,.23,20,true),metal);
      bell.position.set((i-(count-1)/2)*.29,1.25,.14);group.add(bell);
    }
    this.register(p,group,name,action);
  }
  objective(){
    if(this.story.state<4||this.story.area!==0)return null;
    if(this.showPractice){
      if(this.zipline.active||this.zipline.completed())this.showPractice=false;
      else return {text:'Optional · Find the orange rescue winch upstream',target:this.zipline.controls};
    }
    const goals=['Meet the woman on the bank','Find the ranger on his camp rounds','Reconstruct the rescue · compare the bank markers','Recover the orange rope on the stand beside the two-bell post','Cut line recovered · the spillway investigation is next'];
    const targets=[this.bank,this.ranger.root.position,this.route[this.checkedEast?2:1],this.evidence,null];
    if(this.stage===2&&this.checkedEast)return {text:'Compare the two-bell post on the west bank',target:this.route[2]};
    return {text:goals[this.stage],target:targets[this.stage]};
  }
  traceApproach(){
    const m=this.mechanics;
    const position=m.driving?m.car.body.translation():m.walker.current;
    if(Math.abs(position.z+1)>13||Math.abs(position.x)>21){
      this.lastApproach=null;
      return;
    }
    const point=new T.Vector3().copy(position);
    const previous=this.lastApproach;
    this.lastApproach=point;
    if(!previous||point.distanceTo(previous)>.8)return;
    if(m.driving&&Math.abs(point.z+1)<3&&Math.abs(point.x-trailX(point.z))<3){
      if(Math.abs(m.car.body.linvel().z)>1.2)this.approach='Wagon: the service road crosses within earshot of the west bells.';
      return;
    }
    if(!m.driving&&m.anchor&&point.y>height(point.x,point.z)+1.45){
      this.airDistance=(this.airDistance||0)+point.distanceTo(previous);
      if(this.airDistance>=2.1)this.approach='Grapple: the overhead line gives a clear sightline to the west station.';
      return;
    }
    if(!m.driving&&point.y<-.35&&inCreek(point.x,point.z)){
      this.wadeDistance=(this.wadeDistance||0)+Math.max(0,previous.x-point.x);
      if(this.wadeDistance>=2.4)this.approach='Creek: the upstream bank carries the sound of two bells.';
    }
  }
  tick(time){
    const enabled=this.story.state>=4&&this.story.area===0;
    this.mother.visible=enabled;
    this.ranger.root.visible=enabled;
    this.animateFire(time);
    if(enabled&&this.stage===2&&this.checkedEast&&!this.approach)this.traceApproach();
    const camp=this.route[0];
    this.rangerStops??=[
      [camp,'warming his hands by the fire',6],
      [point(camp.x+2.4,camp.z-2.1),'checking the rescue gear',9],
      [point(camp.x+3.5,camp.z+2.8),'checking Cal’s marker',8]
    ];
    const root=this.ranger.root;
    const detour=this.grateDetour?.();
    if(detour){
      const delta=detour.clone().sub(root.position);
      delta.y=0;
      const distance=delta.length();
      root.rotation.y=Math.atan2(delta.x,delta.z);
      if(distance>.16)root.position.addScaledVector(delta,Math.min(1,.035/distance));
      root.position.y=height(root.position.x,root.position.z);
      root.rotation.x=distance>.16?0:.17;
      this.rangerActivity=distance>.16?'walking to the jammed grate':'inspecting the jammed grate';
      this.wrench.visible=false;
      this.ranger.legs.forEach((leg,i)=>{leg.rotation.x=distance>.16?Math.sin(time*8+i*Math.PI)*.25:0;});
      this.ranger.arms.forEach((arm,i)=>{arm.rotation.x=distance>.16?Math.sin(time*8+i*Math.PI)*.25:-.85;});
      this.rangerSensor.setTranslation({x:root.position.x,y:root.position.y+.98,z:root.position.z});
      return;
    }
    let elapsed=time%47;
    for(const [i,[stop,activity,wait]] of this.rangerStops.entries()){
      const next=this.rangerStops[(i+1)%this.rangerStops.length][0];
      if(elapsed>=wait+8){elapsed-=wait+8;continue;}
      const progress=T.MathUtils.clamp((elapsed-wait)/8,0,1);
      root.position.lerpVectors(stop,next,progress);
      root.position.y=height(root.position.x,root.position.z);
      root.rotation.y=Math.atan2(next.x-stop.x,next.z-stop.z);
      this.rangerActivity=progress>0?'walking his camp rounds':activity;
      this.ranger.legs.forEach((leg,index)=>{
        leg.rotation.x=progress>0?Math.sin(progress*54+index*Math.PI)*.25:0;
      });
      const inspecting=i===2&&progress===0;
      const working=i===1&&progress===0;
      root.rotation.x=inspecting?.12+Math.sin(elapsed*2)*.035:0;
      this.wrench.visible=working;
      this.ranger.arms.forEach((arm,index)=>{
        if(progress>0)arm.rotation.x=Math.sin(progress*54+index*Math.PI)*.31;
        else if(working)arm.rotation.x=-1.16+Math.sin(elapsed*8+index*.6)*.19;
        else if(inspecting)arm.rotation.x=index===0?-1.25+Math.sin(elapsed*2)*.2:-.36;
        else arm.rotation.x=i===0?-.72:-.09;
      });
      break;
    }
    this.rangerSensor.setTranslation({x:root.position.x,y:root.position.y+.98,z:root.position.z});
    if(this.stage===4)this.line.visible=false;
  }
}
