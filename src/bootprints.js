import * as T from 'three';

const key='bellwether-bootprints-v1';
const limit=48;

export class Bootprints {
  constructor(scene,storage=globalThis.localStorage){
    this.storage=storage;
    this.prints=[];
    try{
      const saved=JSON.parse(storage?.getItem(key)??'[]');
      if(Array.isArray(saved)){
        this.prints=saved.filter(p=>Array.isArray(p)&&p.length===4&&p.every(Number.isFinite)
          &&Math.abs(p[0])<58&&Math.abs(p[2])<58&&p[1]>-5&&p[1]<15).slice(-limit);
      }
    }catch{}
    const sole=new T.Shape().moveTo(-.048,-.14).lineTo(.044,-.14).lineTo(.055,-.055)
      .lineTo(.048,.017).lineTo(.071,.085).quadraticCurveTo(.071,.148,0,.148)
      .quadraticCurveTo(-.074,.141,-.073,.081).lineTo(-.049,.023).closePath();
    this.mesh=new T.InstancedMesh(new T.ShapeGeometry(sole).rotateX(-Math.PI/2),
      new T.MeshBasicMaterial({color:0x39281e,transparent:true,opacity:.43,depthWrite:false,
        polygonOffset:true,polygonOffsetFactor:-2}),limit);
    this.mesh.frustumCulled=false;
    this.mesh.renderOrder=2;
    scene.add(this.mesh);
    this.matrix=new T.Matrix4();
    this.render();
  }

  step(position,heading,wet,walkable){
    if(wet){this.remaining=8;return;}
    if(!this.remaining)return;
    this.remaining--;
    if(!walkable)return;
    const side=this.remaining%2?.10:-.10;
    this.prints.push([position.x+Math.cos(heading)*side,position.y+.013,
      position.z-Math.sin(heading)*side,heading]);
    if(this.prints.length>limit)this.prints.shift();
    this.render();
    try{this.storage?.setItem(key,JSON.stringify(this.prints));}catch{}
  }

  render(){
    this.mesh.count=this.prints.length;
    for(const [index,[x,y,z,heading]] of this.prints.entries()){
      this.matrix.makeRotationY(heading).setPosition(x,y,z);
      this.mesh.setMatrixAt(index,this.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate=true;
  }
}
