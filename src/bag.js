import * as T from 'three';
import R from 'rapier';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {cabinX,cabinZ,height,plots} from './terrain.js';

const key='bellwether-bag-v1';
const vale=plots[0];
const finds=[
  {id:'compass',name:'Vale survey compass',description:'A brass compass with a scratched V on the lid.',area:0,x:vale.x-3.9,z:vale.z+1.2},
  {id:'badge',name:'Foxglove ranger badge',description:'The enamel is worn along the rim. The pin still works.',area:0,x:cabinX+2.1,z:cabinZ+4.4},
  {id:'tape',name:'Echo field cassette',description:'The handwritten label says DO NOT ERASE.',area:1,x:142.1,z:3.7}
];
const metal=(color)=>new T.MeshStandardMaterial({color,roughness:.49,metalness:.45});
function collectible(id){
  const root=new T.Group();
  function add(geometry,color,x=0,y=0,z=0){
    const mesh=new T.Mesh(geometry,metal(color));
    mesh.position.set(x,y,z);root.add(mesh);return mesh;
  }
  if(id==='compass'){
    add(new T.CylinderGeometry(.142,.144,.047,28),0xb4955d);
    add(new T.CylinderGeometry(.114,.114,.011,24),0xe4d4a7,0,.027);
    add(new T.TorusGeometry(.124,.012,6,28),0x8b703d,0,.029).rotation.x=-Math.PI/2;
    add(new T.ConeGeometry(.023,.16,4),0x913930,0,.039).rotation.z=-Math.PI/2;
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      add(new T.BoxGeometry(.008,.002,.019),0x514634,Math.sin(angle)*.098,.036,Math.cos(angle)*.098).rotation.y=angle;
    }
  }else if(id==='badge'){
    add(new T.CylinderGeometry(.131,.14,.031,8),0xa99a61);
    add(new T.CylinderGeometry(.107,.112,.011,8),0x41604d,0,.021);
    const pine=add(new T.ConeGeometry(.055,.105,3),0xe3cca0,0,.029);
    pine.rotation.x=Math.PI/2;
  }else{
    add(new RoundedBoxGeometry(.263,.043,.17,2,.008),0x333338);
    add(new T.BoxGeometry(.211,.002,.106),0xc0b98f,0,.023,-.012);
    for(const x of [-.052,.052])add(new T.CylinderGeometry(.025,.025,.006,12),0x49413a,x,.025,-.01);
  }
  root.traverse(node=>{if(node.isMesh)node.receiveShadow=true;});
  return root;
}

export class Bag {
  constructor(mechanics){
    this.panel=document.querySelector('#bag-panel');
    this.list=document.querySelector('#bag-list');
    this.count=document.querySelector('#bag-count');
    let saved=[];
    try{saved=JSON.parse(localStorage.getItem(key)||'[]');}catch{}
    this.ids=new Set(Array.isArray(saved)?saved.filter(id=>finds.some(item=>item.id===id)):[]);
    for(const item of finds){
      if(this.ids.has(item.id))continue;
      const {x,z,area,id,name}=item;
      const y=(area?0:height(x,z))+.22;
      const model=collectible(id);
      model.position.set(x,y,z);model.rotation.set(.28,.23,.16);
      mechanics.scenes[area].add(model);
      const sensor=mechanics.world.createCollider(R.ColliderDesc.ball(.29).setTranslation(x,y,z)
        .setSensor(true).setCollisionGroups((128<<16)|2));
      mechanics.tag(sensor,{name:'Bag '+name,action:()=>{
        this.ids.add(id);
        try{localStorage.setItem(key,JSON.stringify([...this.ids]));}catch{}
        mechanics.fixed.delete(sensor.handle);
        mechanics.world.removeCollider(sensor,false);
        model.removeFromParent();
        model.traverse(node=>{if(node.isMesh){node.geometry.dispose();node.material.dispose();}});
        this.render();
        return name+' added to your bag.';
      }});
    }
    this.render();
  }
  toggle(){this.panel.hidden=!this.panel.hidden;}
  render(){
    this.count.textContent=this.ids.size+' / '+finds.length;
    this.list.replaceChildren();
    if(!this.ids.size){
      const empty=document.createElement('li');empty.textContent='Empty. Look for small keepsakes near the trail and camp.';this.list.append(empty);
      return;
    }
    for(const item of finds){
      if(!this.ids.has(item.id))continue;
      const row=document.createElement('li'),title=document.createElement('strong');
      title.textContent=item.name;row.append(title,document.createTextNode(item.description));this.list.append(row);
    }
  }
}
