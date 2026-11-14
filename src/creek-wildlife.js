import * as T from 'three';
import {height} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const roots=[[12,-13.9],[13.4,-12.7],[15,-11.1]];
const overlook=[10.4,-8.1];
export const nearBoarTrail=(x,z,pad=0)=>x>9.4-pad&&x<17.8+pad&&z>-14.6-pad&&z<-7.2+pad;

function animal(scene,color,deer){
  const root=new T.Group();
  const geometry=new T.SphereGeometry(1,12,8);
  const material=new T.MeshStandardMaterial({
    color,roughness:.87,transparent:deer,opacity:deer?.48:1,
    emissive:deer?0x204f44:0,depthWrite:!deer
  });
  function piece(x,y,z,sx,sy,sz){
    const mesh=new T.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);
    root.add(mesh);
  }
  const bodyY=deer?.95:.53;
  piece(0,bodyY,0,.29,.32,.61);
  piece(0,bodyY+.14,.53,.19,.24,.27);
  piece(0,bodyY+.09,.75,.16,.13,.23);
  for(const side of [-1,1]){
    for(const z of [-.33,.33])piece(side*.19,bodyY*.36,z,.078,bodyY*.36,.081);
    piece(side*.13,bodyY+.34,.54,.07,.14,.09);
  }
  scene.add(root);
  return root;
}

export class CreekWildlife {
  constructor(mechanics,bag,notice,playCall){
    Object.assign(this,{mechanics,bag,notice,playCall});
    const scene=mechanics.scenes[0];
    this.boar=animal(scene,0x583b2f,false);
    this.home=new T.Vector3(17,height(17,-8),-8);
    this.boar.position.copy(this.home);
    this.chargeTime=0;
    this.rest=0;
    this.heading=new T.Vector3();
    this.struck=new Set();
    this.deer=animal(scene,0x9de9ca,true);
    this.deer.visible=false;
    this.tracks=new T.Group();
    const material=new T.MeshBasicMaterial({color:0x6d9c86,polygonOffset:true,polygonOffsetFactor:-2});
    for(let i=0;i<7;i++){
      const x=-18+i*.57,z=-11+i*.29;
      for(const offset of [-.072,.072]){
        const print=new T.Mesh(new T.CircleGeometry(.065,6),material);
        print.rotation.x=-Math.PI/2;
        print.scale.set(.65,1.4,1);
        print.position.set(x+offset,height(x+offset,z)+.022,z);
        this.tracks.add(print);
      }
    }
    scene.add(this.tracks);
    this.trackEnd=this.tracks.children.at(-1).position.clone();
    this.echoTime=0;
    this.called=bag.records?.has('echo-deer')??false;
  }

  installBoarTrail(){
    const m=this.mechanics;
    const material=new T.MeshStandardMaterial({color:0x634429,roughness:1,side:T.DoubleSide});
    for(const [index,[x,z]] of roots.entries()){
      for(let n=0;n<5;n++){
        const dirt=new T.CircleGeometry(.22+n*.028,7).rotateX(-Math.PI/2).scale(1,1,.63);
        const pos=dirt.getAttribute('position');
        const dx=x+Math.sin(n*2.3)*.43,dz=z+Math.cos(n*2.3)*.28;
        for(let v=0;v<pos.count;v++){
          const px=pos.getX(v)+dx,pz=pos.getZ(v)+dz;
          pos.setXYZ(v,px,height(px,pz)+.065,pz);
        }
        dirt.computeVertexNormals();
        m.scenes[0].add(new T.Mesh(dirt,material));
      }
      const base=groundPoint(x-.6,z+.3);
      const clue=[
        'Fresh patches of torn sod lead northeast toward the creek. Follow the marks before stepping into the clearing.',
        'The furrows get deeper here. The straight gully ahead is where the boar charges. Bear west toward the survey stake by the bank.',
        'The boar feeds just beyond this patch. Back out toward the survey stake to watch from the side of the gully.'
      ][index];
      station(m,0,base,'Inspect the torn sod',()=>{
        if(!this.bag.records.has('boar-rooting-sign')){
          this.bag.record('boar-rooting-sign','Fresh boar rooting',
            'Torn sod and deep furrows lead to the feeding gully east of the creek. The west survey stake is outside the charge lane.');
        }
        return clue;
      },{color:0x62513c});
    }
    this.overlook=station(m,0,groundPoint(...overlook),'Watch the boar from the survey stake',()=>{
      const player=m.walker.current;
      if(Math.hypot(player.x-this.home.x,player.z-this.home.z)<6.2){
        return 'Circle to the west side of the stake to stay outside the charge lane.';
      }
      if(Math.hypot(this.boar.position.x-this.home.x,this.boar.position.z-this.home.z)>2||this.chargeTime){
        return 'The feeding patch is empty. Give the boar time to settle and return.';
      }
      if(!this.bag.records.has('boar-bank-watch')){
        this.bag.record('boar-bank-watch','The boar’s feeding gully',
          'From the west survey stake you watched the boar follow the rooting furrows down the gully. The stake marks a way around its charge lane.');
      }
      return 'The boar noses up a mat of roots. The trail behind the survey stake takes you around its feeding gully.';
    },{color:0x887447}).point;
  }

