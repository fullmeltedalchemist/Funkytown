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
    const finale={choice:'public'},bag={record(){}};
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
