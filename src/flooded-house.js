import * as T from 'three';
import R from 'rapier';
import {basin,height} from './terrain.js';
import {groundPoint,station} from './field-stations.js';
import {part} from './mechanics.js';

export const floodLead='flood-house-lead';
export const floodIdentified='flood-house-key-identified';
export const floodFiled='flood-house-filed';
const opened='flood-house-gate-open';
const site={x:basin.x-6.8,z:22};
const flooded=p=>Math.abs(p.x-basin.x)<10.9&&p.z>=basin.back&&p.z<24;

export class FloodedHouse {
  constructor(mechanics,bag,salvage,tow,robot,pipeline,models,notice){
    Object.assign(this,{mechanics,bag,salvage,tow,robot,pipeline,models,notice});
    const m=mechanics,scene=m.scenes[0];
    this.base=groundPoint(site.x,site.z);
    const at=(x,y,z)=>this.base.clone().add(new T.Vector3(x,y,z));
    const box=(size,x,y,z,color)=>m.staticBox(size,at(x,y,z).toArray(),color);
    const iron=0x455e5a,rust=0x846348,stone=0x76695b;
    box([4.1,.18,3.3],0,-.025,-.24,stone);
    box([4.1,2.13,.16],0,1.13,-1.88,iron);
    for(const x of [-1.97,1.97])box([.16,2.13,3.3],x,1.13,-.23,iron);
    box([4.1,.17,3.35],0,2.27,-.24,iron);
    box([.54,2.13,.16],-1.73,1.13,1.36,iron);
    box([.68,2.13,.16],.43,1.13,1.36,iron);
    box([1.11,1.56,.16],1.35,1.41,1.36,iron);
    box([1.58,.3,.16],-.66,2.0,1.36,iron);
    this.gate=box([1.57,1.75,.14],-.66,.94,1.36,rust);
    for(const x of [-.56,-.28,0,.28,.56]){
      part(this.gate.visual,[.045,1.72,.055],[x,0,.082],iron,.013);
    }
    m.tag(this.gate.collider,{name:'Inspect the jammed storm gate',action:()=>!this.tracked?
      'Ask the resident at the dry address who kept the storm gate key.':
      this.isOpen?'The storm gate is clear. The key shelf is by the back wall.':
      'A floating timber wedged the storm gate. Tow it toward the ramp, or connect the crawler at the vent to reach the release.'});
    this.control=station(m,0,groundPoint(site.x+2.53,site.z+1.65),'Connect crawler at the storm vent',()=>this.toggle(),{color:iron}).point;
    this.vent=at(1.35,.084,1.69);
    this.release=at(-1.45,.26,-1.34);
    part(scene,[.18,.16,.16],this.release.toArray(),0xb08a48,.022);
    const sump=new T.Mesh(new T.PlaneGeometry(2.61,2.05).rotateX(-Math.PI/2),
      new T.MeshStandardMaterial({color:0x366763,roughness:.24,metalness:.28}));
    sump.position.copy(at(-.445,.068,.085));
    scene.add(sump);
    this.pipe=new T.Line(new T.BufferGeometry().setFromPoints([this.vent,
      at(1.35,.084,-1.31),at(-1.45,.084,-1.31),this.release]),new T.LineBasicMaterial({color:0xffb764}));
    scene.add(this.pipe);
    const shelf=box([.75,.08,.43],-.72,.68,-1.52,stone);
    box([.16,.56,.16],-.94,.36,-1.52,iron);
    box([.16,.56,.16],-.50,.36,-1.52,iron);
    this.shelf=shelf.visual.position.clone().add(new T.Vector3(0,.045,0));
    this.home=at(-.66,.32,1.9);
    if(this.isOpen)this.raise();
  }

  get tracked(){return this.bag.records.has(floodLead);}
  get isOpen(){return this.bag.records.has(opened);}

  speak(){
    if(this.tracked||!this.bag.records.has('second-address-filed'))return '';
    this.bag.record(floodLead,'The storm gate key',
      'The resident lent Cal the gate key on a cork float. Check the annex beside the flooded address when the street is drained.');
    return '“They marked him safe before the second bell. But I lent Cal the storm gate key to check the low house. It had a cork float. Take a look in the annex when the street drains.”';
  }

