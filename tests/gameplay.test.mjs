import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const dependencies=new Map([
  ['three',new URL('../vendor/three.module.js',import.meta.url).href],
  ['rapier',new URL('../vendor/rapier.mjs',import.meta.url).href]
]);
registerHooks({
  resolve(name,context,next){
    const url=dependencies.get(name)??(name.startsWith('three/addons/')
      ?new URL('../vendor/addons/'+name.slice('three/addons/'.length),import.meta.url).href:null);
    return url?{url,shortCircuit:true}:next(name,context);
  }
});
const {BaitWatch,ReelEdit,MailRoute}=await import('../src/finale.js');
const T=await import('three');
const {default:R}=await import('rapier');

test('reel editor rejects a bad cut and accepts the repaired splice',()=>{
  const edit=new ReelEdit();
  edit.cut();
  assert.match(edit.review(),/intact/);
  edit.undo();
  edit.step(1);
  edit.step(1);
  edit.cut();
  edit.step(1);
  edit.step(1);
  edit.cut();
  assert.equal(edit.review(),'');
});

test('bait camera requires tracks and distinguishes both timed outcomes',()=>{
  const watch=new BaitWatch();
  assert.equal(watch.aim('bank'),false);
  watch.baited=true;
  watch.tracked=true;
  watch.aim('crate');
  watch.tick(5);
  assert.equal(watch.sighting,'');
  watch.tick(1);
  assert.equal(watch.sighting,'thief');
  watch.aim('bank');
  watch.tick(11);
  assert.equal(watch.sighting,'');
  watch.tick(1);
  assert.equal(watch.sighting,'echo');
});

function element(){
  return {
    children:[],dataset:{},
    setAttribute(){},
    append(...nodes){this.children.push(...nodes);},
    querySelectorAll(){return this.children.filter(node=>'choice' in node.dataset);}
  };
}

await R.init({});
for(const flooded of [false,true]){
  test(flooded?'flood mail route awards Cal’s letter':'normal mail route accepts the neighbor clue',t=>{
    let dialog;
    const storage=new Map();
    const previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
      getItem:key=>storage.get(key)??null,
      setItem:(key,value)=>storage.set(key,value)
    }});
    t.after(()=>{
      if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);
      else delete globalThis.localStorage;
    });
    globalThis.document={body:element(),createElement:()=>({...element(),showModal(){dialog=this;}})};
    t.after(()=>{delete globalThis.document;});
    const world=new R.World({x:0,y:-9.81,z:0});
    t.after(()=>world.free());
    const records=new Map(),actions=new Map();
    const bag={records,record:(id,name)=>records.set(id,name),forget:id=>records.delete(id)};
    const mechanics={world,scenes:[new T.Scene()],tag:(_,tag)=>actions.set(tag.name,tag.action)};
    const finale={flood:0};
    new MailRoute(mechanics,bag,{prepare:()=>new T.Group()},{receiver:{}},finale);
    const use=name=>actions.get(name)();
    const sort=index=>{
      use('Sort the outbound mail');
      dialog.querySelectorAll()[index].onclick();
    };
    sort(1);
    assert(!records.has('mail'));
    sort(0);
    assert.match(use('Deliver Vale House letter'),/Letter delivered/);
    sort(1);
    if(flooded){
      finale.flood=1;
      assert.match(use('Deliver to the caretaker'),/emergency mail drop/);
      assert.match(use('Check the emergency mail drop'),/Flood route complete/);
    }else{
      assert.match(use('Deliver to the caretaker'),/forwarding slip/);
      use('Read the neighbor’s delivery note');
      assert.match(use('Deliver to the caretaker'),/Last Delivery complete/);
    }
    assert(records.has('cals-letter'));
    assert(!records.has('mail'));
    assert.match(use('Check the dispatch ledger'),/Route closed/);
  });
}

// Opt in with FUNKYTOWN_LIVE_URL to detect a stale or incomplete production upload.
const liveUrl=process.env.FUNKYTOWN_LIVE_URL;
if(liveUrl){
  test('live site serves the game files from this checkout',async()=>{
    const paths=['index.html','style.css','src/main.js','src/finale.js','src/rescue.js','src/gear.js'];
    await Promise.all(paths.map(async path=>{
      const url=new URL(path,liveUrl.endsWith('/')?liveUrl:liveUrl+'/');
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
      assert.equal(response.status,200,path);
      const expected=await readFile(new URL('../'+path,import.meta.url),'utf8');
      assert.ok(await response.text()===expected,path+' differs from the checkout');
    }));
  });
}

test('creek line trips the clutch, strikes the low shelf and rewards a clean haul and ride',async()=>{
  globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
  const {RescueLine}=await import('../src/rigging.js');
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  let completed=false,notice='';
  let position;
  const line=new RescueLine({world,tag(){},scenes:[new T.Scene()],walker:{ride:p=>{position=p.clone();}}},
    message=>{notice=message;},()=>true,()=>completed,()=>{completed=true;});
  const run=(x=0,jump=false)=>{
    for(let i=0;i<900&&line.active;i++)line.step({x,z:1,jump:jump&&i===0},1/60);
  };
  line.start();run(-1);
  assert.match(notice,/clutch/);
  line.start();run(0,true);
  assert.match(notice,/shelf/);
  line.start();run();
  assert.equal(completed,true);
  line.start();run();
  assert.equal(line.active,null);
  assert.equal(position.z,line.landing.z+1.3);
  world.free();
});

test('camp cooking allows a hot meal, a burnt batch, and drinking from a finite canteen',async()=>{
  const {CampLife}=await import('../src/camp-life.js');
  const records=new Map();
  const bag={records,record:(id)=>records.set(id,true),forget:id=>records.delete(id)};
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  const camp=new CampLife({world,tag(){},scenes:[new T.Scene()]},bag,()=>{});
  bag.record('camp-ingredients');
  assert.match(camp.cook(),/heat/);
  camp.tick(4);
  assert.match(camp.cook(),/simmering/);
  camp.tick(2);
  assert.match(camp.cook(),/Meal packed/);
  assert.match(camp.eat(),/eat/);
  assert.ok(camp.energy>0);
  bag.record('camp-ingredients');
  camp.cook();
  camp.tick(13);
  assert.match(camp.cook(),/burned/);
  assert.equal(records.has('camp-meal'),false);
  camp.water=1;
  assert.match(camp.drink(),/You drink/);
  assert.match(camp.drink(),/empty/);
  world.free();
});

