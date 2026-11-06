import {Missions} from './missions.js';
import {documentProp} from './props.js';
import * as T from 'three';
import R from 'rapier';
import {cabinX,cabinY,cabinZ,height,plots} from './terrain.js';

function realityMaterial() {
  return new T.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    side: T.DoubleSide,
    vertexShader: `
      uniform float time;
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      void main() {
        vec3 p = position;
        float ripple = sin(p.x * 1.35 + time * 1.6) * cos(p.z * 1.2 - time);
        p += normal * ripple * 0.16;
        p.x += cos(p.y * 1.7 + time) * 0.065;
        vec4 world = modelMatrix * vec4(p, 1.0);
        worldPosition = world.xyz;
        worldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float time;
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      void main() {
        vec3 viewDelta = cameraPosition - worldPosition;
        float phase = dot(worldPosition, vec3(.51,.66,.46)) + time * 1.5;
        vec3 spectrum = .53 + .44 * cos(phase + vec3(0.,2.094,4.188));
        float rim = pow(1. - abs(dot(normalize(worldNormal), normalize(viewDelta))), 2.);
        float pulse = .84 + .16 * sin(time * 2. + worldPosition.y * 1.6);
        float fog = 1. - exp(-.00038 * dot(viewDelta, viewDelta));
        gl_FragColor = vec4(mix(spectrum * pulse + rim * .22, vec3(.37,.09,.35), fog), 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

const steps=[
  'Read the field journal in Vale House',
  'Find Mom’s letter in the Foxglove Camp lodge',
  'Enter the violet arch behind the lodge',
  'Find the memory in the Echo Grid',
  'Mystery solved · Return through the arch or keep exploring'
];
const SAVE='bellwether-story-v1';
function persisted(){
  try{return Math.min(4,Math.max(0,Number.parseInt(localStorage.getItem(SAVE),10)||0));}
  catch{return 0;}
}
function sign(scene,text,point,yaw=0,width=2.7){
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#2c2528';ctx.fillRect(0,0,512,128);
  ctx.strokeStyle='#d2a476';ctx.lineWidth=6;ctx.strokeRect(9,9,494,110);
  ctx.fillStyle='#f8deb0';ctx.font='bold 42px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,256,64,465);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(width,width/4),
    new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));
  mesh.position.copy(point);mesh.rotation.y=yaw;scene.add(mesh);
}
function transformed(plot,x,y,z){
  return new T.Vector3(x,y,z).multiplyScalar(plot.scale)
    .applyAxisAngle(new T.Vector3(0,1,0),plot.yaw).add(new T.Vector3(plot.x,plot.y,plot.z));
}
function marker(scene,point,color){
  const gem=new T.Mesh(new T.OctahedronGeometry(.14),
    new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.48,metalness:.18}));
  gem.position.copy(point);scene.add(gem);return gem;
}
export class Story {
  state=persisted();
  area=0;
  markers=[];
  constructor(mechanics,pipeline,models){
    this.mechanics=mechanics;
    const [town,realm]=mechanics.scenes;
    const vale=plots[0];
    this.targets=[transformed(vale,0,0,5),new T.Vector3(cabinX,cabinY,cabinZ+5),
      new T.Vector3(cabinX,0,cabinZ-11),new T.Vector3(140,0,-11)];
    for(const plot of plots){
      const building=pipeline.place(models.cabin,{position:[plot.x,plot.y,plot.z],scale:plot.scale,yaw:plot.yaw,collider:'authored'});
      if(plot!==vale)building.traverse(mesh=>{
        if(!mesh.isMesh||!mesh.visible)return;
        const tint=plot.name==='Post Office'?0xddaaa0:0xbcd7bd;
        mesh.material=mesh.material.clone();
        mesh.material.color.multiply(new T.Color(tint));
      });
      sign(town,plot.name.toUpperCase(),transformed(plot,0,2.57,4.68),plot.yaw,2.55);
    }
    sign(town,'FOXGLOVE CAMP',new T.Vector3(cabinX,cabinY+2.55,cabinZ+4.71));
    this.clue(transformed(vale,-2.37,1.16,-1.38),0,'Read field journal',0,
      'Mom’s journal: “Take the receiver to camp. Channel 5. The door below Foxglove heard my voice, then answered twice.”');
    this.clue(new T.Vector3(cabinX-2.37,cabinY+1.16,cabinZ-1.38),0,'Read Mom’s letter',1,
      '“Set the three sluices to 2, 1, 3. The arch kept the moment I crossed. Find that memory.”');
    this.shader=realityMaterial();
    const gateX=cabinX,gateZ=cabinZ-11,gateY=height(gateX,gateZ);
    this.gates=[new T.Vector3(gateX,gateY,gateZ),new T.Vector3(140,0,11)];
    this.gates.forEach((point,index)=>this.arch(point,index,pipeline,models.arch));
    realm.background=new T.Color(0x170f32);
    realm.fog=new T.FogExp2(0x543576,.029);
    realm.add(new T.HemisphereLight(0xf2cdff,0x5849ab,2.3));
    mechanics.staticBox([48,.55,51],[140,-.29,-4],0x271e49,1);
    const grid=new T.GridHelper(47,38,0xa884ed,0x584785);
    grid.position.set(140,.018,-4);realm.add(grid);
    for(let i=0;i<12;i++){
      const x=140+(i%2?1:-1)*(5+(i*3%9)),z=8-i*2.75,h=2+i%5;
      const pillar=mechanics.staticBox([.75,h,.75],[x,h*.5,z],0x633d86,1);
      pillar.visual.visible=false;
      const stone=new T.Mesh(new T.CylinderGeometry(.29,.51,h,7),
        new T.MeshStandardMaterial({color:0x63516f,roughness:.81}));
      stone.position.set(x,h*.5,z);realm.add(stone);
      const halo=new T.Mesh(new T.TorusGeometry(.93,.16,12,40),this.shader);
      halo.position.set(x,h+.55,z);halo.rotation.set(i*.4,i*.23,0);realm.add(halo);
    }
    const knot=new T.Mesh(new T.TorusKnotGeometry(2.1,.52,128,16),this.shader);
    knot.position.set(140,4.2,-13);realm.add(knot);
    this.clue(new T.Vector3(140,.78,-11),1,'Recover the memory',3,
      '“I went through to close it from the far side. The door opens both ways now. Come find me.”');
    mechanics.crate([144,.55,1],1);
    sign(realm,'THE ECHO GRID',new T.Vector3(140,2.55,-13.5));
    this.missions=new Missions(this,pipeline,models);
  }
  advance(state){
    this.state=state;
    try{localStorage.setItem(SAVE,String(state));}catch{}
  }
  clue(point,area,name,stage,message){
    const {world,scenes}=this.mechanics;
    // A small interaction volume covers the visible paper without blocking movement.
    const collider=world.createCollider(R.ColliderDesc.cuboid(.27,.24,.24)
      .setTranslation(point.x,point.y+.16,point.z).setSensor(true).setCollisionGroups((128<<16)|2));
    this.mechanics.tag(collider,{name,action:()=>{
      if(this.state<stage)return 'There’s another clue to find first.';
      if(this.state===1&&stage===1&&this.missions.frequency!==5)return 'Carry and tune the field receiver before reading the letter.';
      if(this.state===3&&stage===3&&!this.missions.passed)return 'Finish the signal trial to stabilize this memory.';
      if(this.state===stage)this.advance(stage+1);
      return message;
    }});
    if(stage<2){
      const prop=documentProp(stage===1);
      prop.position.copy(point);
      prop.rotation.y=stage===0?plots[0].yaw:0;
      scenes[area].add(prop);
    }
    const gem=marker(scenes[area],point.clone().add(new T.Vector3(0,.37,0)),0xf4c87e);
    if(stage<2)gem.scale.setScalar(.29);
    this.markers.push({gem,y:gem.position.y,stage});
  }
  arch(point,area,pipeline,model){
    const {x,y,z}=point;
    for(const side of [-1,1])this.mechanics.staticBox([.36,3.12,.5],[x+side*1.54,y+1.55,z],0x543876,area).visual.visible=false;
    this.mechanics.staticBox([3.45,.32,.54],[x,y+3.07,z],0x61468a,area).visual.visible=false;
    const arch=pipeline.prepare(model,{position:point.toArray()});
    arch.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true;});
    this.mechanics.scenes[area].add(arch);
    const portal=new T.Mesh(new T.PlaneGeometry(2.73,2.92,22,25),this.shader);
    portal.position.set(x,y+1.49,z);
    this.mechanics.scenes[area].add(portal);
  }
  transition(position,dt){
    this.wait=Math.max(0,(this.wait||0)-dt);
    const gate=this.gates[this.area];
    if(this.wait||Math.abs(gate.x-position.x)>1.25||Math.abs(gate.z-position.z)>.6||
       Math.abs(position.y-gate.y)>2.4)return null;
    this.wait=1.2;
    if(this.area===0&&this.state<2)return {notice:'The arch is sealed. Read the letter in the lodge.'};
    if(this.area===0&&this.state===2&&!this.missions.calibrated())return {notice:'Set the three sluices before crossing.'};
    if(this.area===1)this.missions.relayTime=0;
    this.area=1-this.area;
    this.mechanics.changeArea(this.area);
    if(this.state===2)this.advance(3);
    const exit=this.gates[0];
    return this.area===1?{area:1,position:[140,1.02,8.6],yaw:0,notice:'You crossed into the Echo Grid.'}:
      {area:0,position:[exit.x,height(exit.x,exit.z+2.4)+1.04,exit.z+2.4],yaw:Math.PI,notice:'Back at Foxglove Camp.'};
  }
  guide(position){
    const target=this.waypoint();
    const distance=target?Math.round(Math.hypot(position.x-target.x,position.z-target.z)):0;
    if(this.state===3&&this.area===0)return 'Return through the violet arch to reach the memory';
    return (this.missions.objective()||steps[this.state])+(target?' · '+distance+' m':'');
  }
  waypoint(){
    if(this.state===3&&this.area===0)return this.targets[2];
    return this.missions.target()??this.targets[this.state]??null;
  }
  animate(time){
    this.shader.uniforms.time.value=time;
    for(const {gem,y,stage} of this.markers){
      gem.visible=this.state>=stage&&this.state<=stage+1;
      gem.rotation.y=time*1.6;gem.position.y=y+Math.sin(time*3)*.08;
    }
  }
}

export function buildCampEquipment(mechanics,pipeline,models){
  const {scenes}=mechanics;
  const wagonZ=30,wagonX=4.45;
  mechanics.makeCar([wagonX,height(wagonX,wagonZ)+.63,wagonZ]);
  const x=cabinX+5.5,z=cabinZ+1.7,y=height(x,z);
  for(let i=0;i<3;i++){
    const posX=x+i*.91;
    mechanics.crate([posX,height(posX,z)+.35,z]);
  }
  for(const {x:cx,z:cz,yaw} of plots){
    const dx=4.6*Math.sin(yaw),dz=4.6*Math.cos(yaw);
    mechanics.crate([cx+dx,height(cx+dx,cz+dz+1.1)+.35,cz+dz+1.1]);
  }
  for(const [lx,lz] of [[cabinX+2,cabinZ+4.2],[plots[0].x-3.6,plots[0].z+1.35]]){
    mechanics.dynamic({position:[lx,height(lx,lz)+.43,lz],...pipeline.loose(models.lantern,1),
      name:'Camp lantern'});
  }
  const post=mechanics.staticBox([.20,2.18,.20],[x,y+1.1,z+2.15],0x654c40);
  post.visual.visible=false;
  const valve=mechanics.staticBox([.39,.33,.29],[x,y+1.45,z+2.33],0x759794);
  valve.visual.visible=false;
  const hardware=pipeline.prepare(models.valve,{position:[x,y+1.45,z+2.33],scale:1.16});
  scenes[0].add(hardware);
  const flow=()=>{mechanics.spawnFluid([x,y+1.38,z+2.67]);return 'The spillway is running.';};
  mechanics.tag(valve.collider,{name:'Open spillway valve',action:flow});
  mechanics.tag(post.collider,{name:'Open spillway valve',action:flow});
  sign(scenes[0],'SPILLWAY',new T.Vector3(x,y+2.2,z+2.27),0,1.5);
}
