import * as T from 'three';
import R from 'rapier';

const {lerp,smoothstep}=T.MathUtils;
export const trailX=(z)=>Math.sin(z*.076)*6.1+Math.sin(z*.16)*1.4-3.6*Math.exp(-((z-26)**2)/61);
const creekZ=(x)=>-1+3.3*Math.sin(x*.095);
export const cabinZ=-28;
export const cabinX=trailX(cabinZ);
const ridge=(z)=>5.1*Math.exp(-((z-31)**2)/430)+2.0*Math.exp(-((z+28)**2)/265);
const pool=(x)=>Math.exp(-((x+10)**2)/95);
const creekWidth=(x)=>4.2+6.9*pool(x);
const creek=(x,z)=>Math.exp(-(((z-creekZ(x))/creekWidth(x))**2));
const ford=(x,z)=>1-smoothstep(Math.abs(x-trailX(z)),1.3,3.8);
function hills(x,z){
  return 5.7*Math.exp(-((x+32)**2+(z+20)**2)/600)+
    7.6*Math.exp(-((x-31)**2+(z-20)**2)/650)+
    11.2*Math.exp(-((x-36)**2+(z+38)**2)/460)+
    7.5*Math.exp(-((x+34)**2+(z-36)**2)/400);
}
function rawHeight(x,z){
  const distance=Math.abs(x-trailX(z));
  const outside=smoothstep(distance,2.1,9);
  const ripple=.68*Math.sin(x*.19+z*.12)*Math.cos(z*.24)+.22*Math.sin(x*.51-z*.41);
  return ridge(z)-(2.92+pool(x)*1.45)*creek(x,z)+(ripple+hills(x,z))*outside+ford(x,z)*creek(x,z)*.63;
}
export const cabinY=rawHeight(cabinX,cabinZ)+.07;
export const plots=[{name:'Vale House',x:12,z:26,yaw:-Math.PI/2,scale:.82},
  {name:'Bellwether Supply',x:10,z:13,yaw:-Math.PI/2,scale:.83},
  {name:'Post Office',x:-7,z:11,yaw:Math.PI/2,scale:.75}]
  .map(plot=>({...plot,y:rawHeight(plot.x,plot.z)+.045}));
export const basin={x:-33,entry:37,back:9,floor:-2.35,water:-.34};
export function basinInfluence(x,z){
  return (1-smoothstep(Math.abs(x-basin.x),11,15))*
    smoothstep(z,5,basin.back)*(1-smoothstep(z,basin.entry,39));
}
export function height(x,z){
  const yard=1-smoothstep(Math.max(Math.abs(x-cabinX)*.83,Math.abs(z-cabinZ)*.92),4.7,9);
  let result=lerp(rawHeight(x,z),cabinY-.035,yard);
  for(const {x:cx,y,z:cz} of plots){
    const pad=1-smoothstep(Math.max(Math.abs(x-cx),Math.abs(z-cz)),3.5,7);
    result=lerp(result,y-.035,pad);
  }
  const weight=basinInfluence(x,z);
  const ramp=smoothstep(z,22,37);
  return lerp(result,lerp(basin.floor,2.7,ramp),weight);
}
export const spawn=[trailX(38),height(trailX(38),38)+1.1,38];
export const inCreek=(x,z)=>Math.abs(z-creekZ(x))<creekWidth(x)*1.35&&height(x,z)<-1.71;
export const trailDistance=(x,z)=>Math.abs(x-trailX(z));
export function makeTerrain(scene,world,textures){
  const size=114,cells=152;
  const geo=new T.PlaneGeometry(size,size,cells,cells).rotateX(-Math.PI/2);
  const pos=geo.attributes.position;
  const color=new Float32Array(pos.count*3),uv=geo.attributes.uv;
  const moss=new T.Color(0x92a877),needle=new T.Color(0xb9a684);
  const dirt=new T.Color(0xddb98d),stone=new T.Color(0x9f9f9d);
  const temp=new T.Color();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i), y=height(x,z);
    pos.setY(i,y);
    uv.setXY(i,x*.43,z*.43);
    const grain=.5+.5*Math.sin(x*.47+z*.31)*Math.cos(z*.77-x*.35);
    const front=plots[0].x-4.4;
    const spur=x>trailX(26)-.4&&x<front+.65?Math.abs(z-26)*1.35:Infinity;
    const near=1-smoothstep(Math.min(trailDistance(x,z),spur)+.27*Math.sin(z*1.5),.95,2.35);
    temp.copy(moss).lerp(needle,grain*.66);
    temp.lerp(stone,creek(x,z)*.63).lerp(dirt,near*.85);
    temp.multiplyScalar(.78+.24*grain).toArray(color,i*3);
  }
  geo.setAttribute('color',new T.BufferAttribute(color,3));
  geo.computeVertexNormals();
  world.createCollider(R.ColliderDesc.trimesh(pos.array,new Uint32Array(geo.index.array)).setFriction(.85));
  const ground=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.99,
    map:textures.floor,normalMap:textures.normal,normalScale:new T.Vector2(.53,.53)}));
  ground.receiveShadow=true;
  scene.add(ground);

  // The stream is a shallow animated ribbon. The bed remains physical terrain.
  const points=[],indices=[];
  for(let i=0;i<=112;i++){
    const x=-55+i*110/112,z=creekZ(x);
    const width=creekWidth(x)*1.35;
    for(let j=0;j<=8;j++){
      points.push(x,-1.68,z+width*(j/4-1));
      if(i<112&&j<8){const a=i*9+j;indices.push(a,a+1,a+9,a+1,a+10,a+9);}
    }
  }
  const streamGeo=new T.BufferGeometry();
  streamGeo.setAttribute('position',new T.Float32BufferAttribute(points,3));
  streamGeo.setIndex(indices);
  const water=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{time:{value:0},current:{value:0},flood:{value:0},
    ripple:{value:new T.Vector3(0,0,-100)}},
    vertexShader:`
      varying vec3 p; uniform float flood;
      void main(){p=position;p.y+=flood*.48*exp(-p.x*p.x*.045);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
    `,
    fragmentShader:`
      uniform float time; uniform float current; uniform vec3 ripple; varying vec3 p;
      void main(){
        float a=sin(p.x*2.1+p.z*9.+current*2.);
        float b=sin(p.x*5.4-p.z*15.+current*2.7);
        float sparkle=pow(max(0.,a*.5+b*.5),6.);
        float ripples=.5+.5*sin(p.z*10.+p.x*1.2+time);
        vec3 water=mix(vec3(.032,.16,.14),vec3(.074,.29,.25),ripples);
        float age=max(0.,time-ripple.z);
        float radius=length(p.xz-ripple.xy);
        float wake=sin(radius*18.-age*21.)*exp(-abs(radius-age*1.9)*4.)*exp(-age*2.);
        gl_FragColor=vec4(water+sparkle*vec3(.35,.46,.39)+wake*.07,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `});
  scene.add(new T.Mesh(streamGeo,water));
  return water;
}
