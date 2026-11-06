import * as T from 'three';

export function fieldPistol(){
  const rig=new T.Group();
  const steel=new T.MeshStandardMaterial({color:0x35373a,roughness:.42,metalness:.52});
  const grip=new T.MeshStandardMaterial({color:0x463329,roughness:.87});
  const canvas=new T.MeshStandardMaterial({color:0x66634d,roughness:1});
  const leather=new T.MeshStandardMaterial({color:0x40362b,roughness:.87});
  function piece(geo,material,x,y,z){
    const mesh=new T.Mesh(geo,material);
    mesh.position.set(x,y,z);rig.add(mesh);return mesh;
  }
  piece(new T.BoxGeometry(.074,.064,.239),steel,0,.034,-.06);
  piece(new T.BoxGeometry(.076,.042,.181),steel,0,-.011,-.026);
  const barrel=piece(new T.CylinderGeometry(.021,.021,.077,16),steel,0,.031,-.172);
  barrel.rotation.x=Math.PI/2;
  const muzzle=piece(new T.CircleGeometry(.011,16),grip,0,.031,-.212);
  muzzle.rotation.y=Math.PI;
  piece(new T.BoxGeometry(.014,.013,.02),steel,0,.069,-.163);
  for(let i=0;i<5;i++)piece(new T.BoxGeometry(.078,.027,.003),grip,0,.038,.004+i*.008);
  piece(new T.BoxGeometry(.053,.112,.062),grip,0,-.065,.035).rotation.x=-.18;
  const guard=piece(new T.TorusGeometry(.034,.006,8,20),steel,0,-.044,-.038);
  guard.rotation.y=Math.PI/2;
  function hand(x,y,z,angle){
    const sleeve=piece(new T.CapsuleGeometry(.037,.23,6,12),canvas,x,y,z+.156);
    sleeve.rotation.set(1.23,0,angle);
    const palm=piece(new T.SphereGeometry(.036,14,10),leather,x,y+.026,z);
    palm.scale.set(.82,1.16,1.42);
    for(let i=0;i<4;i++){
      const finger=piece(new T.CapsuleGeometry(.008,.027,4,8),leather,x*.62,y-.008+i*.014,z-.022);
      finger.rotation.z=Math.PI/2;
    }
  }
  hand(.028,-.084,.043,-.18);
  hand(-.042,-.079,-.028,.49);
  return rig;
}

export function spillwayStream(){
  const path=new T.CatmullRomCurve3([
    new T.Vector3(0,.06,0),new T.Vector3(.042,.025,.29),
    new T.Vector3(.08,-.22,.61),new T.Vector3(.13,-.63,.91),
    new T.Vector3(.2,-1.25,1.16)
  ]);
  const material=new T.ShaderMaterial({
    transparent:true,depthWrite:false,side:T.FrontSide,
    uniforms:{clock:{value:0},flow:{value:1}},
    vertexShader:`
      uniform float clock;
      varying vec2 tex;
      varying vec3 n;
      varying vec3 viewDir;
      void main(){
        tex=uv;
        vec3 p=position+normal*(sin(uv.x*66.-clock*16.+uv.y*19.)*.011);
        vec4 mv=modelViewMatrix*vec4(p,1.);
        n=normalize(normalMatrix*normal);viewDir=normalize(-mv.xyz);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      uniform float clock,flow;
      varying vec2 tex;
      varying vec3 n,viewDir;
      void main(){
        float rim=pow(1.-abs(dot(normalize(n),normalize(viewDir))),2.);
        float streak=pow(.5+.5*sin(tex.y*74.+sin(tex.x*19.-clock*12.)*.64),8.);
        float shimmer=.5+.5*sin(tex.x*71.-clock*23.+tex.y*11.);
        vec3 color=mix(vec3(.25,.43,.45),vec3(.84,.93,.89),rim*.78+streak*.22);
        float endFade=1.-smoothstep(.83,1.,tex.x);
        gl_FragColor=vec4(color,(.44+rim*.36+streak*shimmer*.18)*endFade*flow);
        #include <colorspace_fragment>
      }`
  });
  const mesh=new T.Mesh(new T.TubeGeometry(path,36,.105,12,false),material);
  mesh.visible=false;
  return mesh;
}
