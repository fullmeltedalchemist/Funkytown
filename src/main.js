import {ServiceGate} from './service-gate.js';
import {PortableCamp} from './portable-camp.js';
import {Workshop,nearWorkshop} from './workshop.js';
import {FieldMagnet} from './field-magnet.js';
import {watchAudioFocus} from './audio-focus.js';
import {installFairground,nearFairground} from './fairground.js';
import {installFieldRange} from './field-range.js';
import {LoopRoad} from './loop-road.js';
import {FieldRecorder} from './field-recorder.js';
import {FordRescue} from './ford-rescue.js';
import {FoundersNight,nearParadeStaging} from './founders-night.js';
import {TowLine} from './tow-line.js';
import {checkLookoutSignal,fireFlare} from './flare.js';
import {Wildlife} from './wildlife.js';
import {CreekBirds} from './creek-birds.js';
import {CreekWildlife} from './creek-wildlife.js';
import {SecondAddress} from './second-address.js';
import {Extraction} from './extraction.js';
import {SalvageStreet} from './salvage-street.js';
import {FieldProps} from './field-props.js';
import {CreekEncounter} from './creek-encounter.js';
import {CampLife} from './camp-life.js';
import {Chapters} from './chapters.js';
import {Diner} from './diner.js';
import {BaitCooler,coolerBank} from './bait-cooler.js';
import {DistressCall} from './distress-call.js';
import {MillYard} from './mill-yard.js';
import {WagonRecovery} from './wagon-recovery.js';
import {ArchiveWindow,nearArchiveWindow} from './archive-window.js';
import {insideRescueCorridor} from './rigging.js';
import {Gear} from './gear.js';
import {Finale,MailRoute} from './finale.js';
import {configureVillagerModel,Rescue} from './rescue.js';
import {Bag} from './bag.js';
import {fieldPistol} from './effects.js';
import * as T from 'three';
import R from 'rapier';
import {AssetPipeline} from './assets.js';
import {cabinX,cabinY,cabinZ,height,basinInfluence,diner,secondAddress,inCreek,makeTerrain,nearRecoveryCut,plots,spawn,trailDistance,trailX} from './terrain.js';
import {Walker,STEP} from './walker.js';
import {Input} from './input.js';
import {Mechanics,vec} from './mechanics.js';
import {Story,buildCampEquipment} from './story.js';
const $=id=>document.getElementById(id);

