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
  await R.init();
  const storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)};
  for(const ending of ['seal','hold']){
    storage.clear();
    const world=new R.World({x:0,y:-9.81,z:0});
    const scenes=[new T.Scene(),new T.Scene()];
    const tags=new Map();
    const mechanics={world,scenes,onImpact:new Map(),tag:(collider,action)=>tags.set(collider.handle,action),
      staticBox:(_size,position)=>({
        visual:new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),
        collider:world.createCollider(R.ColliderDesc.ball(.1).setTranslation(...position))
      })};
    const story={area:0,gates:[new T.Vector3(),new T.Vector3()]};
    const finale={choice:'public'},bag={records:new Map(),record(){}};
    const chapter=new Chapters(mechanics,story,finale,bag,()=>{});
    const interact=(name)=>[...tags.values()].find(action=>action.name===name).action();
    assert.match(interact('Read the emergency dispatch ledger'),/Shoot blue/);
    chapter.pulse(1);chapter.pulse(2);
    assert.equal(chapter.pulses,0);
    chapter.pulse(1);chapter.pulse(0);chapter.pulse(2);
    assert.equal(chapter.stage,2);
    interact('Read the exposed route marker');
    assert.match(interact('Recover Mom’s original recording'),/Grapple/);
    const ring=[...tags.values()].find(action=>action.name==='Reflected porch ring');
    ring.onGrapple();
    interact('Recover Mom’s original recording');
    interact(ending==='seal'?'Seal the arch':'Keep the arch open for a rescue');
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
  for(const [key,path] of Object.entries({cabin:'ranger-cabin',transferPump:'creek-transfer-pump',waterJug:'pump-water-jug',lantern:'camp-lantern'})){
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
  assert.match(use(car),/secured on the wagon rack/);
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
});
