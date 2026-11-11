import {documentProp} from './props.js';
import * as T from 'three';
import R from 'rapier';
import {part,vec} from './mechanics.js';
import {basin,height} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const loads=[
  {id:'records',name:'Missing-person ledger',scale:1.36,x:-4.3,z:13.3,
    result:'The ledger records a town evacuation the official report never mentioned. One name is listed under two different addresses.'},
  {id:'pump',name:'Transfer pump assembly',model:'transferPump',scale:1.5,x:4.4,z:16.5,
    result:'You saved a working transfer pump. It buys future salvage crews an extra thirty seconds below the waterline.'},
  {id:'water',name:'Emergency water jug',model:'waterJug',scale:1,x:-4.1,z:19.5,
    result:'You delivered water to the family camped above the pond. They set up a free canteen refill at the high-bank drop.'}
];
const outside=32;
const underWater=p=>Math.abs(p.x-basin.x)<10.9&&p.z>=basin.back&&p.z<24;

export class SalvageClock {
  remaining=0;
  running=false;
  start(extended=false){this.remaining=extended?115:85;this.running=true;}
  advance(dt){
    if(!this.running)return '';
    const previous=this.remaining;
    this.remaining=Math.max(0,previous-dt);
    if(!this.remaining){this.running=false;return 'flood';}
    if(previous>15&&this.remaining<=15)return 'bell';
    return '';
  }
}