  identify(item){
    if(!item||item!==this.key||!this.mechanics.items.has(item.collider.handle))return '“If you find the gate key on a cork float, bring it here so I can see it.”';
    this.mechanics.remove(item);
    this.key=null;
    this.bag.record(floodIdentified,'The resident recognized Cricket’s key',
      'The resident identified the three notches Cricket cut in the cork and the green thread she tied through it. Cal borrowed this key to check the low house. Recovering it there corroborates the errand, while leaving open who returned through the crossing.');
    return '“Those three cuts are Cricket’s. I tied the green thread myself. Cal took it to the low house even after dispatch said he was safe. Bring June what I told you. She kept a key ledger.”';
  }

  compare(ending){
    if(!this.bag.records.has(floodIdentified))return '';
    if(!this.bag.records.has(floodFiled)){
      this.bag.record(floodFiled,'June corrected the low-house entry',
        'June’s diner ledger used porch to mean the high-bank relief porch. The recovered key and the resident’s identification corroborate a separate visit to the low house. June entered the low-house check separately from the safe-bank roll call.');
      return 'June turns the ledger around. “I marked the relief porch safe. Dispatch copied it as the low house. I’ll write both places out in full, so nobody makes that mistake again.”';
    }
    if(ending==='hold')return '“The watch reads the high-bank porch and the low house separately now. Two check-ins, two spaces in the ledger.”';
    if(ending==='seal')return '“I put both addresses on the copy for Cricket. Now she can see which door Cal went to.”';
    return '';
  }

  raise(){
    this.gate.collider.setEnabled(false);
    this.gate.visual.position.y=this.base.y+2.78;
  }

  open(route){
    if(this.isOpen)return;
    this.bag.record(opened,'Storm gate cleared',route);
    this.raise();
    if(route==='crawler'&&this.jam){
      const side=groundPoint(site.x-3,site.z+1.76).add(new T.Vector3(0,.24,0));
      this.mechanics.resetProp(this.jam,side);
    }
    this.notice(route==='winch'?'The winch pulls the timber clear. The storm gate lifts.':
      'The crawler reaches the release. The storm gate lifts. Recover the cork key from the shelf.');
  }

  stock(){
    const m=this.mechanics;
    if(!this.isOpen&&!this.jam){
      const visual=new T.Group();
      const log=new T.Mesh(new T.CylinderGeometry(.17,.24,1.8,9),
        new T.MeshStandardMaterial({color:0x6b5439,roughness:.94}));
      log.rotation.z=Math.PI/2;
      visual.add(log);
      visual.add(this.pipeline.prepare(this.models.fordRescueBracket,{position:[0,.06,.22],yaw:Math.PI}));
      this.jam=m.dynamic({position:this.home.toArray(),visual,name:'Tow eye on the wedged timber',
        shape:R.ColliderDesc.cuboid(.90,.22,.27).setDensity(3).setFriction(.62)});
      this.jam.towPoint=new T.Vector3(0,.09,.29);
      this.jam.body.setEnabledRotations(false,false,false,true);
      m.tag(this.jam.collider,{name:'Tow eye on the wedged timber',action:()=>
        'Hook this eye, then hook the wagon on the ramp side. From the driver’s seat, press Rig again to winch.'});
    }
    if(this.isOpen&&!this.key&&!this.bag.records.has(floodIdentified)){
      const asset=this.pipeline.loose(this.models.floodKey,1);
      const bounds=new T.Box3().setFromObject(asset.visual);
      const position=this.shelf.clone().add(new T.Vector3(0,-bounds.min.y,0));
      this.key=m.dynamic({...asset,position:position.toArray(),name:'Storm gate key on a cork float',
        size:bounds.getSize(new T.Vector3()).toArray(),impactLimit:Infinity});
    }
  }

