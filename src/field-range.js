import * as T from 'three';
import R from 'rapier';
import {groundPoint,station} from './field-stations.js';
import {part} from './mechanics.js';

export function installFieldRange(mechanics,bag,notice,sound){
  const scene=mechanics.scenes[0];
  const base=groundPoint(13.2,-28);
  station(mechanics,0,groundPoint(10.9,-24.6),'Read the field range sign',()=>
    'The lever rifle can ring the brass bell or drop its iron counterweight. Use the red release plate beside the bell.',{color:0x9c7650});
  const timber=0x584735,brass=0xb89257;
  for(const offset of [-.65,.65]){
    const foot=groundPoint(base.x+offset,base.z);
    const top=base.y+2.55;
    part(scene,[.14,top-foot.y,.15],[foot.x,(foot.y+top)/2,foot.z],timber,.019);
  }
  part(scene,[1.56,.16,.2],[base.x,base.y+2.47,base.z],timber,.025);
  const bellPoint=base.clone().add(new T.Vector3(-.25,1.96,0));
  const bell=new T.Mesh(new T.CylinderGeometry(.12,.26,.34,28,true),
    new T.MeshStandardMaterial({color:brass,metalness:.63,roughness:.45,side:T.DoubleSide}));
  bell.position.copy(bellPoint);scene.add(bell);
  const bellTarget=mechanics.staticBox([.42,.35,.27],bellPoint.toArray(),brass);
  bellTarget.visual.visible=false;
  mechanics.tag(bellTarget.collider,{name:'Brass practice bell',action:()=> 'Shoot the bell to hear the report echo back.'});
  mechanics.onImpact.set(bellTarget.collider.handle,()=>{
    sound(560,360,.49,.25,bellPoint);
    if(!bag.records.has('range-bell'))bag.record('range-bell','Range bell rung','The bell rang at the Foxglove practice range.');
  });
  const platePoint=base.clone().add(new T.Vector3(.38,2.18,0));
  const plate=mechanics.staticBox([.18,.19,.1],platePoint.toArray(),0xb94d3c);
  const weightPoint=base.clone().add(new T.Vector3(.38,1.66,0));
  const suspended=part(scene,[.23,.26,.23],weightPoint.toArray(),0x4c5150,.032);
  const cord=part(scene,[.026,.38,.024],[weightPoint.x,weightPoint.y+.3,weightPoint.z],0x9f896c,.003);
  if(bag.records.has('range-counterweight')){suspended.visible=cord.visible=false;plate.visual.rotation.z=-.55;}
  mechanics.tag(plate.collider,{name:'Red counterweight release',action:()=> 'A solid rifle hit will trip the loaded catch.'});
  mechanics.onImpact.set(plate.collider.handle,round=>{
    if(round.variant!=='rifle'){notice('The loaded catch needs a stronger shot. Try the lever rifle.');return;}
    if(!suspended.visible)return;
    suspended.visible=cord.visible=false;
    plate.visual.rotation.z=-.55;
    const visual=suspended.clone();
    visual.geometry=visual.geometry.clone();visual.material=visual.material.clone();visual.visible=true;
    mechanics.dynamic({position:weightPoint.toArray(),visual,name:'Iron range counterweight',
      size:[.23,.26,.23],impactLimit:Infinity,life:120,
      shape:R.ColliderDesc.cuboid(.115,.13,.115).setDensity(7).setFriction(.52)});
    sound(210,62,.24,.2,weightPoint);
    bag.record('range-counterweight','Range counterweight released','A rifle shot tripped the red catch and dropped the practice weight.');
    notice('The rifle trips the catch. The counterweight drops.');
  });
}
