import * as T from 'three';
import R from 'rapier';
import {AssetPipeline} from './assets.js';
import {cabinX,cabinY,cabinZ,height,makeTerrain,spawn,trailDistance,trailX} from './terrain.js';
import {Walker,STEP} from './walker.js';
import {Input} from './input.js';
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
    grove[type].push({x,y:height(x,z)-sink,z,scale,yaw:rnd()*Math.PI*2});
  }
  for(let i=0;i<490;i++){
    const x=(rnd()-.5)*106,z=(rnd()-.5)*106;
    const d=trailDistance(x,z);
    const yard=Math.max(Math.abs(x-cabinX),Math.abs(z-cabinZ));
    if(d<2.7||yard<7.9)continue;
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
    if(trailDistance(x,z)<2.5||Math.hypot(x-cabinX,z-cabinZ)<8)continue;
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
function readBook(camera){
  const book=new T.Vector3(cabinX-2.37,cabinY+1.12,cabinZ-1.38);
  const toBook=book.clone().sub(camera.position),distance=toBook.length();
  return distance<2.4 && camera.getWorldDirection(new T.Vector3()).dot(toBook.normalize())>.66;
}
async function boot(){
  await R.init();
  const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  const mobile=matchMedia('(pointer:coarse)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.2:1.65));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  document.body.prepend(renderer.domElement);
  const scene=new T.Scene();
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
  world.step();
  let found=false;
  const input=new Input(renderer.domElement,()=>{
    if(readBook(camera)){found=true;$('guide').textContent='Ranger log found';}
  });
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
      pipeline.place(model,{position:[x-center.x*scale,height(x,z)-bounds.min.y*scale,z-center.z*scale],scale,collider:'hull'});
      imports++;
      world.step();
      renderer.shadowMap.needsUpdate=true;
      $('status').textContent=file.name+' placed on the east side of the trail with a collision hull.';
    }catch(error){$('status').textContent='Import failed: '+error.message;}
    finally{URL.revokeObjectURL(url);e.target.value='';}
  };
  const resize=()=>{
    renderer.setSize(innerWidth,innerHeight);
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
  };
  resize();addEventListener('resize',resize);
  let yaw=.34,pitch=-.11,last=performance.now(),accumulator=0;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.setAnimationLoop(now=>{
    const dt=Math.min(.1,(now-last)/1000);last=now;
    if(input.active){
      const sensitivity=input.touch?.0048:.00235;
      yaw-=input.look[0]*sensitivity;
      pitch=T.MathUtils.clamp(pitch-input.look[1]*sensitivity,-1.52,1.52);
      input.look=[0,0];
      accumulator+=dt;
      while(accumulator>=STEP){
        walker.step(input.movement(),yaw);accumulator-=STEP;
      }
    }else accumulator=0;
    camera.position.lerpVectors(walker.previous,walker.current,input.active?accumulator/STEP:1);
    camera.position.y+=.58;
    camera.rotation.set(pitch,yaw,0,'YXZ');
    camera.updateMatrixWorld();
    water.uniforms.time.value=now*.001;
    const distance=Math.round(Math.hypot(camera.position.x-cabinX,camera.position.z-cabinZ));
    if(!found)$('guide').textContent='Ranger cabin · '+distance+' m';
    $('hint').textContent=found?'“When the creek runs uphill, stay out of the woods.”':
      readBook(camera)?(input.touch?'Use':'E')+' · Read ranger log':'';
    renderer.render(scene,camera);
  });
}
boot().catch(error=>{$('status').textContent=error.message;console.error(error);});
