import * as T from 'three';
import R from 'rapier';
import {height} from './terrain.js';
import {part} from './mechanics.js';

const timber=0x634632,steel=0x393e43,orange=0xd17a34;
const up=new T.Vector3(0,1,0);
const lineX=-17,launchZ=-17,landingZ=6;
export function insideRescueCorridor(x,z,padding=0){
  return Math.abs(x-lineX)<2.9+padding&&z>launchZ-6-padding&&z<landingZ+4+padding;
}

function beam(root,a,b,width,color){
  const offset=b.clone().sub(a);
  const piece=part(root,[width,offset.length(),width],a.clone().lerp(b,.5).toArray(),color);
  piece.quaternion.setFromUnitVectors(up,offset.normalize());
  return piece;
}

export class RescueLine {
  constructor(mechanics,notice,unlocked,completed,onComplete){
    Object.assign(this,{mechanics,notice,unlocked,completed,onComplete});
    this.root=new T.Group();
    mechanics.scenes[0].add(this.root);
    this.launch=this.bank(lineX,launchZ,5.6);
    this.landing=this.bank(lineX,landingZ,3.0);
    this.position=new T.Vector3();
    this.lookYaw=Math.PI;
    this.progress=0;
    this.slack=.65;
    this.high=true;

    for(const [top,side] of [[this.launch,-1],[this.landing,1]]){
      for(const x of [-.87,.87]){
        const foot=new T.Vector3(top.x+x,height(top.x+x,top.z),top.z);
        const head=top.clone().add(new T.Vector3(x,.23,0));
        beam(this.root,foot,head,.22,timber);
        const brace=foot.clone().add(new T.Vector3(0,0,side*1.35));
        brace.y=height(brace.x,brace.z);
        beam(this.root,brace,foot.clone().lerp(head,.65),.14,timber);
        part(this.root,[.33,.17,.33],[foot.x,foot.y+.05,foot.z],steel,.025);
      }
      beam(this.root,top.clone().add(new T.Vector3(-1.05,0,0)),top.clone().add(new T.Vector3(1.05,0,0)),.22,timber);
      if(side<0){
        const low=top.clone().add(new T.Vector3(0,-1.6,0));
        beam(this.root,low.clone().add(new T.Vector3(-.94,0,0)),low.clone().add(new T.Vector3(.94,0,0)),.15,timber);
      }
      const eye=new T.Mesh(new T.TorusGeometry(.17,.034,8,18),new T.MeshStandardMaterial({color:orange,metalness:.55,roughness:.45}));
      eye.position.copy(top);eye.rotation.y=Math.PI/2;this.root.add(eye);
    }

    const shelf=this.launch.clone().lerp(this.landing,.52);
    const rock=new T.Mesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:0x74665a,roughness:1,flatShading:true}));
    shelf.y=Math.max(height(shelf.x,shelf.z),-.65)+.95;
    rock.position.copy(shelf);rock.scale.set(2.15,1.36,1.58);rock.rotation.y=.46;
    rock.castShadow=rock.receiveShadow=true;
    this.root.add(rock);
    this.cables=Array.from({length:24},()=>part(this.root,[.034,1,.034],[0,0,0],steel));
    this.trolley=new T.Group();
    part(this.trolley,[.28,.19,.32],[0,-.08,0],orange,.035);
    const metal=new T.MeshStandardMaterial({color:0x515b5c,roughness:.4,metalness:.6});
    for(const z of [-.105,.105]){
      const wheel=new T.Mesh(new T.CylinderGeometry(.085,.085,.26,14),metal);
      wheel.rotation.z=Math.PI/2;wheel.position.set(0,0,z);this.trolley.add(wheel);
    }
    part(this.trolley,[.045,1,.045],[0,-.59,0],steel);
    part(this.trolley,[.44,.055,.055],[0,-1.06,0],orange,.019);
    this.load=new T.Group();
    part(this.load,[.53,.12,.91],[0,-1.33,0],orange,.045);
    part(this.load,[.36,.23,.57],[0,-1.2,0],0x765144,.08);
    part(this.load,[.26,.24,.21],[0,-1.2,.34],0xb69a75,.08);
    for(const z of [-.22,.16])part(this.load,[.56,.045,.065],[0,-1.08,z],steel);
    this.trolley.add(this.load);this.root.add(this.trolley);

    this.controls=this.bank(lineX,launchZ-1.6,.93);
    const base=this.controls.clone().add(new T.Vector3(0,-.47,0));
    part(this.root,[.28,.97,.28],base.toArray(),timber);
    part(this.root,[.58,.31,.44],this.controls.toArray(),orange,.045);
    this.crank=new T.Group();
    this.crank.position.copy(this.controls).add(new T.Vector3(0,.02,-.23));
    part(this.crank,[.065,.35,.065],[0,.135,0],steel,.02);
    part(this.crank,[.16,.075,.095],[0,.29,-.075],steel,.022);
    this.root.add(this.crank);
    const approach=this.bank(lineX+.94,launchZ-2.6,.7);
    part(this.root,[.15,1.4,.15],approach.toArray(),timber);
    const placard=document.createElement('canvas');
    placard.width=512;placard.height=160;
    const ctx=placard.getContext('2d');
    ctx.fillStyle='#d17a34';ctx.fillRect(0,0,512,160);
    ctx.fillStyle='#271e17';ctx.font='bold 57px sans-serif';ctx.textAlign='center';
    ctx.fillText('RESCUE LINE',256,79);
    ctx.font='bold 30px sans-serif';ctx.fillText('WINCH AHEAD',256,126);
    const texture=new T.CanvasTexture(placard);texture.colorSpace=T.SRGBColorSpace;
    const sign=new T.Mesh(new T.PlaneGeometry(1.3,.41),new T.MeshStandardMaterial({map:texture,side:T.DoubleSide}));
    sign.position.copy(approach).add(new T.Vector3(0,.56,0));this.root.add(sign);
    this.station(this.controls,'Operate creek rescue winch',()=>this.start());
    this.redraw();
  }
  bank(x,z,offset){
    return new T.Vector3(x,height(x,z)+offset,z);
  }
  station(position,name,action){
    const collider=this.mechanics.world.createCollider(R.ColliderDesc.cuboid(.4,.35,.31)
      .setTranslation(...position.toArray()).setSensor(true).setCollisionGroups((128<<16)|2));
    this.mechanics.tag(collider,{name,action});
  }
  start(){
    if(!this.unlocked())return 'The ranger can clear you to use the rescue winch.';
    this.active=this.completed()?'ride':'haul';
    this.mechanics.anchor=null;
    this.progress=0;
    this.slack=.65;
    this.speed=0;
    this.high=true;
    this.redraw();
    return this.active==='ride'?'Push forward to release the trolley. Pull back to brake.':
      'Haul forward. Steer left to reel in slack, right to pay it out. Jump switches anchor before hauling.';
  }
  use(){
    if(this.active==='ride'&&this.progress>0)return 'Stay clipped in until you reach the landing.';
    this.active=null;this.progress=0;this.redraw();
    return 'Winch reset.';
  }
  cablePoint(t,target){
    const sag=(this.high?.48:3.3)+this.slack*1.8;
    target.lerpVectors(this.launch,this.landing,t);
    target.y-=sag*Math.sin(Math.PI*t)+(this.high?0:1.6*(1-t));
    return target;
  }
  redraw(){
    const a=new T.Vector3(),b=new T.Vector3(),delta=new T.Vector3();
    this.cables.forEach((segment,i)=>{
      this.cablePoint(i/this.cables.length,a);
      this.cablePoint((i+1)/this.cables.length,b);
      delta.subVectors(b,a);
      segment.position.copy(a).lerp(b,.5);
      segment.scale.y=delta.length()*1.02;
      segment.quaternion.setFromUnitVectors(up,delta.normalize());
    });
    this.cablePoint(this.progress,this.trolley.position);
    this.trolley.rotation.z=Math.sin(this.progress*Math.PI*10)*.09;
    this.load.visible=this.active!=='ride'&&!this.completed();
  }
  readout(touch){
    if(this.active==='ride')return this.progress?'Pull back to brake · '+Math.round(this.speed*3.6)+' km/h':
      'Forward to launch · back to brake';
    const input=touch?'Stick':'W haul · A/D trim';
    return input+' · '+(this.high?'High':'Low')+' anchor · '+Math.round(this.slack*100)+' cm slack · '+Math.round(this.progress*100)+'% across';
  }
  step(move,dt){
    const walker=this.mechanics.walker;
    if(this.active==='haul'){
      if(!this.progress&&move.jump)this.high=!this.high;
      this.slack=T.MathUtils.clamp(this.slack+move.x*dt*.72,.05,1.45);
      this.progress=Math.min(1,this.progress+Math.max(0,move.z)*dt*.14);
      this.crank.rotation.z=-this.progress*44;
      this.redraw();
      const {x,y,z}=this.trolley.position;
      const obstruction=Math.max(height(x,z),-.65)+2.2*Math.exp(-((this.progress-.52)**2)/.008);
      const failure=this.slack<.26?'The winch clutch tripped. Give the line more slack.':
        y-1.45<obstruction?'The stretcher hit the shelf. Try the high anchor or shorten the line.':'';
      if(failure){
        this.use();
        this.notice(failure);
      }else if(this.progress===1){
        this.active=null;
        this.onComplete();
        this.redraw();
      }
      return;
    }
    if(!this.progress&&move.z<=.15)return;
    this.speed=T.MathUtils.clamp(this.speed+(7+Math.min(0,move.z)*16)*dt,2.6,13);
    this.progress=Math.min(1,this.progress+this.speed*dt/this.launch.distanceTo(this.landing));
    this.redraw();
    this.position.copy(this.trolley.position);
    this.position.y-=1.75;
    if(this.progress===1){
      this.position.copy(this.bank(this.landing.x,this.landing.z+1.3,.88));
      this.active=null;
      this.notice('Clipped off at the landing. Follow the bank back toward the old ford.');
    }
    walker.ride(this.position);
  }
}
