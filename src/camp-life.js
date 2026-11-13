import * as T from 'three';
import {part} from './mechanics.js';
import {cabinX,cabinZ} from './terrain.js';
import {stewName,stewShared} from './field-stew.js';
import {groundPoint,station} from './field-stations.js';

export class CampLife {
  elapsed=null;
  energy=0;
  water=0;
  constructor(mechanics,bag,notice){
    Object.assign(this,{bag,notice});
    this.installCookoff(mechanics);
    const rack=station(mechanics,0,groundPoint(cabinX+5.2,cabinZ+7.8),'Take camp ingredients',()=>{
      if(bag.records.has('camp-ingredients')||this.elapsed!==null)return 'The next batch is already out.';
      bag.record('camp-ingredients','Camp ingredients','Beans, corn and peppers for the skillet.','Cargo');
      return 'Ingredients packed. Use the skillet, or bring cottontail meat to the stockpot for creek stew.';
    });
    for(const x of [-.17,0,.17])part(rack.body,[.12,.17,.12],[x,1.02,0],0xd3ae60,.028);
    const lure=station(mechanics,0,groundPoint(cabinX+4.1,cabinZ+8.75),'Check the pantry bait tin',()=>{
      if(!bag.records.has('bait-cooler-returned'))return 'The bait crew is still waiting for their cooler.';
      if(bag.records.has('cottontail-lure'))return 'You already have bait packed.';
      bag.record('cottontail-lure','Cottontail trail bait','Use this at the cottontail track station. Refill the tin at camp.','Cargo');
      return 'Bait packed. Use it at the cottontail tracks.';
    },{color:0x645d3d});
    part(lure.body,[.23,.13,.19],[0,1.01,0],0x6c8063,.025);
    const stove=station(mechanics,0,groundPoint(cabinX+6.6,cabinZ+7.1),'Use the camp skillet',()=>this.cook());
    const skillet=new T.Mesh(new T.CylinderGeometry(.25,.21,.09,22),new T.MeshStandardMaterial({color:0x2c2e2c,roughness:.77}));
    skillet.position.y=1;stove.body.add(skillet);
    part(stove.body,[.33,.043,.059],[.31,1,0],0x42342a,.015);
    this.food=new T.Mesh(new T.CylinderGeometry(.197,.18,.025,20),
      new T.MeshStandardMaterial({color:0xbe7637,roughness:.95}));
    this.food.position.y=1.055;this.food.visible=false;stove.body.add(this.food);
    this.heat=new T.PointLight(0xff973e,0,3,2);
    this.heat.position.set(0,.98,.18);stove.body.add(this.heat);
    const stew=station(mechanics,0,groundPoint(cabinX+4.25,cabinZ+6.72),'Cook creek stew in the stockpot',
      ()=>this.cook(stewHearth),{color:0x615347});
    const pot=new T.Mesh(new T.CylinderGeometry(.245,.21,.29,24),
      new T.MeshStandardMaterial({color:0x42494a,metalness:.62,roughness:.37}));
    pot.position.y=1.09;pot.castShadow=true;pot.receiveShadow=true;stew.body.add(pot);
    for(const x of [-.245,.245]){
      const handle=new T.Mesh(new T.TorusGeometry(.102,.023,8,18),pot.material);
      handle.position.set(x,1.13,0);handle.scale.set(1,.49,1);
      handle.rotation.x=-Math.PI/3;stew.body.add(handle);
    }
    const broth=new T.Mesh(new T.CircleGeometry(.225,24),new T.MeshStandardMaterial({color:0x9d673c,roughness:.4}));
    broth.rotation.x=-Math.PI/2;broth.position.y=1.24;broth.visible=false;stew.body.add(broth);
    const fire=new T.PointLight(0xffa24c,0,3,2);
    fire.position.set(0,.96,.15);stew.body.add(fire);
    const stewHearth={food:broth,heat:fire,stew:true};
    const pump=station(mechanics,0,groundPoint(cabinX+7.8,cabinZ+5.4),'Refill canteen and drink at the hand pump',()=>this.refill(),{color:0x517b75});
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
    bag.record('canteen','Field canteen','Refill at the Foxglove Camp hand pump or with a field filter. U or Sip drinks from the canteen.','Gear');
  }
  installCookoff(mechanics){
    const pans=[];
    const shift=station(mechanics,0,groundPoint(cabinX+9.4,cabinZ+8.7),'Read the midnight cook-off card',()=>{
      if(this.bag.records.has('midnight-cookoff'))return 'The night crew signed your card. Their spice tin is yours to use at the pantry.';
      return 'The night shift needs two hot plates. Start each skillet and lift it when golden. The right burner runs cold until you open its draft.';
    },{color:0x887049});
    part(shift.body,[.24,.025,.27],[0,.96,0],0xceb588,.005);
    const draft=station(mechanics,0,groundPoint(cabinX+10.8,cabinZ+9.2),'Open or close the cook-off stove draft',()=>{
      this.draftOpen=!this.draftOpen;
      return this.draftOpen?'Draft open. The right skillet now heats at full strength.':'Draft closed. The right skillet is barely warming.';
    },{color:0x77624a});
    part(draft.body,[.14,.14,.07],[0,1.01,.06],0x984737,.015);
    for(const [i,label] of ['left','right'].entries()){
      const pan={elapsed:null,done:false};
      const stove=station(mechanics,0,groundPoint(cabinX+9.4+i*1.4,cabinZ+7.2),'Work the '+label+' cook-off skillet',()=>{
        if(this.bag.records.has('midnight-cookoff'))return 'The night shift has eaten.';
        if(pan.done)return 'This plate is ready. Finish the other skillet.';
        if(pan.elapsed===null){
          pan.elapsed=0;
          pan.food.material.color.setHex(0xb4864b);
          return 'Skillet on. Watch for a golden crust.';
        }
        if(pan.elapsed<5)return 'Still simmering.';
        if(pan.elapsed>=12){
          pan.elapsed=null;
          pan.food.material.color.setHex(0x525052);
          return 'This batch burned. The night crew left enough ingredients to try again.';
        }
        pan.done=true;
        if(!pans.every(entry=>entry.done))return 'One hot plate ready. Finish the other skillet.';
        this.bag.record('midnight-cookoff','Night shift spice tin',
          'You served two hot plates to the relief crew. Their spice mix now improves the stamina boost of meals you cook and eat.','Gear');
        return 'Two hot plates served. You earned the night shift spice tin.';
      },{color:0x7f5d4c});
      pan.food=part(stove.body,[.36,.07,.36],[0,.98,0],0x525052,.025);
      pans.push(pan);
    }
    this.cookoff=pans;
  }
  cook(hearth=this){
    if(this.elapsed===null){
      if(this.bag.records.has('camp-meal'))return 'Eat or deliver the meal you already packed before cooking another.';
      if(hearth.stew&&(!this.bag.records.has('camp-ingredients')||!this.bag.records.has('cottontail-meat'))){
        return 'Creek stew takes one portion of cottontail and one pack of beans, corn and peppers.';
      }
      this.meatMeal=this.bag.records.has('cottontail-meat');
      if(!this.meatMeal&&!this.bag.records.has('camp-ingredients'))return 'Get ingredients from the camp pantry rack first.';
      if(this.meatMeal)this.bag.forget('cottontail-meat');
      if(hearth.stew||!this.meatMeal)this.bag.forget('camp-ingredients');
      this.elapsed=0;
      this.hearth=hearth;
      hearth.food.visible=true;
      hearth.food.material.color.setHex(0xb4864b);
      hearth.heat.intensity=5;
      if(hearth.stew)return 'Stockpot on the heat. Wait for the broth to turn amber, then use the pot to pack the stew.';
      return 'Skillet on the heat. Wait for the golden crust, then use the skillet to lift it off.';
    }
    if(hearth!==this.hearth)return 'Finish the meal at the stove where you started it.';
    const {stew}=hearth;
    if(this.elapsed<(stew?9:5))return stew?'The broth is still thin. Let it simmer.':'Still simmering. Watch for the food to turn golden.';
    const burned=this.elapsed>=(stew?21:12);
    this.elapsed=null;
    hearth.food.visible=false;
    hearth.heat.intensity=0;
    if(burned&&stew)return 'The broth scorched. The pot is clear for a fresh batch with new ingredients.';
    if(burned)return 'The batch burned. Clear the skillet and try a fresh batch from the pantry.';
    this.bag.record('camp-meal',stew?stewName:this.meatMeal?'Roasted cottontail':'Hot skillet meal',
      stew?'Eat at the mess station or bring the pot to June’s relief crew.':'Eat at the mess station or share it with the ranger.','Cargo');
    if(stew)return 'Stew packed. Eat at the mess station or bring it to June’s diner.';
    return 'Meal packed. Eat at the mess station or deliver a plate for the ranger.';
  }
  refill(){
    this.water=2;
    return this.drink();
  }
  drink(){
    if(!this.water)return 'Canteen empty. Refill at the Foxglove Camp hand pump.';
    this.water--;
    this.hydrated=110;
    return 'You drink from the canteen. A small jump boost for the next stretch. '+this.water+' sips left.';
  }
  eat(){
    if(!this.bag.records.has('camp-meal'))return 'Cook a skillet meal before sitting down to eat.';
    const meal=this.bag.records.get('camp-meal')?.name;
    this.bag.forget('camp-meal');
    const duration=meal===stewName?(this.bag.records.has(stewShared)?260:225):meal==='Roasted cottontail'?165:110;
    this.energy=duration+(this.bag.records.has('midnight-cookoff')?30:0);
    return 'You eat the hot skillet meal. Sprint speed improved for a short time. On touch, push the movement stick all the way.';
  }
  tick(dt){
    for(const [i,pan] of (this.cookoff??[]).entries()){
      if(pan.elapsed===null||pan.done)continue;
      const before=pan.elapsed;
      pan.elapsed+=dt*(i===0||this.draftOpen?1:.44);
      const side=i===0?'Left':'Right';
      if(before<5&&pan.elapsed>=5&&pan.elapsed<12)this.notice(side+' cook-off skillet is golden. Lift it now.');
      if(before<12&&pan.elapsed>=12)this.notice(side+' cook-off skillet burned. Use it to clear the pan.');
      pan.food.material.color.setHex(pan.elapsed>=12?0x352820:pan.elapsed>=5?0xe0a33c:0xb4864b);
    }
    this.energy=Math.max(0,this.energy-dt);
    this.hydrated=Math.max(0,(this.hydrated??0)-dt);
    if(this.elapsed===null)return;
    const previous=this.elapsed;
    this.elapsed+=dt;
    const stew=this.hearth.stew,ready=stew?9:5,burn=stew?21:12;
    if(previous<ready&&this.elapsed>=ready&&this.elapsed<burn){
      this.hearth.food.material.color.setHex(0xe0a33c);
      this.notice(stew?'The broth has turned amber. Pack the stew now.':'Skillet golden. Lift it off the heat now.');
    }
    if(previous<burn&&this.elapsed>=burn){
      this.hearth.food.material.color.setHex(0x352820);
      this.notice(stew?'The broth scorched. Use the pot to clear it.':'The skillet burned. Clear it before cooking another batch.');
    }
  }
}
