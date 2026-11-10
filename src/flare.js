import * as T from 'three';
import R from 'rapier';

export function fireFlare(mechanics,camera){
  if(mechanics.cooldown||mechanics.carried||mechanics.driving)return false;
  const direction=camera.getWorldDirection(new T.Vector3());
  const visual=new T.Group();
  const cartridge=new T.Mesh(new T.CapsuleGeometry(.044,.17,5,10),
    new T.MeshStandardMaterial({color:0x994332,emissive:0xff5b20,emissiveIntensity:1.5}));
  const light=new T.PointLight(0xff7942,35,15,2);
  light.position.y=.12;
  visual.add(cartridge,light);
  const flare=mechanics.dynamic({position:camera.position.clone().addScaledVector(direction,.6).toArray(),
    visual,kind:'prop',name:'Burning signal flare',area:mechanics.area,life:12,
    shape:R.ColliderDesc.ball(.087).setDensity(.6).setRestitution(.36)});
  flare.floatSurface=-1.51;
  flare.floatLift=44;
  flare.signalFlare=true;
  flare.body.setLinvel(direction.multiplyScalar(20).add(new T.Vector3(0,2.25,0)),true);
  mechanics.tag(flare.collider,{name:'Burning signal flare',action:()=> 'Too hot to pick up.'});
  mechanics.cooldown=.85;
  return true;
}

export function checkLookoutSignal(mechanics,lookout,bag,notice,sound){
  if(mechanics.area!==0||bag.records.has('lookout-flare'))return;
  for(const item of mechanics.items.values()){
    if(!item.signalFlare||item.area!==0)continue;
    const p=item.body.translation();
    if(Math.hypot(p.x-lookout.x,p.z-lookout.z)>5||Math.abs(p.y-lookout.y)>7)continue;
    bag.record('lookout-flare','Lookout signal acknowledged',
      'The lookout answered a flare with a rising tone on the field radio.');
    notice('A rising tone answers from the lookout. Signal acknowledged.');
    sound(lookout);
    break;
  }
}