  installEchoTrail(){
    const m=this.mechanics,bag=this.bag,end=this.trackEnd;
    const last=station(m,0,groundPoint(end.x,end.z+.51),'Inspect the last Echo hoofprint',()=>{
      if(bag.records.has('echo-deer-relay'))return 'The paired prints still stop before the relay.';
      if(!bag.records.has('echo-deer'))return 'The tracks stop at this print. Hold still and listen toward the creek.';
      if(!bag.records.has('echo-deer-last-print'))bag.record('echo-deer-last-print','The last paired hoofprint',
        'The hoofprints stopped at the bend. The call came from the direction of the survey post east of the prints.');
      return 'The call came from the rusted survey post to the east. Use Mic on its metal housing to compare it with what you heard.';
    },{color:0x536358});
    this.lastPrint=last.point;
    const post=station(m,0,groundPoint(end.x+3.9,end.z-1.44),'Inspect the creek survey post',()=>{
      if(bag.records.has('echo-deer-relay'))return 'The post stays still when the deer calls. The marks and the sound end in different places.';
      return 'The old survey housing is bolted shut. Try the contact microphone after following the hoofprints.';
    },{color:0x80624b});
    this.echoPost=post.point;
    m.fixed.get(post.collider.handle).contact=()=>{
      if(!bag.records.has('echo-deer')||!bag.records.has('echo-deer-last-print')&&!bag.records.has('echo-deer-relay')){
        return {strength:0,message:'The mount is still. Examine the last hoofprint before comparing the call here.'};
      }
      if(!bag.records.has('echo-deer-relay'))bag.record('echo-deer-relay','The call beyond the hoofprints',
        'The deer’s call reached the survey post after the visible animal vanished. The contact microphone detected no vibration in the housing. Use the account to ask the ranger how he separates radio voices from physical signals.');
      this.playCall(this.echoPost);
      return {strength:0,message:'The call repeats in the air. The metal housing stays still. Ask the ranger what he listens for.'};
    };
  }

  rangerAccount(){
    if(!this.bag.records.has('echo-deer-relay'))return '';
    if(this.bag.records.has('echo-deer-account'))return '';
    this.bag.record('echo-deer-account','The ranger’s rule for a reply',
      'The ranger lets a repeating voice finish, then asks for a new sound from the place the caller claims to be. At the flooded house he listens for the screws in the clock to move.');
    return '“A voice can carry without moving a thing. Ask for a knock you can feel. At the flooded house, put the Mic on the clock mount.”';
  }

  objective(){
    if(this.mechanics.area!==0||!this.bag.records.has('echo-deer-last-print')||this.bag.records.has('echo-deer-relay'))return null;
    return {text:'Optional · Use Mic on the creek survey post',target:this.echoPost};
  }

  tick(dt){
    const m=this.mechanics;
    if(m.area!==0)return;
    const player=m.driving?m.car.body.translation():m.walker.current;
    this.updateBoar(dt,player);
    if(this.called)return;
    const end=this.trackEnd;
    if(!this.echoTime&&Math.hypot(player.x-end.x,player.z-end.z)>3.5)return;
    this.echoTime+=dt;
    const x=end.x+this.echoTime*2.2,z=end.z-this.echoTime*.8;
    this.deer.position.set(x,height(x,z),z);
    this.deer.rotation.y=Math.atan2(2.2,-.8);
    this.deer.visible=this.echoTime<1.15;
    if(this.echoTime<1.8)return;
    this.called=true;
    this.playCall(this.deer.position);
    this.bag.record('echo-deer','The missing hoofprints',
      'A pale deer crossed the bank. Its prints stopped before the bend, but its call carried on beyond them.');
    this.notice('The hoofprints stop here. A deer calls from beyond the bend.');
  }

  updateBoar(dt,player){
    const position=this.boar.position;
    this.rest=Math.max(0,this.rest-dt);
    if(!this.chargeTime){
      this.heading.set(player.x-position.x,0,player.z-position.z);
      const distance=this.heading.length();
      if(!this.rest&&distance>.1&&distance<6&&position.distanceTo(this.home)<8){
        this.heading.normalize();
        this.chargeTime=1.35;
        this.struck.clear();
        this.notice('A boar lowers its head. Step out of its path.');
        return;
      }
      this.heading.copy(this.home).sub(position).setY(0);
      if(this.heading.lengthSq()<.04)return;
      position.addScaledVector(this.heading.normalize(),Math.min(.9*dt,position.distanceTo(this.home)));
    }else{
      this.chargeTime=Math.max(0,this.chargeTime-dt);
      position.addScaledVector(this.heading,dt*5.5);
      if(!this.chargeTime)this.rest=6;
      for(const item of this.mechanics.items.values()){
        if(item.area!==0||item.kind!=='prop'||item===this.mechanics.carried||item===this.mechanics.cargo||
          this.struck.has(item)||item.body.mass()>18)continue;
        const p=item.body.translation();
        if(Math.hypot(p.x-position.x,p.z-position.z)>.85||Math.abs(p.y-position.y-.4)>.65)continue;
        item.body.applyImpulse({x:this.heading.x*3.2,y:1.4,z:this.heading.z*3.2},true);
        this.struck.add(item);
      }
    }
    position.y=height(position.x,position.z);
    this.boar.rotation.y=Math.atan2(this.heading.x,this.heading.z);
  }
}