function lighting(scene,low){
  scene.background=new T.Color(0xc5b9a3);
  scene.fog=new T.FogExp2(0xa6b4a0,.017);
  scene.add(new T.HemisphereLight(0xf4f0de,0x465e5b,1.65));
  const sun=new T.DirectionalLight(0xffd4a1,3.1);
  sun.position.set(-25,29,6);sun.target.position.set(0,0,1);
  sun.castShadow=true;sun.shadow.mapSize.setScalar(low?1024:2048);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:40,bottom:-42,near:1,far:102});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias=.045;sun.shadow.bias=-.00015;
  scene.add(sun,sun.target);
  const porch=new T.PointLight(0xffa74d,14,11,2);
  porch.position.set(cabinX,cabinY+2.7,cabinZ+3.4);scene.add(porch);
  const lamp=new T.PointLight(0xffae56,18,9,2);
  lamp.position.set(cabinX-1.8,cabinY+2.4,cabinZ-1.4);scene.add(lamp);
}
async function textures(){
  const loader=new T.TextureLoader();
  const [floor,normal]=await Promise.all([loader.loadAsync('./assets/forest-floor.jpg'),loader.loadAsync('./assets/forest-normal.jpg')]);
  floor.colorSpace=T.SRGBColorSpace;
  for(const texture of [floor,normal]){
    texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.anisotropy=4;
  }
  return {floor,normal};
}
function forest(pipeline,models){
  let seed=4242;
  const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const grove={oak:[],birch:[],maple:[],underbrush:[],rocks:[]};
  function place(type,x,z,scale,sink=0){
    if(nearRecoveryCut(x,z,type==='rocks'?scale*.48:1.2)||nearArchiveWindow(x,z,type==='rocks'?scale*.48:1.2))return;
    if(basinInfluence(x,z)>.07||Math.hypot(x-coolerBank.x,z-coolerBank.z)<3.2||Math.hypot(x-15,z+16)<5.8||nearParadeStaging(x,z)||[secondAddress,diner].some(p=>Math.hypot(x-p.x,z-p.z)<7.5))return;
    if(insideRescueCorridor(x,z,type==='rocks'?scale*.48:1.2))return;
    const yaw=rnd()*Math.PI*2;
    if(nearFairground(x,z,type==='rocks'?scale*.48:.8)||nearWorkshop(x,z,type==='rocks'?scale*.48:.8))return;
    grove[type].push({x,y:height(x,z)-sink,z,scale,yaw});
  }
  for(let i=0;i<490;i++){
    const x=(rnd()-.5)*106,z=(rnd()-.5)*106;
    const d=trailDistance(x,z);
    const yard=Math.max(Math.abs(x-cabinX),Math.abs(z-cabinZ));
    if(inCreek(x,z)||d<2.7||yard<7.9||plots.some(p=>Math.hypot(x-p.x,z-p.z)<7))continue;
    if(d<6.5||rnd()<.47){
      place('underbrush',x,z,.55+rnd()*.62,.035);
      continue;
    }
    if(Math.abs(z)<4.5)continue;
    const type=['oak','birch','maple'][Math.floor(rnd()*3)];
    place(type,x,z,.75+rnd()*.73,.10);
  }
  for(let i=0;i<43;i++){
    const x=(rnd()-.5)*91,z=(rnd()-.5)*95;
    if(trailDistance(x,z)<2.5||Math.hypot(x-cabinX,z-cabinZ)<8||plots.some(p=>Math.hypot(x-p.x,z-p.z)<6))continue;
    place('rocks',x,z,2.8+rnd()*6.5,.035);
  }
  for(const [z,offset,scale] of [[30,-3.4,7],[21,3.2,9],[10,-3.5,7],[-4,-2.8,9],[-3,3.2,7],[-24,4.5,8]]){
    place('rocks',trailX(z)+offset,z,scale,.025);
  }
  // Frame the view and ford without covering the path.
  for(const [z,offset,type,scale] of [[31,-4.2,'oak',1.2],[30,5.5,'maple',1.25],
    [22,-5.2,'birch',1.25],[18,5.6,'maple',1.1],[12,-4.7,'oak',.94],[-13,4.4,'birch',1.05],
    [-18,-6,'maple',1.1],[-30,8,'oak',1.3],[-32,-7.6,'maple',1.17]]){
    place(type,trailX(z)+offset,z,scale,.09);
  }
  for(const [key,placements] of Object.entries(grove)){
    pipeline.scatter(models[key],placements,{solid:['oak','birch','maple'].includes(key)});
  }
}
async function boot(){
  await R.init();
  const mobile=matchMedia('(pointer:coarse)').matches;
  const makeRenderer=options=>new T.WebGLRenderer(options);
  let renderer, reducedGraphics=false;
  try{
    renderer=makeRenderer({antialias:!mobile,powerPreference:mobile?'low-power':'default'});
  }catch{
    reducedGraphics=true;
    try{renderer=makeRenderer({antialias:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:false});}
    catch{throw Error('WebGL 2 could not start in this browser. Try another browser or enable graphics acceleration.');}
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,reducedGraphics?1:mobile?1.2:1.65));
  renderer.shadowMap.enabled=!reducedGraphics;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  document.body.prepend(renderer.domElement);
  const scene=new T.Scene(),realm=new T.Scene();
  let activeScene=scene;
  const camera=new T.PerspectiveCamera(69,1,.055,142);
  const world=new R.World({x:0,y:-9.81,z:0});
  world.timestep=STEP;
  const pipeline=new AssetPipeline(scene,world);
  const response=await fetch('./assets/manifest.json');
  if(!response.ok)throw Error('Could not load the asset manifest.');
  const manifest=await response.json();
  const [terrainTextures,entries]=await Promise.all([textures(),Promise.all(Object.entries(manifest.models)
    .map(async ([key,url])=>[key,await pipeline.load(key,url)]))]);
  const models=Object.fromEntries(entries);
  configureVillagerModel(models.villager);
  const water=makeTerrain(scene,world,terrainTextures);
  const anchors={rangerCabin:[cabinX,cabinY,cabinZ]};
  for(const placement of manifest.placements){
    if(!models[placement.model])throw Error('Unknown model '+placement.model);
    const position=placement.anchor?anchors[placement.anchor]:placement.position;
    if(!position)throw Error('No position for '+placement.model);
    pipeline.place(models[placement.model],{...placement,position});
  }
  forest(pipeline,models);
  lighting(scene,mobile);
  const walker=new Walker(world,spawn);
  const mechanics=new Mechanics(world,walker,scene,realm);
  const story=new Story(mechanics,pipeline,models);
  buildCampEquipment(mechanics,pipeline,models);
  const bag=new Bag(mechanics);
  story.installJournalInsert(bag);
  story.missions.equipBatteryBag(bag);
  const rescue=new Rescue(mechanics,story,bag,message=>notice(message));
  const finale=new Finale(mechanics,rescue,bag,pipeline,models,water,message=>notice(message));
  const mail=new MailRoute(mechanics,bag,pipeline,models,finale);
  const campLife=new CampLife(mechanics,bag,message=>notice(message));
  const chapters=new Chapters(mechanics,story,finale,bag,message=>notice(message));
  const townDiner=new Diner(mechanics,chapters,bag,pipeline,models);
  const millYard=new MillYard(mechanics,bag,message=>notice(message),()=>chapters.stage>=2);
  const creekEncounter=new CreekEncounter(mechanics,bag,message=>notice(message));
  scene.add(camera);
  const pistol=fieldPistol(),scattergun=fieldPistol(true);
  const flarePistol=pipeline.prepare(models.flarePistol,{yaw:Math.PI,scale:1.12});
  const slingshot=pipeline.prepare(models.slingshot,{scale:1.1});
  const rifle=pipeline.prepare(models.leverRifle,{scale:.91});
  const weapons=[pistol,scattergun,flarePistol,slingshot,rifle];
  const weaponNames=['Pistol','Scattergun','Flare','Slingshot','Lever rifle'];
  let weapon=0;
  camera.add(...weapons);
  world.step();
  let noticeUntil=0;
  const notice=(message)=>{
    if(message){$('notice').textContent=message;noticeUntil=performance.now()+6400;}
  };
  let audio=null,ambient=null,master=null,engine=null,foreground=true;
  let audioWanted=false,footstepTime=0;
  const effects=new Set();
  const syncAudio=()=>{
    if(!audio)return;
    const enabled=foreground&&audioWanted;
    master.gain.setValueAtTime(Number(enabled),audio.currentTime);
    if(enabled){audio.resume().catch(()=>{});return;}
    for(const tone of effects){try{tone.stop();}catch{}}
    audio.suspend().catch(()=>{});
  };
  watchAudioFocus(visible=>{foreground=visible;syncAudio();});
  const unlockAudio=()=>{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio||!foreground)return;
    try{
      if(!audio){
        audio=new Audio();
        master=audio.createGain();
        master.gain.value=0;
        master.connect(audio.destination);
        const duration=audio.sampleRate*3,buffer=audio.createBuffer(1,duration,audio.sampleRate);
        const samples=buffer.getChannelData(0);
        let wind=0;
        for(let n=0;n<duration;n++){
          wind=.96*wind+.04*(Math.random()*2-1);
          samples[n]=wind;
        }
        const source=audio.createBufferSource();
        source.buffer=buffer;source.loop=true;
        ambient=audio.createGain();ambient.gain.value=0;
        source.connect(ambient).connect(master);source.start();
        const motor=audio.createOscillator(),gain=audio.createGain();
        motor.type='triangle';
        gain.gain.value=0;
        motor.connect(gain).connect(master);
        motor.start();
        engine={motor,gain};
      }
      audioWanted=true;
      syncAudio();
    }catch(error){
      audio?.close().catch(()=>{});
      audio=ambient=master=engine=null;
      audioWanted=false;
      console.warn('Game audio unavailable',error);
    }
  };
  for(const id of ['start','touch-mode'])$(id).addEventListener('click',unlockAudio);
  const playToolSound=(from,to,duration,volume,position)=>{
    if(!foreground||!audioWanted||audio?.state!=='running')return;
    const time=audio.currentTime;
    const tone=audio.createOscillator(),gain=audio.createGain();
    tone.type='triangle';
    tone.frequency.setValueAtTime(from,time);
    tone.frequency.exponentialRampToValueAtTime(to,time+duration);
    gain.gain.setValueAtTime(volume,time);
    gain.gain.exponentialRampToValueAtTime(.001,time+duration);
    tone.connect(gain);
    const pan=position&&audio.createStereoPanner?audio.createStereoPanner():null;
    if(pan){
      const right=new T.Vector3(1,0,0).applyQuaternion(camera.quaternion);
      const offset=position.clone().sub(camera.position);
      const distance=offset.length();
      pan.pan.value=T.MathUtils.clamp(offset.normalize().dot(right),-1,1);
      gain.gain.setValueAtTime(volume*Math.max(.26,1-distance*.022),time);
      gain.connect(pan).connect(audio.destination);
    }else gain.connect(master);
    effects.add(tone);
    tone.onended=()=>{effects.delete(tone);tone.disconnect();gain.disconnect();pan?.disconnect();};
    tone.start(time);tone.stop(time+duration);
  };
  installFieldRange(mechanics,bag,notice,playToolSound);
  mechanics.onPebble=point=>playToolSound(560,190,.16,.12,point);
  const fordRescue=new FordRescue(mechanics,pipeline,models,story,rescue,bag,notice,
    point=>playToolSound(480,140,.44,.21,point));
  const fieldProps=new FieldProps(mechanics,pipeline,models,rescue,bag,notice,(event,position)=>{
    if(event==='glass')playToolSound(1750,460,.22,.16);
    if(event==='blast')playToolSound(110,28,.37,.30);
    if(event==='pump'||event==='echo')playToolSound(320,84,.42,.18,position);
  });
  const salvage=new SalvageStreet(mechanics,pipeline,models,bag,chapters,campLife,notice,
    ()=>playToolSound(540,330,.68,.23));
  const address=new SecondAddress(mechanics,pipeline,models,bag,notice,chapters);
  installFairground(mechanics);
  const founders=new FoundersNight(mechanics,pipeline,models,bag,notice);
  const extraction=new Extraction(mechanics,chapters,bag,pipeline,models,notice);
  const creekBirds=new CreekBirds(mechanics);
  const creekWildlife=new CreekWildlife(mechanics,bag,notice,point=>playToolSound(610,290,.64,.18,point));
  const wildlife=new Wildlife(mechanics,pipeline,models.cottontail,bag,notice);
  bag.record('field-slingshot','Slingshot','Quiet pebbles arc and scatter nearby wildlife at the point of impact. Use it to break fragile props.','Gear');
  bag.record('field-rifle','Lever-action rifle','A faster, flatter shot for distant targets. Cycle with X or the weapon control.','Gear');
  bag.record('flare-pistol','Flare pistol','Cycle weapons with X or the weapon button. Fire a bouncing light that burns for twelve seconds.','Gear');
  bag.record('contact-mic','Contact microphone','M or Mic · aim at a surface and record its vibration. J or Speaker plays the recording from a placeable speaker.','Gear');
  const loopRoad=new LoopRoad(mechanics,story,bag,notice);
  const portableCamp=new PortableCamp(mechanics,campLife);
  bag.record('portable-camp','Portable camp kit','P or Camp kit · set down a stove, kettle and filter. Cook with your packed ingredients and refill beside the creek.','Gear');
  const workshop=new Workshop(mechanics,bag);
  const serviceGate=new ServiceGate(mechanics,bag);
  bag.record('climbing-harness','Climbing harness','Y or Harness · lock in place while attached to the grapple. Use it again to resume pulling.','Gear');
  bag.record('field-crawler','Workshop crawler','H or Crawler · connect near the workshop. Steer through its camera and use the latch or pull line.','Gear');
  const magnet=new FieldMagnet(mechanics,bag,notice);
  bag.record('field-magnet','Field magnet','N or Magnet · recover dropped metal around camp, the archive bay and the supply shop.','Gear');
  const recorder=new FieldRecorder(mechanics,pipeline,models.receiver,bag,playToolSound);
  const distress=new DistressCall(mechanics,pipeline,models.receiver,bag,townDiner,
    ()=>rescue.stage>=4,point=>playToolSound(380,125,.54,.19,point));
  function sampleContact(){
    if(mechanics.driving||rescue.zipline.active)return;
    const target=mechanics.target(camera);
    if(!target)return notice('Aim the contact microphone at a surface you can reach.');
    notice(recorder.record(target));
  }
  const towLine=new TowLine(mechanics);
  const archiveWindow=new ArchiveWindow(mechanics,bag,towLine,pipeline,models,notice);
  const wagonRecovery=new WagonRecovery(mechanics,bag,towLine,notice,pipeline,models,()=>rescue.stage>=1);
  const baitCooler=new BaitCooler(mechanics,bag,notice,()=>rescue.stage>=1);
  bag.record('tow-line','Two-hook tow line','V or Rig · rig two anchors on foot. If attached to the wagon, use Rig from the driver seat to reel in.','Gear');
  let cableAudio;
  function soundCable(speed){
    if(!foreground||!audioWanted||audio?.state!=='running')return;
    const now=audio.currentTime;
    if(!cableAudio&&speed){
      const tone=audio.createOscillator(),gain=audio.createGain();
      tone.type='triangle';
      gain.gain.value=0;
      tone.connect(gain).connect(master);
      tone.start();
      cableAudio={tone,gain};
    }
    if(cableAudio){
      cableAudio.tone.frequency.setTargetAtTime(43+speed*21,now,.055);
      cableAudio.gain.gain.setTargetAtTime(Math.min(.085,speed*.007),now,.07);
    }
  }
  const gear=new Gear(camera,bag,notice);
  bag.record('field-pistol','Field pistol','Click, press F, or tap Fire to shoot physical rounds. Set down any carried item and exit the wagon first.','Gear');
  bag.record('grapple-hook','Grappling hook','Right click, press G, or tap Hook. Aim at trees, roofs, walls, or the brass spillway ring.','Gear');
  bag.record('signal-lantern','Signal lantern','K or Lantern · leave a warm light beside you. Use again to recall.','Gear');
  const input=new Input(renderer.domElement,()=>{
    if(workshop.active)return notice(workshop.use());
    if(rescue.zipline.active)return notice(rescue.zipline.use());
    notice(mechanics.use(camera));
    if(rescue.zipline.active){
      yaw=rescue.zipline.lookYaw;
      pitch=rescue.zipline.active==='haul'?.21:0;
    }
  },()=>bag.toggle(),()=>gear.toggle(),()=>gear.takePhoto(),()=>{
    if(rescue.zipline.active)return;
    weapon=(weapon+1)%weapons.length;
    if(weapon===1&&!bag.records.has('scattergun'))weapon=2;
    const name=weaponNames[weapon];
    const button=$('weapon-button');
    button.querySelector('span').textContent=name;
    button.setAttribute('aria-label','Switch weapon. Equipped: '+name);
    notice(name+' equipped.');
  },()=>{if(!rescue.zipline.active)gear.deployLantern(mechanics,camera);},
    ()=>{if(!rescue.zipline.active)notice(campLife.drink());},
    ()=>{if(!rescue.zipline.active)notice(mechanics.toggleStrap());},sampleContact,()=>{if(!rescue.zipline.active)notice(towLine.select(camera));},
    ()=>{if(!rescue.zipline.active)notice(recorder.deploy(camera));},
    ()=>{if(!rescue.zipline.active)notice(magnet.use(camera));},
    ()=>{if(!rescue.zipline.active)notice(workshop.toggle());},
    ()=>{if(!rescue.zipline.active&&!workshop.active)notice(portableCamp.toggle(camera));},
    ()=>{if(!rescue.zipline.active&&!workshop.active)notice(mechanics.toggleHarness());},
    ()=>{if(!rescue.zipline.active&&!workshop.active)notice(serviceGate.cut(camera));});
  $('start').disabled=false;
  $('start').textContent='Walk the ridge';
  $('touch-mode').disabled=false;
  let imports=0;
  $('import').onchange=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    $('status').textContent='Loading '+file.name+'…';
    const url=URL.createObjectURL(file);
    try{
      const {scene:model}=await pipeline.loader.loadAsync(url);
      model.updateMatrixWorld(true);
      const bounds=new T.Box3().setFromObject(model);
      const size=bounds.getSize(new T.Vector3());
      const longest=Math.max(size.x,size.y,size.z);
      if(bounds.isEmpty()||!Number.isFinite(longest)||longest<.00001)throw Error('No usable mesh geometry.');
      const scale=1.7/longest,center=bounds.getCenter(new T.Vector3());
      const z=31-imports*3,x=trailX(z)+3.8;
      const position=[x-center.x*scale,height(x,z)-bounds.min.y*scale+.015,z-center.z*scale];
      mechanics.dynamic({...pipeline.loose(model,scale),position,name:file.name.replace(/\.glb$/i,''),area:0});
      imports++;
      world.step();
      renderer.shadowMap.needsUpdate=true;
      $('status').textContent=file.name+' placed on the east side of the trail as a loose prop you can pick up and throw.';
    }catch(error){$('status').textContent='Import failed: '+error.message;}
    finally{URL.revokeObjectURL(url);e.target.value='';}
  };
  const resize=()=>{
    renderer.setSize(innerWidth,innerHeight);
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();addEventListener('resize',resize);
  let yaw=.34,pitch=-.11,last=performance.now(),accumulator=0,lastWake=-Infinity;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.setAnimationLoop(now=>{
    const dt=Math.min(.1,(now-last)/1000);last=now;
    if(ambient&&foreground){
      ambient.gain.setTargetAtTime(input.active?(story.area?.14:.34):0,audio.currentTime,.18);
      const driving=input.active&&mechanics.driving;
      const speed=driving?vec(mechanics.car.body.linvel()).length():0;
      engine.motor.frequency.setTargetAtTime(31+speed*3.7,audio.currentTime,.12);
      engine.gain.gain.setTargetAtTime(driving?.027+Math.min(.058,speed*.004):0,audio.currentTime,.13);
    }
    if(input.active&&!input.toolsOpen&&!document.querySelector('dialog[open]')){
      const sensitivity=input.touch?.0048:.00235;
      if(!mechanics.driving&&!workshop.active){
        yaw-=input.look[0]*sensitivity;
        pitch=T.MathUtils.clamp(pitch-input.look[1]*sensitivity,-1.52,1.52);
      }
      input.look=[0,0];
      accumulator+=dt;
      while(accumulator>=STEP){
        const move=input.movement();
        move.drift ||= move.jump && mechanics.driving;
        if(workshop.active){
          workshop.step(move,STEP);
          world.step(mechanics.events);
          mechanics.after();
          input.actions.clear();
          accumulator-=STEP;
          continue;
        }
        if(rescue.zipline.active){
          const wasRiding=rescue.zipline.active==='ride';
          rescue.zipline.step(move,STEP);
          world.step(mechanics.events);
          mechanics.after();
          input.actions.clear();
          if(wasRiding&&!rescue.zipline.active)pitch=0;
          accumulator-=STEP;
          continue;
        }
        if(input.actions.has('fire')){
          const before=mechanics.cooldown;
          if(weapon===2){
            if(fireFlare(mechanics,camera))playToolSound(430,73,.25,.23);
          }else{
            mechanics.fire(camera,weapon===1,weapon===3?'slingshot':weapon===4?'rifle':'pistol');
            if(mechanics.cooldown>before){
              if(weapon===3)playToolSound(320,130,.08,.065);
              else playToolSound(weapon===1?94:weapon===4?115:168,41,weapon===1||weapon===4?.23:.13,.28);
            }
          }
        }
        if(input.actions.has('grapple')){
          const result=mechanics.grapple(camera);
          notice(result);
          if(result&&!result.startsWith('Aim'))playToolSound(640,150,.14,.1);
        }
        mechanics.before(camera,move,input);
        input.actions.clear();
        if(mechanics.driving)world.step(mechanics.events);
        else if(mechanics.harnessSuspended){
          walker.ride(walker.current);
          world.step(mechanics.events);
        }else {
          if(story.area===0&&finale.onFloodedFord(walker.current)){move.x*=.58;move.z*=.58;move.sprint=false;}
          if(input.touch&&campLife.energy>0&&Math.hypot(...input.stick)>.96)move.sprint=true;
          if(mechanics.carried?.size){move.x*=.75;move.z*=.75;move.sprint=false;}
          walker.step({...move,pull:mechanics.anchor,sprintBoost:campLife.energy>0,jumpBoost:campLife.hydrated>0},yaw,mechanics.events);
          const pace=Math.hypot(walker.velocity.x,walker.velocity.z);
          if(walker.control.computedGrounded()&&pace>1.1&&Math.hypot(move.x,move.z)>.12){
            footstepTime-=STEP;
            if(footstepTime<=0){
              const wet=story.area===0&&inCreek(walker.current.x,walker.current.z)&&walker.current.y<-.62;
              playToolSound(wet?275:113,wet?95:49,wet?.16:.095,wet?.14:.09);
              footstepTime=Math.max(.26,.59-pace*.043);
            }
          }else footstepTime=Math.min(.11,footstepTime);
        }
        mechanics.after();
        story.missions.tick(STEP);
        rescue.tick(now*.001);
        fordRescue.tick(STEP);
        finale.tick(STEP);
        mail.tick(now*.001);
        campLife.tick(STEP);
        creekEncounter.tick(STEP);
        fieldProps.tick(STEP);
        salvage.tick(STEP);
        address.tick(STEP);
        founders.tick(STEP);
        millYard.tick(STEP);
        chapters.tick();
        extraction.tick(STEP);
        loopRoad.tick(STEP);
        magnet.tick(STEP,camera);
        recorder.tick(STEP);
        const pebble=mechanics.pebbleNoise;
        const wildlifeNoise=pebble?.area===0?pebble.position:recorder.area===0?recorder.source:null;
        wildlife.tick(STEP,wildlifeNoise);
        creekBirds.tick(STEP,wildlifeNoise);
        creekWildlife.tick(STEP);
        checkLookoutSignal(mechanics,finale.lookout,bag,notice,point=>playToolSound(620,860,.42,.2,point));
        baitCooler.tick(STEP);
        towLine.tick(STEP,move);
        wagonRecovery.tick(STEP);
        archiveWindow.tick(STEP);
        if(!mechanics.driving&&!mechanics.harnessSuspended){
          const transition=story.transition(walker.current,STEP);
          if(transition){
            notice(transition.notice);
            if(transition.position){
              walker.teleport(transition.position);yaw=transition.yaw;pitch=0;
              activeScene=transition.area?realm:scene;activeScene.add(camera);
              renderer.shadowMap.needsUpdate=true;
            }
          }
        }
        accumulator-=STEP;
      }
    }else accumulator=0;
    if(mechanics.driving){
      const center=vec(mechanics.car.body.translation());
      const rotation=new T.Quaternion().copy(mechanics.car.body.rotation());
      const offset=new T.Vector3(0,2.15,4.7).applyQuaternion(rotation);
      const hit=mechanics.ray(center,offset.clone().normalize(),offset.length(),mechanics.car);
      if(hit)offset.setLength(Math.max(1,hit.timeOfImpact-.25));
      camera.position.copy(center).add(offset);
      camera.lookAt(center.add(new T.Vector3(0,.44,0)));
    }else{
      camera.position.lerpVectors(walker.previous,walker.current,input.active?accumulator/STEP:1);
      camera.position.y+=.58;
      camera.rotation.set(pitch,yaw,0,'YXZ');
    }
    const riding=input.active&&rescue.zipline.active==='ride';
    soundCable(riding?rescue.zipline.speed:0);
    if(workshop.active)workshop.view(camera);
    if(riding)camera.rotation.z=Math.sin(now*.008)*Math.min(.042,rescue.zipline.speed*.003);
    camera.updateMatrixWorld();
    const tool=weapons[weapon];
    for(const model of weapons)model.visible=false;
    tool.visible=!workshop.active&&!mechanics.driving&&!mechanics.carried&&!rescue.zipline.active;
    const stride=mechanics.driving?0:Math.min(1,Math.hypot(walker.velocity.x,walker.velocity.z)/5);
    const recoil=Math.min(.15,Math.max(0,mechanics.cooldown-([.065,.45,.67,.33,.67][weapon])));
    tool.position.set(.173+Math.sin(now*.008)*.009*stride,-.19+Math.cos(now*.016)*.006*stride,-.49+recoil*.58);
    tool.rotation.x=recoil*.9;
    mechanics.drawWater(now*.001);
    mechanics.draw(camera);
    water.uniforms.time.value=now*.001;
    const player=mechanics.driving?mechanics.car.body.translation():walker.current;
    if(story.area===0&&inCreek(player.x,player.z)&&now-lastWake>360&&
      (mechanics.driving||walker.velocity.lengthSq()>1)){
      water.uniforms.ripple.value.set(player.x,player.z,now*.001);lastWake=now;
    }
    story.animate(now*.001);
    const objective=fordRescue.objective()??loopRoad.objective()??salvage.objective()??
      address.objective()??founders.objective()??extraction.objective()??archiveWindow.objective()??wagonRecovery.objective()??baitCooler.objective()??distress.objective()??townDiner.objective()??chapters.objective()??
      (rescue.showPractice?rescue.objective():null)??fieldProps.objective()??finale.objective()??rescue.objective();
    $('guide').textContent=workshop.active?workshop.hint():objective?.text??story.guide(player);
    const waypoint=objective?objective.target:story.waypoint();
    const arrow=$('bearing');
    arrow.hidden=workshop.active||!waypoint;
    if(waypoint){
      const forward=camera.getWorldDirection(new T.Vector3());
      const heading=Math.atan2(waypoint.x-player.x,-(waypoint.z-player.z))-Math.atan2(forward.x,-forward.z);
      arrow.style.transform='rotate('+heading+'rad)';
    }
    $('hud').querySelector('strong').textContent=story.area?'THE ECHO GRID':'FOXGLOVE RIDGE';
    if(now>noticeUntil)$('notice').textContent='';
    const target=input.active&&!input.toolsOpen&&!mechanics.driving?mechanics.target(camera):null;
    const use=input.touch?'Use':'E';
    const hint=input.active&&!input.toolsOpen?(workshop.active?use+' · Operate crawler':rescue.zipline.active?rescue.zipline.readout(input.touch):
      mechanics.driving?use+' · Exit wagon':mechanics.carried?(target?.acceptName?use+' · '+target.acceptName:
        target===mechanics.car&&mechanics.carried.size?use+' · Load the wagon':use+' · Set down'):
      target===mechanics.car&&mechanics.canUnloadCargo()?use+' · Unload cargo':target?.name?use+' · '+target.name:''):'';
    const hintNode=$('hint');
    if(hintNode.textContent!==hint)hintNode.textContent=hint;
    hintNode.hidden=!hint;
    $('use').classList.toggle('has-target',Boolean(hint));
    $('strap-button').hidden=!mechanics.cargo||mechanics.driving;
    const strapLabel=mechanics.cargoSecured?'Unstrap cargo':'Strap cargo';
    const strap=$('strap-button');
    if(strap.getAttribute('aria-label')!==strapLabel){
      strap.setAttribute('aria-label',strapLabel);
      strap.querySelector('span').textContent=strapLabel;
    }
    const handsBusy=Boolean(mechanics.carried);
    const inRide=Boolean(rescue.zipline.active);
    $('fire').hidden=mechanics.driving||handsBusy||inRide;
    $('throw').hidden=mechanics.driving||!handsBusy||inRide;
    $('grapple').hidden=mechanics.driving||inRide;
    $('jump').setAttribute('aria-label',mechanics.driving?'Brake or drift':inRide?'Switch zip-line anchor':'Jump');
    const reticle=$('reticle');
    reticle.hidden=mechanics.driving||!input.active||input.toolsOpen;
    reticle.classList.toggle('on-target',Boolean(target?.name));
    renderer.render(activeScene,camera);
    if(gear.capture(renderer.domElement,story.area,player))notice(wildlife.photograph(camera));
  });
}
boot().catch(error=>{$('status').textContent=error.message;console.error(error);});