export class SalvageStreet {
  clock=new SalvageClock();
  cargo=[];
  surface=basin.water;
  constructor(mechanics,pipeline,models,bag,chapters,campLife,notice,bell){
    Object.assign(this,{mechanics,pipeline,models,bag,chapters,campLife,notice,bell});
    const scene=mechanics.scenes[0];
    const x=basin.x;
    const houseScale=.67;
    for(const [dx,z,yaw] of [[-7.3,12.9,Math.PI/2],[7.4,17,-Math.PI/2]]){
      const y=height(x+dx,z);
      pipeline.place(models.cabin,{position:[x+dx,y,z],scale:houseScale,yaw,collider:'authored'});
      if(dx<0){
        pipeline.place(models.pairedKitchen,{
          position:[x+dx,y+.3*houseScale,z],scale:houseScale,yaw,collider:'authored'
        });
        const clock=[x+dx-2.45*houseScale,y+1.83*houseScale,z-.15*houseScale];
        scene.add(pipeline.prepare(models.kitchenClock,{position:clock,scale:houseScale,yaw}));
        const sensor=mechanics.world.createCollider(R.ColliderDesc.ball(.21)
          .setTranslation(clock[0]+.12,clock[1],clock[2]).setSensor(true).setCollisionGroups((128<<16)|2));
        mechanics.tag(sensor,{name:'Listen by the flooded kitchen clock',contact:()=>{
          if(!this.clock.running)return {strength:0,message:'The flooded wall is out of reach until you drain the street.'};
          if(chapters.ending==='seal')return {strength:0,message:'The sealed arch has silenced the knocking.'};
          if(!bag.records.has('flooded-knock')){
            bag.record('flooded-knock','Three knocks in the flooded kitchen',
              'The rhythm matches the dry house. Ask its resident how she knows the signal.');
          }
          return {strength:.71,message:'Three hard knocks resonate through the clock’s mounting screws.'};
        },action:()=>{
          if(!this.clock.running)return 'Wait for the street to drain before listening inside.';
          if(!bag.records.has('extraction-return')||!chapters.ending){
            return 'Water has stopped the hands at nine. A faint knock seems to come from behind the wall.';
          }
          return chapters.ending==='seal'?
            'Behind the clock there is only the sound of draining water. The knocks have stopped.' :
            'Three knocks come from behind the clock. A voice names the dry address, then asks you to keep the porch light on.';
        }});
      }
    }
    // Sloped entry stays on the terrain so the wagon can cross it.
    for(let z=10;z<34;z+=.84)for(const dx of [-2.2,2.2]){
      const stone=part(scene,[.43,.1,.7],[x+dx,height(x+dx,z)+.035,z],0x645d54,.031);
      stone.rotation.y=Math.sin(z*1.8)*.09;
    }
    const control=station(mechanics,0,groundPoint(x+3.05,34),'Drain the submerged street',()=>this.start(),{color:0x778474});
    control.body.add(pipeline.prepare(models.transferPump,{position:[0,.944,0],scale:1.1}));
    this.control=control.point;
    this.warning=new T.PointLight(0xff923d,0,7,2);
    this.warning.position.set(0,1.5,0);
    control.body.add(this.warning);
    const drop=station(mechanics,0,groundPoint(x-3.05,33),'Inspect the high-bank salvage drop',()=>
      this.bag.records.has('pond-water')?this.campLife.refill():
        'Unload your wagon here. Bring one intact find to the drop before opening another run.',{color:0xba854f});
    drop.body.add(pipeline.prepare(models.lantern,{position:[.11,.945,0],scale:.73}));
    this.drop=drop.point;
    this.mechanics.fixed.get(drop.collider.handle).acceptName='Turn in this salvage';
    this.mechanics.fixed.get(drop.collider.handle).accept=item=>this.deliver(item);
    this.ledgerModel=documentProp(false);
    part(this.ledgerModel,[.37,.08,.37],[0,-.045,0],0x42453e,.024);
    for(const x of [-.127,.127])part(this.ledgerModel,[.022,.014,.36],[x,.07,0],0x4b3527,.006);
    this.water=new T.Mesh(new T.PlaneGeometry(21.8,15),new T.MeshStandardMaterial({
      color:0x296b65,transparent:true,opacity:.88,roughness:.38,metalness:.19,side:T.DoubleSide
    }));
    this.water.rotation.x=-Math.PI/2;
    this.water.position.set(x,this.surface,(basin.back+24)/2);
    scene.add(this.water);
  }
  start(){
    if(this.chapters.stage<4)return 'The drain motor is locked. The old survey crossing notes explain how to open it.';
    if(this.clock.running)return 'The street is draining. One load per run. Follow the curb back up the ramp.';
    const remaining=this.cargo.filter(item=>this.mechanics.items.has(item.collider.handle));
    if(remaining.some(item=>item===this.mechanics.cargo||item===this.mechanics.carried||!underWater(item.body.translation()))){
      return 'Turn in the salvage you already brought uphill before starting another run.';
    }
    for(const item of remaining)this.mechanics.remove(item);
    this.cargo.length=0;
    const picks=loads.filter(load=>!this.bag.records.has('pond-'+load.id));
    if(!picks.length)return 'All three salvage requests are filled.';
    for(const load of picks)this.stock(load);
    this.clock.start(this.bag.records.has('pond-pump'));
    return 'Drain open. Drive down the curb-lined ramp. When the bell sounds, you have fifteen seconds to get uphill.';
  }
  stock(load){
    const m=this.mechanics;
    const {visual,shape}=this.pipeline.loose(load.model?this.models[load.model]:this.ledgerModel,load.scale);
    const bounds=new T.Box3().setFromObject(visual);
    const size=bounds.getSize(new T.Vector3()).toArray();
    const x=basin.x+load.x,z=load.z;
    const item=m.dynamic({visual,shape,size,position:[x,height(x,z)-bounds.min.y+.06,z],area:0,name:load.name,
      impactLimit:Infinity,breakEffect:()=>{}});
    item.salvage=load;
    this.cargo.push(item);
  }
  deliver(item){
    if(!item.salvage)return 'The drop accepts a find from the submerged street.';
    const {id,name,result}=item.salvage;
    this.mechanics.remove(item);
    this.bag.record('pond-'+id,name,result,'Keepsakes');
    if(this.clock.running&&this.clock.remaining>15){
      this.clock.remaining=15;
      this.bell?.();
    }
    return result;
  }
  flood(){
    const m=this.mechanics;
    for(const item of this.cargo){
      if(!m.items.has(item.collider.handle))continue;
      const location=item===m.cargo?m.car.body.translation():item===m.carried?m.walker.current:item.body.translation();
      if(underWater(location))m.remove(item);
    }
    const player=m.driving?m.car.body.translation():m.walker.current;
    if(m.area!==0||!underWater(player)){
      this.notice('The gates reopened. Salvage below the waterline is lost for this run.');
      return;
    }
    const x=basin.x,z=outside,y=height(x,z);
    m.anchor=null;
    if(m.driving){
      m.car.body.setTranslation({x,y:y+.74,z},true);
      m.car.body.setLinvel({x:0,y:0,z:0},true);
      m.car.body.setAngvel({x:0,y:0,z:0},true);
    }else{
      const spawn=m.walker.spawn;
      m.walker.teleport([x,y+.91,z]);m.walker.spawn=spawn;
    }
    this.notice('The returning water washed you back to the ramp. The drain can be opened again.');
  }
  tick(dt){
    const signal=this.clock.advance(dt);
    this.warning.intensity=this.clock.running&&this.clock.remaining<=15?
      8+8*Math.sin(this.clock.remaining*10):0;
    if(signal==='bell'){this.bell();this.notice('Warning bell. Get uphill. Fifteen seconds until the gates open.');}
    if(signal==='flood'){this.bell();this.flood();}
    const target=this.clock.running?basin.floor-.35:basin.water;
    this.surface=T.MathUtils.lerp(this.surface,target,1-Math.exp(-dt*1.45));
    this.water.position.y=this.surface;
  }
  objective(){
    if(this.mechanics.area!==0)return null;
    if(this.clock.running){
      const item=this.mechanics.cargo??this.mechanics.carried;
      return {text:'Submerged Street · '+Math.ceil(this.clock.remaining)+'s · '+
        (item?.salvage?'Get the salvage up the ramp': 'Choose one load and get uphill'),
        target:item?.salvage?this.drop:null};
    }
    if(this.cargo.some(item=>this.mechanics.items.has(item.collider.handle)))return {
      text:'Submerged Street · Turn in the salvage at the high-bank drop',target:this.drop
    };
    if(this.chapters.needsArchive?.()){
      if(this.bag.records.has('pond-records'))return null;
      return {text:'Chapter 4 · Drain Submerged Street and recover the missing-person ledger',target:this.control};
    }
    const player=this.mechanics.driving?this.mechanics.car.body.translation():this.mechanics.walker.current;
    if(this.chapters.stage>=4&&!loads.every(load=>this.bag.records.has('pond-'+load.id))&&
      Math.hypot(player.x-basin.x,player.z-outside)<19){
      return {text:'Optional · Submerged Street drain and salvage ramp',target:this.control};
    }
    return null;
  }
}
