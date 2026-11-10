import * as T from 'three';
import {cabinX,cabinZ,height} from './terrain.js';
import {part} from './mechanics.js';

const gateKey='workshop-service-gate';

export class ServiceGate {
  constructor(mechanics,bag){
    Object.assign(this,{mechanics,bag});
    const scene=mechanics.scenes[0];
    const x=cabinX+13.65,z=cabinZ+2.1,y=height(x,z);
    this.gate=mechanics.staticBox([1.49,1.23,.13],[x,y+.68,z],0x485855);
    for(const local of [-.56,-.28,0,.28,.56]){
      part(this.gate.visual,[.045,1.17,.072],[local,0,.075],0x83908a,.008);
    }
    for(const side of [-1,1]){
      const px=x+side*.83,base=height(px,z);
      const top=y+1.54;
      part(scene,[.14,top-base,.16],[px,(base+top)/2,z],0x665b48,.015);
      const end=x+side*1.37,ey=height(end,z);
      mechanics.staticBox([.98,.92,.12],[end,ey+.46,z],0x6a634d);
    }
    const chain=new T.Group();
    for(let i=0;i<5;i++){
      const link=new T.Mesh(new T.TorusGeometry(.047,.012,8,14),
        new T.MeshStandardMaterial({color:0xb59159,metalness:.65,roughness:.48}));
      link.position.set((i-2)*.055,-.025*Math.abs(i-2),.09);
      link.rotation.y=i%2?Math.PI/3:0;
      chain.add(link);
    }
    chain.position.y=.08;
    this.gate.visual.add(chain);
    mechanics.staticBox([1.72,.15,.22],[x,y+3.18,z-.06],0x5d604f);
    const latch=mechanics.staticBox([.24,.23,.13],[x+.61,y+2.62,z+.085],0xbe985c);
    part(scene,[.12,2.72,.13],[x+.61,y+1.36,z-.062],0x74614a,.012);
    mechanics.tag(latch.collider,{name:'Pull the raised service latch',action:()=>{
      if(bag.records.has(gateKey))return 'The service gate is already open.';
      if(!mechanics.harnessSuspended)return 'Lock your climbing harness before working the raised latch.';
      if(mechanics.walker.current.y<y+1.37)return 'Climb higher before locking the harness beside the latch.';
      return this.open('You pull the raised latch. The service gate swings clear.');
    }});
    mechanics.tag(this.gate.collider,{name:'Chained workshop service gate',action:()=>
      'Use bolt cutters on the chain, or reach the raised latch with your harness.'});
    if(bag.records.has(gateKey))this.raise();
    if(bag.records.has('workshop-crawler-repair')&&!bag.records.has('bolt-cutters')){
      bag.record('bolt-cutters','Bolt cutters','Use O or Cutters on the chained workshop service gate.','Gear');
    }
  }
  raise(){
    this.gate.collider.setEnabled(false);
    this.gate.visual.rotation.y=Math.PI*.5;
    this.gate.visual.position.x+=.73;
    this.gate.visual.position.z-=.69;
  }
  open(message){
    this.raise();
    this.bag.record(gateKey,'Workshop service gate open',message);
    return message;
  }
  cut(camera){
    const m=this.mechanics;
    if(m.area!==0||m.driving||m.carried)return 'Stand on foot with both hands free to use the cutters.';
    if(!this.bag.records.has('workshop-crawler-repair'))return 'Finish the workshop crawler repair to unlock the bolt cutters.';
    if(m.aim(camera,3.3)?.collider.handle!==this.gate.collider.handle)return 'Aim the cutters at the chained workshop service gate.';
    return this.open('The cutters snap the chain. The service gate swings clear.');
  }
}