  toggle(){
    const m=this.mechanics;
    if(this.active){this.disconnect();return 'Crawler recalled to the storm vent.';}
    if(!this.tracked||!this.salvage.clock.running)return 'Open the Submerged Street drain after talking to the resident.';
    if(this.isOpen)return 'The gate is open. Go inside for the cork key.';
    if(m.area!==0||m.driving||m.carried||m.anchor||m.walker.current.distanceTo(this.control)>4){
      return 'Stand beside the storm vent on foot with both hands free.';
    }
    this.active=true;
    this.x=1.35;
    this.z=1.69;
    this.robot.visible=true;
    this.place();
    return 'Crawler connected. Follow the yellow line through the vent and along the right wall.';
  }

  disconnect(){
    this.active=false;
    this.robot.visible=false;
  }

  place(){
    this.robot.position.set(this.base.x+this.x,this.base.y+.077,this.base.z+this.z);
  }

  step(move,dt){
    const x=T.MathUtils.clamp(this.x+move.x*1.22*dt,-1.62,1.72);
    const z=T.MathUtils.clamp(this.z-move.z*1.55*dt,-1.53,1.77);
    if(z>1.11&&(x<.99||x>1.68))return '';
    if(z>-.94&&z<1.11&&x<.86){
      this.disconnect();
      return 'The crawler tipped into the sump. Reconnect at the vent and keep right until the yellow line turns.';
    }
    this.x=x;
    this.z=z;
    this.place();
    return '';
  }

  hint(){return this.z>-.94?'Crawler · Follow the yellow line along the right wall':'Crawler · Turn left and use the brass release';}

  view(camera){
    camera.position.copy(this.robot.position).add(new T.Vector3(0,.18,-.13));
    camera.rotation.set(-.14,0,0);
  }

  use(){
    if(this.z>-.94||this.x>-.99)return 'Follow the yellow line to the brass release by the back wall.';
    this.disconnect();
    this.open('crawler');
    return 'The gate is clear. Go inside and check the shelf for Cricket’s key.';
  }

  tick(){
    const m=this.mechanics;
    for(const name of ['jam','key']){
      if(this[name]&&!m.items.has(this[name].collider.handle))this[name]=null;
    }
    if(!this.tracked)return;
    if(!this.salvage.clock.running){
      if(this.active)this.disconnect();
      for(const name of ['jam','key']){
        const item=this[name];
        if(!item)continue;
        const position=m.carried===item?m.walker.current:m.isCargo(item)?m.car.body.translation():item.body.translation();
        if(flooded(position)){
          if(this.tow.first?.item===item||this.tow.second?.item===item)this.tow.clear();
          m.remove(item);
          this[name]=null;
        }
      }
      return;
    }
    if(m.area!==0)return;
    this.stock();
    const jam=this.jam;
    if(!jam||this.isOpen)return;
    const rig=this.tow;
    const hooked=rig.joint&&((rig.first.item===jam&&rig.second.item===m.car)||
      (rig.second.item===jam&&rig.first.item===m.car));
    if(hooked&&rig.reeling&&jam.body.translation().z>this.home.z+.76)this.open('winch');
    if(jam.body.translation().y<this.home.y-1.25)m.resetProp(jam,this.home);
  }

  objective(resident,diner){
    if(!this.tracked||this.mechanics.area!==0||this.bag.records.has(floodFiled))return null;
    const m=this.mechanics;
    if(this.bag.records.has(floodIdentified))return {text:'Storm Gate · Compare the key account with June',target:diner};
    if(this.key&&(m.carried===this.key||m.isCargo(this.key)||!flooded(this.key.body.translation()))){
      return {text:'Storm Gate · Bring Cricket’s cork key to the dry-house resident',target:resident};
    }
    if(!this.salvage.clock.running)return {text:'Storm Gate · Open the Submerged Street drain',target:this.salvage.control};
    const time=' · '+Math.ceil(this.salvage.clock.remaining)+' s';
    return this.isOpen?{text:'Storm Gate · Recover the key from the annex shelf'+time,target:this.shelf}:
      {text:'Storm Gate · Winch the timber clear or connect at the vent'+time,target:this.control};
  }
}