test('chapter route resets a wrong gauge order and persists each arch ending',async()=>{
  const {Chapters}=await import('../src/chapters.js');
  const {Rescue}=await import('../src/rescue.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker}=await import('../src/walker.js');
  await R.init();
  const storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
  for(const ending of ['seal','hold']){
    storage.clear();
    const world=new R.World({x:0,y:-9.81,z:0});
    const scenes=[new T.Scene(),new T.Scene()];
    const walker=new Walker(world,[0,2,0]);
    const mechanics=new Mechanics(world,walker,...scenes);
    const tags=mechanics.fixed;
    const camera=new T.PerspectiveCamera();
    function shootAt(point){
      camera.position.copy(point).add(new T.Vector3(0,0,1.2));
      camera.lookAt(point);camera.updateMatrixWorld(true);
      world.step(mechanics.events);
      mechanics.fire(camera);
      for(let i=0;i<14;i++){
        mechanics.before(camera,{x:0,z:0},{actions:new Set()});
        world.step(mechanics.events);
        mechanics.after();
      }
    }
    const story={area:0,state:4,gates:[new T.Vector3(),new T.Vector3()]};
    const records=new Map(),bag={records,record:(id,name)=>records.set(id,name)};
    storage.set('bellwether-rescue-v1','4');
    const rescue=new Rescue(mechanics,story,bag,()=>{});
    const finale={choice:'public',rescue};
    const chapter=new Chapters(mechanics,story,finale,bag,()=>{});
    const interact=(name)=>[...tags.values()].find(action=>action.name===name).action();
    assert.match(interact('Read the emergency dispatch ledger'),/Shoot blue/);
    const shootGauge=index=>shootAt(chapter.gauges[index].point);
    shootGauge(1);
    assert.equal(chapter.pulses,1);
    assert.ok(chapter.gauges[1].visual.material.emissiveIntensity>1);
    shootGauge(2);
    assert.equal(chapter.pulses,0);
    assert.ok(chapter.gauges[1].visual.material.emissiveIntensity<.2);
    shootGauge(1);shootGauge(0);shootGauge(2);
    assert.equal(chapter.stage,2);
    interact('Read the exposed route marker');
    assert.match(interact('Recover Mom’s original recording'),/Grapple/);
    mechanics.changeArea(1);
    camera.position.copy(chapter.echoRing).add(new T.Vector3(0,-1.5,3));
    camera.lookAt(chapter.echoRing);camera.updateMatrixWorld(true);
    assert.match(mechanics.grapple(camera),/latch swings open/);
    interact('Recover Mom’s original recording');
    mechanics.changeArea(0);
    const archChoice=ending==='seal'?'Seal the arch':'Keep the arch open for a rescue';
    if(ending==='hold'){
      records.set('founders-original-tape',true);
      chapter.tick();
      assert.match(interact(archChoice),/Hear the ranger/);
      assert.match(chapter.objective().text,/Ask the ranger/);
      assert.match(interact('Speak to the ranger'),/other Cal/);
      assert.match(chapter.objective().text,/Hear Cal’s family/);
      assert.match(interact('Hear Cal’s family out'),/Cricket/);
      assert.ok(records.has('extraction-ranger')&&records.has('extraction-family'));
    }
    interact(archChoice);
    assert.equal(story.archSealed,ending==='seal');
    assert.equal(new Chapters(mechanics,story,finale,bag,()=>{}).ending,ending);
    world.free();
  }
});

test('field prop GLBs load and real impacts shatter a jug and detonate a fuel can',async()=>{
  const {AssetPipeline}=await import('../src/assets.js');
  const {FieldProps}=await import('../src/field-props.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  const scene=new T.Scene(),realm=new T.Scene();
  const walker=new Walker(world,[0,1,8]);
  const mechanics=new Mechanics(world,walker,scene,realm);
  const pipeline=new AssetPipeline(scene,world);
  async function model(path){
    const bytes=await readFile(new URL('../assets/'+path,import.meta.url));
    const gltf=await pipeline.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    return gltf.scene;
  }
  const models={waterJug:await model('pump-water-jug.glb'),fuelCan:await model('creek-fuel-can.glb'),
    transferPump:await model('creek-transfer-pump.glb')};
  const sensor=world.createCollider(R.ColliderDesc.ball(.4).setSensor(true).setTranslation(0,1,10));
  mechanics.tag(sensor,{});
  const records=new Map();
  const bag={records,record:id=>records.set(id,true)};
  const sounds=[];
  const props=new FieldProps(mechanics,pipeline,models,{rangerSensor:sensor,story:{state:4}},bag,()=>{},event=>sounds.push(event));
  mechanics.staticBox([20,.2,20],[0,-.1,0],0x555555);
  const frame=()=>{
    mechanics.before(camera,{},{actions:new Set()});
    world.step(mechanics.events);
    mechanics.after();
    props.tick(STEP);
  };
  const camera=new T.PerspectiveCamera();
  camera.position.set(0,.4,2);
  camera.lookAt(0,.4,0);
  camera.updateMatrixWorld(true);
  const jug={type:'water',position:[0,.36,0]};
  props.stock(jug);
  world.step(mechanics.events);
  mechanics.fire(camera);
  for(let i=0;i<15;i++)frame();
  assert.ok(sounds.includes('glass'));
  assert.ok(mechanics.drops.length>0);
  assert.ok(!mechanics.items.has(jug.item.collider.handle));

  const thrown={type:'water',position:[4,1,0]};
  props.stock(thrown);
  mechanics.grab(thrown.item);
  mechanics.release(new T.Vector3(0,-8,0));
  for(let i=0;i<15;i++)frame();
  assert.ok(!mechanics.items.has(thrown.item.collider.handle));

  const fuel={type:'fuel',position:[2,.36,0]};
  props.stock(fuel);
  camera.position.x=2;
  camera.lookAt(2,.4,0);
  camera.updateMatrixWorld(true);
  for(let i=0;i<15;i++)frame();
  mechanics.fire(camera);
  for(let i=0;i<15;i++)frame();
  assert.ok(sounds.includes('blast'));
  assert.ok(!mechanics.items.has(fuel.item.collider.handle));

  const delivery={type:'water',position:[7,.36,0]};
  props.stock(delivery);
  mechanics.grab(delivery.item);
  assert.match(mechanics.fixed.get(sensor.handle).accept(delivery.item),/Thanks/);
  assert.ok(records.has('pump-water-delivery'));
  assert.equal(mechanics.carried,null);

  const pump=[...mechanics.fixed.values()].find(tag=>tag.name==='Listen at the creek pump');
  const relay=[...mechanics.fixed.values()].find(tag=>tag.name==='Inspect the silent relay by the ford');
  assert.match(relay.action(),/cold/);
  const deliveryFuel={type:'fuel',position:[7,.36,0]};
  props.stock(deliveryFuel);
  mechanics.grab(deliveryFuel.item);
  assert.match(pump.accept(deliveryFuel.item),/delivered/);
  assert.match(pump.action(),/motor starts/);
  props.tick(1.4);
  assert.deepEqual(sounds.slice(-2),['pump','echo']);
  assert.ok(props.objective());
  assert.match(relay.action(),/copied/);
  assert.ok(records.has('creek-pump-echo'));
  assert.equal(props.objective(),null);
  world.free();
});

test('submerged street warns once, recovers stranded players, and saves salvage rewards',async()=>{
  const {SalvageClock,SalvageStreet}=await import('../src/salvage-street.js');
  const {basin,height}=await import('../src/terrain.js');
  const clock=new SalvageClock();
  clock.start();
  assert.equal(clock.advance(70),'bell');
  assert.equal(clock.advance(1),'');
  assert.equal(clock.advance(14),'flood');
  assert.equal(clock.advance(1),'');
  clock.start(true);
  assert.equal(clock.remaining,115);
  assert.ok(height(basin.x,13)<basin.water);
  assert.ok(height(basin.x,34)>basin.water);

  const removed=[],records=new Map(),site=Object.create(SalvageStreet.prototype);
  const location=new T.Vector3(basin.x,0,13);
  const walker={current:location,spawn:[1,1,1],teleport(position){this.current.set(...position);this.spawn=position;}};
  const mechanics={walker,area:0,items:new Map(),remove(item){removed.push(item);this.items.delete(item.collider.handle);}};
  Object.assign(site,{mechanics,clock,cargo:[],bag:{record:(id,name,result)=>records.set(id,{name,result})},notice(){}});
  const wet={collider:{handle:1},body:{translation:()=>location.clone()}};
  const dry={collider:{handle:2},body:{translation:()=>new T.Vector3(basin.x,1,34)},
    salvage:{id:'pump',name:'Pump',result:'Pump recovered'}};
  site.cargo.push(wet,dry);
  mechanics.items.set(1,wet);mechanics.items.set(2,dry);
  site.flood();
  assert.deepEqual(removed,[wet]);
  assert.equal(walker.current.z,32);
  assert.deepEqual(walker.spawn,[1,1,1]);
  assert.equal(site.deliver(dry),'Pump recovered');
  assert.equal(records.get('pond-pump').name,'Pump');
  assert.equal(clock.remaining,15);
});

test('wagon drives the actual basin ramp and turns in salvage through normal interactions',async t=>{
  const {AssetPipeline}=await import('../src/assets.js');
  const {SalvageStreet}=await import('../src/salvage-street.js');
  const {Mechanics,vec}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  const {basin,height,makeTerrain}=await import('../src/terrain.js');
  await R.init();
  const originalDocument=globalThis.document;
  globalThis.document={
    createElement:()=>({getContext:()=>({fillRect(){},fillText(){},strokeRect(){}})}),
    createElementNS:()=>({addEventListener(){},removeEventListener(){}})
  };
  t.after(()=>{globalThis.document=originalDocument;});
  const world=new R.World({x:0,y:-9.81,z:0});
  t.after(()=>world.free());
  const scene=new T.Scene();
  makeTerrain(scene,world,{floor:null,normal:null});
  const x=basin.x;
  const walker=new Walker(world,[x+2.8,height(x+2.8,33)+.9,33]);
  const m=new Mechanics(world,walker,scene,new T.Scene());
  const pipeline=new AssetPipeline(scene,world);
  const models={};
  for(const [key,path] of Object.entries({cabin:'ranger-cabin',pairedKitchen:'paired-kitchen',kitchenClock:'stopped-kitchen-clock',transferPump:'creek-transfer-pump',waterJug:'pump-water-jug',lantern:'camp-lantern'})){
    const bytes=await readFile(new URL('../assets/'+path+'.glb',import.meta.url));
    models[key]=(await pipeline.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  }
  m.makeCar([x,height(x,33)+.74,33]);
  const records=new Map();
  const bag={records,record:(id,name,result)=>records.set(id,{name,result})};
  const mission=new SalvageStreet(m,pipeline,models,bag,{stage:4},{refill(){}},()=>{},()=>{});
  const camera=new T.PerspectiveCamera(),input={actions:new Set()};
  function frame(move={},yaw=0){
    const movement={x:0,z:0,...move};
    m.before(camera,movement,input);
    if(m.driving)world.step(m.events);
    else walker.step(movement,yaw,m.events);
    m.after();
    mission.tick(STEP);
  }
  function aim(position){
    camera.position.copy(walker.current);
    camera.position.y+=.58;
    camera.lookAt(position);
    camera.updateMatrixWorld(true);
  }
  function use(position){
    aim(position);
    return m.use(camera);
  }
  function walkTo(x,z){
    for(let i=0;i<400;i++){
      const dx=x-walker.current.x,dz=z-walker.current.z;
      if(Math.hypot(dx,dz)<.18)return;
      frame({z:Math.min(1,Math.hypot(dx,dz)*1.4)},Math.atan2(-dx,-dz));
    }
    assert.fail('Walking route blocked near '+walker.current.toArray()+' to '+[x,z]+' car '+JSON.stringify(m.car.body.translation())+' velocity '+JSON.stringify(m.car.body.linvel()));
  }
  function driveTo(z,direction){
    for(let i=0;i<1650;i++){
      if(direction*(m.car.body.translation().z-z)<.28)return;
      const car=m.car.body;
      const front=new T.Vector3(0,0,-1).applyQuaternion(new T.Quaternion().copy(car.rotation()));
      const desiredX=T.MathUtils.clamp((x-car.translation().x)*.32,-.65,.65);
      const desiredYaw=Math.atan2(-desiredX*direction,1);
      const yaw=Math.atan2(-front.x,-front.z);
      const error=Math.atan2(Math.sin(desiredYaw-yaw),Math.cos(desiredYaw-yaw));
      frame({z:direction*.5,x:T.MathUtils.clamp(-direction*error*2,-1,1)});
    }
    assert.fail('Wagon route blocked near '+JSON.stringify(m.car.body.translation())+' velocity '+JSON.stringify(m.car.body.linvel()));
  }
  for(let i=0;i<35;i++)frame();
  assert.match(use(mission.control),/Drain open/);
  assert.match(use(vec(m.car.body.translation())),/Wagon controls/);
  driveTo(17,1);
  for(let i=0;i<70;i++)frame();
  assert.match(m.use(camera),/Exited wagon/);
  const pump=mission.cargo.find(item=>item.salvage.id==='pump');
  const pumpPosition=vec(pump.body.translation());
  const lowPark=vec(m.car.body.translation());
  walkTo(lowPark.x-2.15,lowPark.z+3.75);
  walkTo(lowPark.x+2.15,lowPark.z+3.75);
  walkTo(pumpPosition.x-.85,pumpPosition.z);
  assert.match(use(pumpPosition),/Carrying Transfer pump/);
  const car=vec(m.car.body.translation());
  walkTo(car.x+1.55,car.z+1.25);
  assert.match(use(car),/loaded on the wagon rack/);
  assert.match(m.toggleStrap(),/Cargo secured/);
  assert.equal(m.cargo,pump);
  walkTo(car.x+1.55,car.z-.4);
  assert.match(use(car),/Wagon controls/);
  driveTo(32,-1);
  for(let i=0;i<70;i++)frame();
  assert.match(m.use(camera),/Exited wagon/);
  const parked=vec(m.car.body.translation());
  walkTo(parked.x-1.55,parked.z+1.25);
  assert.match(use(parked),/Carrying Transfer pump/);
  walkTo(mission.drop.x+.9,mission.drop.z);
  assert.match(use(mission.drop),/extra thirty seconds/);
  assert.ok(records.has('pond-pump'));
  mission.tick(mission.clock.remaining+STEP);
  walkTo(mission.control.x,mission.control.z+1.3);
  assert.match(use(mission.control),/Drain open/);
  assert.equal(mission.clock.remaining,115);
  const highPark=vec(m.car.body.translation());
  walkTo(highPark.x+1.7,highPark.z-.3);
  const hitBefore=use(highPark);
  assert.match(hitBefore,/Wagon controls/,JSON.stringify({highPark,now:m.car.body.translation(),walker:walker.current}));
  driveTo(17,1);
  mission.tick(mission.clock.remaining+STEP);
  assert.equal(m.car.body.translation().z,32);
  assert.equal(m.driving,true);
  assert.equal(mission.cargo.some(item=>m.items.has(item.collider.handle)),false);
});

test('Second Address opens by three approaches and proves the slope with a simulated brass ball',async t=>{
  const {SecondAddress}=await import('../src/second-address.js');
  const {AssetPipeline}=await import('../src/assets.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  const {secondAddress,makeTerrain,height}=await import('../src/terrain.js');
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  t.after(()=>world.free());
  const scene=new T.Scene(),walker=new Walker(world,[25,secondAddress.y+1,30]);
  const mechanics=new Mechanics(world,walker,scene,new T.Scene());
  makeTerrain(scene,world,{floor:null,normal:null});
  const pipeline=new AssetPipeline(scene,world);
  const models={};
  for(const [key,filename] of Object.entries({cabin:'ranger-cabin',pairedKitchen:'paired-kitchen',echoSurveyTray:'echo-survey-tray',receiver:'field-receiver',kitchenClock:'stopped-kitchen-clock'})){
    const bytes=await readFile(new URL('../assets/'+filename+'.glb',import.meta.url));
    models[key]=(await pipeline.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  }
  const records=new Map();
  const bag={records,record:(id,name,description)=>records.set(id,{name,description})};
  const address=new SecondAddress(mechanics,pipeline,models,bag,()=>{});
  const target=name=>[...mechanics.fixed.values()].find(item=>item.name===name);
  const door=target('Ask to inspect the house as a utility worker');
  assert.match(door.action(),/ledger/);
  records.set('pond-records',true);
  assert.match(door.action(),/meter/);
  assert.equal(address.door.collider.isEnabled(),false);
  address.route=null;
  address.door.collider.setEnabled(true);
  const camera=new T.PerspectiveCamera();
  camera.position.set(secondAddress.x+1.36,secondAddress.y+1.5,secondAddress.z+6.7);
  camera.lookAt(secondAddress.x+1.36,secondAddress.y+2.74,secondAddress.z+4.56);
  camera.updateMatrixWorld(true);
  world.step(mechanics.events);
  assert.match(mechanics.grapple(camera),/releases/);
  assert.equal(address.route,'grapple latch');
  address.route=null;
  address.door.collider.setEnabled(true);
  walker.current.copy(address.mailbox).add(new T.Vector3(0,.9,0));
  assert.match(target('Talk to the resident at the mailbox').action(),/Follow/);
  for(let i=0;i<220;i++)address.tick(STEP);
  assert.equal(address.route,'followed resident');
  walker.teleport([secondAddress.x,height(secondAddress.x,secondAddress.z+5.5)+.9,secondAddress.z+5.5]);
  for(let i=0;i<110&&walker.current.z>secondAddress.z+1.2;i++){
    walker.step({x:0,z:1},0,mechanics.events);
  }
  assert.ok(walker.current.z<secondAddress.z+2.4,'the opened door must allow walking into the house '+walker.current.toArray());

  for(let i=0;i<110&&walker.current.z>secondAddress.z+.34;i++)walker.step({x:0,z:1},0,mechanics.events);
  const useFromPlayer=point=>{
    camera.position.copy(walker.current).add(new T.Vector3(0,.58,0));
    camera.lookAt(point);
    camera.updateMatrixWorld(true);
    return mechanics.use(camera);
  };
  assert.match(useFromPlayer(address.clockPoint),/alone/);
  const physicsUntil=phase=>{
    for(let i=0;i<360&&address.trial.phase!==phase;i++){
      world.step(mechanics.events);
      mechanics.after();
      address.tick(STEP);
    }
    assert.equal(address.trial.phase,phase);
  };
  assert.match(useFromPlayer(address.trayControl),/before/);
  physicsUntil('control-ready');
  assert.match(useFromPlayer(address.trayControl),/receiver/);
  physicsUntil('proved');
  assert.ok(records.has('echo-slope'));
  assert.equal(address.objective().target,address.drop);
  const post=address.drop;
  walker.teleport([post.x,height(post.x,post.z+1.6)+.9,post.z+1.6]);
  world.step(mechanics.events);
  assert.match(useFromPlayer(post),/signatures/);
  assert.equal(address.objective(),null);
  const reloaded=new SecondAddress(mechanics,pipeline,models,bag,()=>{});
  assert.equal(reloaded.route,'followed resident');
  assert.equal(reloaded.door.collider.isEnabled(),false);
  assert.equal(reloaded.objective(),null);
  assert.ok(records.has('second-address-filed'));

  records.delete('second-address-filed');
  reloaded.route='utility bluff';
  const resident=[...mechanics.fixed.values()].findLast(item=>item.name==='Talk to the resident at the mailbox');
  const finish=[...mechanics.fixed.values()].findLast(item=>item.name==='Compare the two addresses at the post office');
  assert.match(resident.action(),/Nobody sent a crew/);
  assert.match(reloaded.objective().text,/orchard turnout/);
  const wagonPosition=reloaded.escapeRoute[0].point.clone();
  mechanics.car={body:{translation:()=>wagonPosition}};
  reloaded.tick(STEP);
  assert.equal(reloaded.getaway.checkpoint,0,'walking through a checkpoint must not count');
  const getawayStart={x:25,z:29.5};
  mechanics.makeCar([getawayStart.x,height(getawayStart.x,getawayStart.z)+.75,getawayStart.z]);
  const getawayCar=mechanics.car.body;
  getawayCar.setRotation(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI*.53),true);
  mechanics.driving=true;
  walker.body.setEnabled(false);
  for(let i=0;i<1000&&reloaded.getaway;i++){
    const current=getawayCar.translation();
    const target=reloaded.escapeRoute[reloaded.getaway.checkpoint].point;
    const forward=new T.Vector3(0,0,-1).applyQuaternion(getawayCar.rotation());
    const yaw=Math.atan2(-forward.x,-forward.z);
    const desired=Math.atan2(current.x-target.x,current.z-target.z);
    const difference=Math.atan2(Math.sin(desired-yaw),Math.cos(desired-yaw));
    mechanics.drive({x:T.MathUtils.clamp(-difference*2.8,-1,1),z:.44});
    world.step(mechanics.events);
    mechanics.after();
    reloaded.tick(STEP);
  }
  walker.body.setEnabled(true);
  assert.equal(reloaded.getaway,null,JSON.stringify(getawayCar.translation()));
  assert.ok(records.has('founders-depot'));
  assert.equal(reloaded.inspector.root.visible,false);
  assert.match(finish.action(),/Two signatures/);
  assert.ok(records.has('second-address-filed'));

  for(const key of ['second-address-filed','second-address-getaway','founders-depot'])records.delete(key);
  mechanics.driving=false;
  assert.match(resident.action(),/Nobody sent a crew/);
  reloaded.tick(46);
  assert.equal(reloaded.getaway,null);
  assert.equal(records.get('second-address-getaway').name,'Utility cover exposed');
  assert.equal(records.has('founders-depot'),false);
  assert.match(finish.action(),/Two signatures/);
  assert.ok(records.has('second-address-filed'),'failed getaway must preserve the post office handoff');

});

test('wildlife reacts to physical shots, meat cooks, flares expire, and straps hold cargo',async t=>{
  const {AssetPipeline}=await import('../src/assets.js');
  const {Wildlife}=await import('../src/wildlife.js');
  const {CampLife}=await import('../src/camp-life.js');
  const {fireFlare}=await import('../src/flare.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  t.after(()=>world.free());
  const scene=new T.Scene();
  const walker=new Walker(world,[0,1,0]);
  const mechanics=new Mechanics(world,walker,scene,new T.Scene());
  const pipeline=new AssetPipeline(scene,world);
  const model=async file=>{
    const bytes=await readFile(new URL('../assets/'+file+'.glb',import.meta.url));
    return (await pipeline.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  };
  const [rabbit,flarePistol]=await Promise.all([model('ridge-cottontail'),model('field-flare-pistol')]);
  assert.ok(new T.Box3().setFromObject(flarePistol).getSize(new T.Vector3()).length()>.2);
  const records=new Map();
  const bag={records,record:(id,name)=>records.set(id,{name}),forget:id=>records.delete(id)};
  const wildlife=new Wildlife(mechanics,pipeline,rabbit,bag,()=>{});
  const camp=new CampLife(mechanics,bag,()=>{});
  const camera=new T.PerspectiveCamera();
  const frame=()=>{
    mechanics.before(camera,{x:0,z:0},{actions:new Set()});
    world.step(mechanics.events);
    mechanics.after();
  };
  function shoot(animal){
    const target=animal.home.clone().add(new T.Vector3(0,.23,0));
    camera.position.copy(target).add(new T.Vector3(0,0,2));
    camera.lookAt(target);camera.updateMatrixWorld(true);
    world.step(mechanics.events);
    mechanics.fire(camera);
    for(let i=0;i<18;i++)frame();
  }
  const animal=wildlife.animals[0];
  shoot(animal);
  assert.equal(animal.state,'down');
  assert.match(wildlife.use(animal),/Meat packed/);
  assert.match(camp.cook(),/heat/);
  camp.tick(6);
  camp.cook();
  assert.equal(records.get('camp-meal').name,'Roasted cottontail');
  camp.eat();
  assert.equal(camp.energy,165);
  const echo=wildlife.animals.at(-1);
  shoot(echo);
  assert.equal(echo.state,'gone');
  assert.ok(records.has('echo-cottontail'));
  assert.ok(!records.has('cottontail-meat'));

  camera.position.set(0,15,0);camera.lookAt(0,15,-2);camera.updateMatrixWorld(true);
  assert.ok(fireFlare(mechanics,camera));
  const flare=[...mechanics.items.values()].find(item=>item.name==='Burning signal flare');
  assert.ok(flare.body.linvel().z<0);
  assert.ok(flare.visual.children.some(node=>node.isPointLight));
  flare.life=STEP;
  frame();
  assert.ok(!mechanics.items.has(flare.collider.handle));

  mechanics.makeCar([0,1,0]);
  const load=mechanics.crate([0,1,1]);
  mechanics.cargo=load;
  load.body.setEnabled(false);
  mechanics.car.visual.add(load.visual);
  mechanics.cargoSlide=0;
  assert.match(mechanics.toggleStrap(),/Cargo secured/);
  mechanics.driving=true;
  mechanics.cargoSpeed=10;
  mechanics.shiftCargo();
  assert.equal(mechanics.cargo,load);
  mechanics.driving=false;
  assert.match(mechanics.toggleStrap(),/loosened/);
  mechanics.driving=true;
  mechanics.car.body.setLinvel({x:0,y:0,z:-5},true);
  mechanics.car.body.setAngvel({x:0,y:1.3,z:0},true);
  mechanics.cargoSpeed=5;
  mechanics.shiftCargo();
  assert.notEqual(load.visual.position.x,0);
  mechanics.cargoSpeed=12;
  mechanics.car.body.setLinvel({x:0,y:0,z:0},true);
  mechanics.shiftCargo();
  assert.equal(mechanics.cargo,null);
  assert.ok(load.body.isEnabled());

  const {TowLine}=await import('../src/tow-line.js');
  mechanics.driving=false;
  const first=mechanics.crate([7,9,0]),second=mechanics.crate([10,9,0]);
  first.body.setGravityScale(0,true);second.body.setGravityScale(0,true);
  world.step(mechanics.events);
  const line=new TowLine(mechanics);
  camera.position.set(8.5,9,3);
  camera.lookAt(7,9,0);camera.updateMatrixWorld(true);
  assert.match(line.select(camera),/First hook/);
  camera.lookAt(10,9,0);camera.updateMatrixWorld(true);
  assert.match(line.select(camera),/Tow line rigged/);
  second.body.setLinvel({x:4,y:0,z:0},true);
  for(let i=0;i<22;i++){frame();line.tick();}
  assert.ok(line.joint?.isValid());
  assert.ok(first.body.translation().x>7.05);
  mechanics.remove(second);
  line.tick();
  assert.equal(line.visual.visible,false);

  mechanics.car.body.setGravityScale(0,true);
  mechanics.car.body.setTranslation({x:0,y:12,z:0},true);
  const towLoad=mechanics.crate([3,12,0]);
  towLoad.body.setGravityScale(0,true);
  world.step(mechanics.events);
  camera.position.set(1.5,12,3);
  camera.lookAt(0,12,0);camera.updateMatrixWorld(true);
  assert.match(line.select(camera),/First hook/);
  camera.lookAt(3,12,0);camera.updateMatrixWorld(true);
  assert.match(line.select(camera),/rigged/);
  mechanics.driving=true;
  assert.match(line.select(camera),/reeling/);
  const length=line.length;
  for(let i=0;i<20;i++){frame();line.tick(STEP);}
  assert.ok(line.length<length);
  assert.match(line.select(camera),/stopped/);
  line.clear();
});

test('Founders’ Night unlocks from the filed case and preserves a receipt fallback',async t=>{
  const {FoundersNight}=await import('../src/founders-night.js');
  const {AssetPipeline}=await import('../src/assets.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  const {height,trailX,makeTerrain}=await import('../src/terrain.js');
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  t.after(()=>world.free());
  const scene=new T.Scene(),walker=new Walker(world,[0,1,0]);
  const mechanics=new Mechanics(world,walker,scene,new T.Scene());
  makeTerrain(scene,world,{floor:null,normal:null});
  const pipeline=new AssetPipeline(scene,world);
  const models={};
  for(const [key,filename] of Object.entries({archiveTruck:'archive-truck',archiveTapeCase:'archive-tape-case',paradeFloat:'founders-parade-float',receiver:'field-receiver'})){
    const bytes=await readFile(new URL('../assets/'+filename+'.glb',import.meta.url));
    models[key]=(await pipeline.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  }
  const records=new Map();
  const bag={records,record:(id,name,description)=>records.set(id,{name,description})};
  const mission=new FoundersNight(mechanics,pipeline,models,bag,()=>{});
  const interact=name=>[...mechanics.fixed.values()].find(item=>item.name===name).action();
  const dispatch=()=>interact('Read the archive dispatch board');
  const receipt=()=>interact('Read the backup delivery receipt');
  const depot=()=>interact('Inspect the archive loading cage');
  const camera=new T.PerspectiveCamera();
  const aim=(position,target)=>{
    camera.position.copy(position);
    camera.lookAt(target);camera.updateMatrixWorld(true);
  };
  const grappleCage=()=>{
    aim(mission.ringPoint.clone().add(new T.Vector3(0,-.3,1.75)),mission.ringPoint);
    world.step(mechanics.events);
    return mechanics.grapple(camera);
  };
  const pickUpCase=()=>{
    const point=new T.Vector3().copy(mission.case.body.translation()).add(new T.Vector3(0,.15,0));
    aim(point.clone().add(new T.Vector3(.9,.25,1.3)),point);
    world.step(mechanics.events);
    return mechanics.use(camera);
  };
  const handOff=()=>{
    aim(mission.dispatch.clone().add(new T.Vector3(0,.58,1.6)),mission.dispatch);
    return mechanics.use(camera);
  };
  function walkTo(x,z){
    for(let i=0;i<460;i++){
      const dx=x-walker.current.x,dz=z-walker.current.z;
      const distance=Math.hypot(dx,dz);
      if(distance<.17)return;
      const movement={x:0,z:Math.min(.7,distance*1.6)};
      const heading=Math.atan2(-dx,-dz);
      aim(walker.current.clone().add(new T.Vector3(0,.58,0)),
        walker.current.clone().add(new T.Vector3(dx,.58,dz)));
      mechanics.before(camera,movement,{actions:new Set()});
      walker.step(movement,heading,mechanics.events);
      mechanics.after();
      mission.tick(STEP);
    }
    assert.fail('Archive case walking route blocked near '+walker.current.toArray()+' toward '+[x,z]);
  }

  assert.match(dispatch(),/Finish comparing/);
  records.set('second-address-filed',true);
  assert.match(depot(),/Find the matching dispatch/);
  assert.match(grappleCage(),/matching archive dispatch/);
  assert.match(dispatch(),/Bring the wagon/);
  const z=30.3,x=trailX(z)+.6;
  mechanics.makeCar([x,height(x,z)+.66,z]);
  mechanics.driving=true;
  walker.body.setEnabled(false);
  mission.tick(STEP);
  assert.equal(mission.tail.started,true);
  assert.equal(mission.truckBody.isEnabled(),true);
  // Lose the truck on the first attempt and read the fallback without driving.
  mechanics.driving=false;
  mission.tick(10);
  assert.equal(mission.tail,null);
  assert.equal(mission.truckBody.isEnabled(),false);
  assert.ok(!records.has('founders-depot'));
  assert.match(receipt(),/creek storehouse/);
  assert.match(depot(),/Grapple/);
  assert.match(grappleCage(),/shutter lifts/);
  assert.equal(mission.gate.collider.isEnabled(),false);
  assert.match(pickUpCase(),/Carrying Archive tape case/);
  const nearCase=mission.caseHome.clone().add(new T.Vector3(.9,0,1.3));
  walker.body.setEnabled(true);
  walker.teleport([nearCase.x,height(nearCase.x,nearCase.z)+.9,nearCase.z]);
  walkTo(8.6,10.6);
  walkTo(2,14.4);
  walkTo(-3.6,14.4);
  walkTo(mission.dispatch.x,mission.dispatch.z+1.55);
  assert.equal(mechanics.carried,mission.case);
  aim(walker.current.clone().add(new T.Vector3(0,.58,0)),mission.dispatch);
  assert.match(mechanics.use(camera),/Two people answer/);
  assert.ok(records.has('founders-original-tape'));
  assert.equal(mission.objective(),null);

  // Replay the alternate path with the normal wagon drive and world collision.
  records.delete('founders-original-tape');records.delete('founders-depot');records.delete('founders-latch-open');
  dispatch();
  mechanics.driving=true;
  for(let i=0;i<630&&mission.tail;i++){
    const car=mechanics.car.body;
    const position=car.translation();
    const front=new T.Vector3(0,0,-1).applyQuaternion(new T.Quaternion().copy(car.rotation()));
    const desiredX=T.MathUtils.clamp((trailX(position.z-2)+.6-position.x)*.35,-.75,.75);
    const yaw=Math.atan2(-front.x,-front.z),desiredYaw=Math.atan2(-desiredX,1);
    const error=Math.atan2(Math.sin(desiredYaw-yaw),Math.cos(desiredYaw-yaw));
    mechanics.before(camera,{z:.55,x:T.MathUtils.clamp(-error*2.3,-1,1)},{actions:new Set()});
    world.step(mechanics.events);
    mechanics.after();
    mission.tick(STEP);
  }
  assert.match(records.get('founders-depot')?.description??'',/following the archive truck/,JSON.stringify(mechanics.car.body.translation()));
  mechanics.driving=false;
  assert.match(grappleCage(),/shutter lifts/);
  mechanics.remove(mission.case);
  mission.tick(STEP);
  assert.ok(mechanics.items.has(mission.case.collider.handle),'a lost case must restock');
  assert.match(pickUpCase(),/Carrying Archive tape case/);
  assert.match(handOff(),/Two people answer/);

  const {x:floatX,y,z:floatZ}=mission.float.position;
  walker.teleport([floatX,height(floatX,floatZ+3.9)+.9,floatZ+3.9]);
  walkTo(floatX,floatZ+1.98);
  assert.ok(walker.current.y>y+1.45,'boarding steps should reach the deck');
  aim(walker.current.clone().add(new T.Vector3(0,.58,0)),mission.recorder);
  assert.match(mechanics.use(camera),/catches an order/);
  assert.ok(records.has('founders-float-audio'));
  records.delete('founders-depot');
  assert.match(interact('Ask the stagehand where the archive load goes'),/Route crew/);
  assert.match(records.get('founders-depot').description,/backstage bluff/);
});

test('the ford rescue records each intervention and recovers from a missed wagon',async t=>{
  const {FordRescue}=await import('../src/ford-rescue.js');
  const {AssetPipeline}=await import('../src/assets.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  const {height,makeTerrain}=await import('../src/terrain.js');
  await R.init();
  for(const route of ['grapple','high','foot','missed']){
    const world=new R.World({x:0,y:-9.81,z:0});
    t.after(()=>world.free());
    const scene=new T.Scene(),walker=new Walker(world,[0,1,0]);
    const m=new Mechanics(world,walker,scene,new T.Scene());
    makeTerrain(scene,world,{floor:null,normal:null});
    m.makeCar([12,height(12,29)+.7,29]);
    const pipeline=new AssetPipeline(scene,world);
    const models={};
    for(const [id,name] of Object.entries({receiver:'field-receiver',fordRescueBracket:'ford-rescue-bracket'})){
      const bytes=await readFile(new URL('../assets/'+name+'.glb',import.meta.url));
      models[id]=(await pipeline.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
    }
    const records=new Map();
    const bag={records,record:(id,name,description)=>records.set(id,{name,description})};
    const story={area:0,state:3};
    const encounter=new FordRescue(m,pipeline,models,story,{stage:0},bag,()=>{},()=>{});
    const camera=new T.PerspectiveCamera();
    const aim=(point,offset)=>{
      camera.position.copy(point).add(offset);
      camera.lookAt(point);camera.updateMatrixWorld(true);
      world.step(m.events);m.after();
    };
    assert.equal(encounter.objective(),null);
    story.state=4;
    aim(encounter.radio,new T.Vector3(0,.45,1.65));
    assert.match(m.use(camera),/Cut the rope/);
    for(let i=0;i<18;i++){
      world.step(m.events);m.after();encounter.tick(STEP);
    }
    assert.ok(encounter.cart.body.linvel().z<0);
    if(route==='grapple'){
      const hook=new T.Vector3().copy(encounter.cart.body.translation()).add(new T.Vector3(0,.64,1.65));
      aim(hook,new T.Vector3(0,1.55,1.5));
      assert.match(m.grapple(camera),/load intact/);
    }
    if(route==='high'){
      aim(encounter.high,new T.Vector3(0,.45,1.5));
      assert.match(m.use(camera),/load intact/);
    }
    if(route==='foot'){
      const person=encounter.womanSite.clone().add(new T.Vector3(0,.99,0));
      aim(person,new T.Vector3(0,.45,1.5));
      assert.match(m.use(camera),/load breaks/);
    }
    if(route==='missed')encounter.tick(12);
    assert.equal(encounter.state,'finished');
    assert.equal(encounter.objective(),null);
    assert.match(records.get('ford-rescue-call').description,route==='foot'||route==='missed'?/broken/:/intact/);
    const restored=new FordRescue(m,pipeline,models,story,{stage:0},bag,()=>{},()=>{});
    assert.equal(restored.objective(),null);
  }
});

test('the rescue markers recognize each approach and the recovered rope stays gone after reload',async t=>{
  const {Rescue}=await import('../src/rescue.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker}=await import('../src/walker.js');
  const {height,inCreek,trailX}=await import('../src/terrain.js');
  await R.init();
  const previous=globalThis.localStorage;
  const saved=new Map();
  globalThis.localStorage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
  t.after(()=>{globalThis.localStorage=previous;});
  const world=new R.World({x:0,y:-9.81,z:0});
  t.after(()=>world.free());
  const walker=new Walker(world,[0,0,0]);
  const m=new Mechanics(world,walker,new T.Scene(),new T.Scene());
  const records=new Map();
  const bag={records,record:(id,name)=>records.set(id,name)};
  const start=()=>new Rescue(m,{state:4,area:0},bag,()=>{});
  const use=name=>[...m.fixed.values()].findLast(item=>item.name===name).action();
  for(const route of ['Wagon','Creek','Grapple']){
    saved.clear();
    const rescue=start();
    use('Speak to the woman');
    use('Speak to the ranger');
    assert.match(use('West rescue marker'),/Compare this with the east marker/);
    assert.match(use('East rescue marker'),/one bell/);
    assert.match(rescue.objective().text,/west bank/);
    m.driving=route==='Wagon';
    m.anchor=route==='Grapple'?{}:null;
    const carPosition=new T.Vector3(trailX(-1),0,-1);
    m.car={body:{translation:()=>carPosition,linvel:()=>({z:2})}};
    for(let i=0;i<7;i++){
      if(route==='Wagon')carPosition.z+=.22;
      if(route==='Grapple'){
        const x=1+i*.46,z=-1;
        walker.current.set(x,height(x,z)+2,z);
      }
      if(route==='Creek'){
        const x=-7-i*.46,z=-3.3;
        assert.ok(inCreek(x,z));
        walker.current.set(x,-.8,z);
      }
      rescue.traceApproach();
    }
    assert.match(use('West rescue marker'),new RegExp('^'+route+':'));
    assert.match(rescue.objective().text,/orange rope/);
    assert.match(use('Recover the cut rescue line'),/Recovered/);
    assert.equal(records.get('cut-line'),'Cut rescue line');
    assert.equal(start().line.visible,false);
  }
});

test('the spillway boom can be aimed at, flooded gates warn of the bank detour, and correcting them opens the intake',async t=>{
  const {Finale}=await import('../src/finale.js');
  const {AssetPipeline}=await import('../src/assets.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  const {height,trailX}=await import('../src/terrain.js');
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  t.after(()=>world.free());
  const scene=new T.Scene(),walker=new Walker(world,[0,0,0]);
  const m=new Mechanics(world,walker,scene,new T.Scene());
  m.car={visual:new T.Group()};
  const pipeline=new AssetPipeline(scene,world);
  const model=new T.Group();
  const models={valve:model,arch:model,receiver:model,lantern:model};
  const records=new Map(),bag={records,record:(id,name)=>records.set(id,name)};
  const rescue={stage:4,story:{area:0}};
  const water={uniforms:{current:{value:0},flood:{value:0}}};
  const finale=new Finale(m,rescue,bag,pipeline,models,water,()=>{});
  const camera=new T.PerspectiveCamera();
  const aim=point=>{
    camera.position.copy(point).add(new T.Vector3(0,.19,1.2));
    camera.lookAt(point);camera.updateMatrixWorld(true);
  };
  world.step(m.events);
  aim(finale.boomPoint.clone().add(new T.Vector3(0,.22,0)));
  assert.match(m.grapple(camera),/pull the boom/);
  const use=point=>{aim(point);return m.use(camera);};
  assert.match(use(finale.positions[0]),/1 \/ 0 \/ 0/);
  assert.match(use(finale.positions[0]),/2 \/ 0 \/ 0/);
  assert.match(use(finale.positions[1]),/2 \/ 1 \/ 0/);
  assert.match(use(finale.positions[1]),/ford is flooding/);
  const ford=new T.Vector3(trailX(-1),height(trailX(-1),-1),-1);
  assert.equal(finale.onFloodedFord(ford),true);
  assert.equal(finale.onFloodedFord(ford.clone().add(new T.Vector3(3,0,0))),false);
  assert.match(finale.objective().text,/use the high bank/);
  assert.match(rescue.spillwayReaction(),/Take the high bank/);
  assert.match(use(finale.intake),/still under pressure/);
  use(finale.positions[1]);
  use(finale.positions[2]);
  for(let i=0;i<420;i++)finale.tick(STEP);
  assert.equal(finale.onFloodedFord(ford),false);
  assert.match(use(finale.intake),/dispatch tape/);
  assert.ok(records.has('dispatch-tape'));
});

test('the Echo extraction opens three plans and recovers a timed-out harness before the return handoff',async t=>{
  const {Extraction}=await import('../src/extraction.js');
  const {AssetPipeline}=await import('../src/assets.js');
  const {Mechanics}=await import('../src/mechanics.js');
  const {Walker,STEP}=await import('../src/walker.js');
  await R.init();
  const world=new R.World({x:0,y:-9.81,z:0});
  t.after(()=>world.free());
  const town=new T.Scene(),realm=new T.Scene();
  const walker=new Walker(world,[154,.87,-14.4]);
  const m=new Mechanics(world,walker,town,realm);
  m.staticBox([48,.55,51],[140,-.29,-4],0x271e49,1);
  const pipeline=new AssetPipeline(town,world);
  const models={};
  for(const [key,path] of Object.entries({extractionHarness:'echo-extraction-harness',echoShelter:'echo-reflected-shelter',crossingMarker:'echo-crossing-marker',
    transferPump:'creek-transfer-pump',receiver:'field-receiver',lantern:'camp-lantern'})){
    const bytes=await readFile(new URL('../assets/'+path+'.glb',import.meta.url));
    models[key]=(await pipeline.loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
  }
  const records=new Map();
  const bag={records,record:(id,name,description)=>records.set(id,{name,description})};
  const chapters={stage:4,story:{area:0,gates:[new T.Vector3()]}};
  const messages=[];
  const extraction=new Extraction(m,chapters,bag,pipeline,models,message=>messages.push(message));
  const useAt=site=>m.fixed.get(site.collider.handle).action();
  assert.match(useAt(extraction.plans[0]),/witnesses first/);
  for(const id of ['founders-original-tape','extraction-ranger','extraction-family'])records.set(id,true);
  extraction.tick(STEP);
  assert.ok(extraction.house);
  chapters.stage=5;chapters.ending='seal';
  assert.equal(extraction.available(),false);
  chapters.ending='hold';
  assert.equal(extraction.available(),true);
  chapters.stage=4;chapters.ending='';
  assert.match(useAt(extraction.plans[0]),/Bring the transfer pump/);
  records.set('pond-pump',true);records.set('synced-audio',true);
  assert.match(useAt(extraction.plans[0]),/transfer pump lowers/);
  assert.match(useAt(extraction.plans[1]),/quiet interval/);
  assert.match(useAt(extraction.plans[2]),/family marks/);
  m.changeArea(1);chapters.story.area=1;
  assert.match(useAt(extraction.aid),/strapped in/);
  const missed=extraction.load;
  extraction.tick(46);
  assert.equal(extraction.load,null);
  assert.equal(m.items.has(missed.collider.handle),false);
  assert.match(messages.at(-1),/retry/);
  assert.match(useAt(extraction.aid),/strapped in/);
  const camera=new T.PerspectiveCamera();
  const aim=point=>{
    camera.position.copy(walker.current).add(new T.Vector3(0,.58,0));
    camera.lookAt(point);camera.updateMatrixWorld(true);
  };
  world.step(m.events);
  aim(new T.Vector3().copy(extraction.load.body.translation()).add(new T.Vector3(0,.22,0)));
  assert.match(m.use(camera),/Carrying Occupied extraction harness/);
  const accept=m.fixed.get(extraction.exit.collider.handle).accept;
  assert.match(accept(extraction.load),/lit crossing marker first/);
  function walkTo(point){
    for(let i=0;i<550;i++){
      const x=point.x-walker.current.x,z=point.z-walker.current.z;
      if(Math.hypot(x,z)<.25)return;
      const yaw=Math.atan2(-x,-z),move={x:0,z:.78};
      aim(walker.current.clone().add(new T.Vector3(x,.58,z)));
      m.before(camera,move,{actions:new Set()});
      walker.step(move,yaw,m.events);
      m.after();
      extraction.tick(STEP);
    }
    assert.fail('Extraction route blocked at '+walker.current.toArray());
  }
  for(let i=0;i<2;i++)walkTo(extraction.crossingMarker());
  walkTo(extraction.exit.point.clone().add(new T.Vector3(0,0,-1.6)));
  aim(extraction.exit.point);
  assert.match(m.use(camera),/ranger catches the harness/);
  assert.equal(m.carried,null);
  assert.ok(records.has('extraction-return'));
  assert.equal(extraction.returned.visible,true);
});
