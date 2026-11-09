import * as T from 'three';
import {part} from './mechanics.js';
import {cabinX,cabinZ} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

export class CampLife {
  elapsed=null;
  energy=0;
  water=0;
  constructor(mechanics,bag,notice){
    Object.assign(this,{bag,notice});
    const rack=station(mechanics,0,groundPoint(cabinX+5.2,cabinZ+7.8),'Take camp ingredients',()=>{
      if(bag.records.has('camp-ingredients')||this.elapsed!==null)return 'The next batch is already out.';
      bag.record('camp-ingredients','Camp ingredients','Beans, corn and peppers for the skillet.','Cargo');
      return 'Ingredients packed. Use the skillet on the cookstove.';
    });
    for(const x of [-.17,0,.17])part(rack.body,[.12,.17,.12],[x,1.02,0],0xd3ae60,.028);
    const stove=station(mechanics,0,groundPoint(cabinX+6.6,cabinZ+7.1),'Use the camp skillet',()=>this.cook());
    const skillet=new T.Mesh(new T.CylinderGeometry(.25,.21,.09,22),new T.MeshStandardMaterial({color:0x2c2e2c,roughness:.77}));
    skillet.position.y=1;stove.body.add(skillet);
    part(stove.body,[.33,.043,.059],[.31,1,0],0x42342a,.015);
    this.food=new T.Mesh(new T.CylinderGeometry(.197,.18,.025,20),
      new T.MeshStandardMaterial({color:0xbe7637,roughness:.95}));
    this.food.position.y=1.055;this.food.visible=false;stove.body.add(this.food);
    this.heat=new T.PointLight(0xff973e,0,3,2);
    this.heat.position.set(0,.98,.18);stove.body.add(this.heat);
    const pump=station(mechanics,0,groundPoint(cabinX+7.8,cabinZ+5.4),'Refill canteen and drink at the hand pump',()=>{
      this.water=2;
      return this.drink();
    },{color:0x517b75});
    part(pump.body,[.08,.3,.09],[0,1.07,0],0x567e7b,.012);
    part(pump.body,[.28,.05,.055],[.12,1.22,0],0x344540,.017);
    station(mechanics,0,groundPoint(cabinX+5.5,cabinZ+5.6),'Eat a meal at the mess station',()=>this.eat());
    station(mechanics,0,groundPoint(cabinX+7.1,cabinZ+8.8),'Leave a hot meal for the ranger',()=>{
      if(bag.records.has('ranger-supper'))return 'The ranger left a clean plate and a note of thanks.';
      if(!bag.records.has('camp-meal'))return 'The ranger’s plate is empty. Cook a fresh skillet meal to fill it.';
      bag.forget('camp-meal');
      bag.record('ranger-supper','A hot supper','Delivered a meal to the ranger after his creek rounds. He marked an old survey cache beside the ford.','Keepsakes');
      return 'Supper delivered. The ranger’s note mentions an old survey cache beside the ford.';
    });
    const cache=station(mechanics,0,groundPoint(-4.9,4.8),'Search the ranger’s survey cache',()=>{
      if(!bag.records.has('ranger-supper'))return 'There’s a locked survey box beneath the lid. The ranger might know the combination.';
      if(bag.records.has('ranger-cache'))return 'You already recovered the survey tokens.';
      bag.record('ranger-cache','Brass survey tokens','Three brass tokens stamped with the former name of the ridge.','Keepsakes');
      return 'Cache opened. Three old brass survey tokens recovered.';
    },{color:0x53655c});
    part(cache.body,[.37,.035,.22],[0,.96,0],0x998360,.012);
    bag.record('canteen','Field canteen','Refill at the Foxglove Camp hand pump. U or Sip drinks from the canteen.','Gear');
  }
  cook(){
    if(this.elapsed===null){
      if(this.bag.records.has('camp-meal'))return 'Eat or deliver the meal you already packed before cooking another.';
      if(!this.bag.records.has('camp-ingredients'))return 'Get ingredients from the camp pantry rack first.';
      this.bag.forget('camp-ingredients');
      this.elapsed=0;
      this.food.visible=true;
      this.food.material.color.setHex(0xb4864b);
      this.heat.intensity=5;
      return 'Skillet on the heat. Wait for the golden crust, then use the skillet to lift it off.';
    }
    if(this.elapsed<5)return 'Still simmering. Watch for the food to turn golden.';
    const burned=this.elapsed>=12;
    this.elapsed=null;
    this.food.visible=false;
    this.heat.intensity=0;
    if(burned)return 'The batch burned. Clear the skillet and try a fresh batch from the pantry.';
    this.bag.record('camp-meal','Hot skillet meal','Eat at the mess station or share it with the ranger.','Cargo');
    return 'Meal packed. Eat at the mess station or deliver a plate for the ranger.';
  }
  drink(){
    if(!this.water)return 'Canteen empty. Refill at the Foxglove Camp hand pump.';
    this.water--;
    this.hydrated=110;
    return 'You drink from the canteen. A small jump boost for the next stretch. '+this.water+' sips left.';
  }
  eat(){
    if(!this.bag.records.has('camp-meal'))return 'Cook a skillet meal before sitting down to eat.';
    this.bag.forget('camp-meal');
    this.energy=110;
    return 'You eat the hot skillet meal. Sprint speed improved for a short time. On touch, push the movement stick all the way.';
  }
  tick(dt){
    this.energy=Math.max(0,this.energy-dt);
    this.hydrated=Math.max(0,(this.hydrated??0)-dt);
    if(this.elapsed===null)return;
    const previous=this.elapsed;
    this.elapsed+=dt;
    if(previous<5&&this.elapsed>=5){
      this.food.material.color.setHex(0xe0a33c);
      this.notice('Skillet golden. Lift it off the heat now.');
    }
    if(previous<12&&this.elapsed>=12){
      this.food.material.color.setHex(0x352820);
      this.notice('The skillet burned. Clear it before cooking another batch.');
    }
  }
}
