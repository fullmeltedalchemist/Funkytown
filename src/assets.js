import * as T from 'three';
import R from 'rapier';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';

const collisionNode=(node)=>node.name.startsWith('COL_');
const pointsFor=(mesh)=>{
  const pos=mesh.geometry.getAttribute('position');
  const points=new Float32Array(pos.count*3);
  const point=new T.Vector3();
  for(let i=0;i<pos.count;i++)point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld).toArray(points,i*3);
  return points;
};
export class AssetPipeline {
  loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  cache=new Map();
  constructor(scene,world){this.scene=scene;this.world=world;}
  async load(key,url){
    const existing=this.cache.get(key);
    if(existing){
      if(existing.url!==url)throw Error('Duplicate asset key '+key);
      return existing.model;
    }
    const model=this.loader.loadAsync(url).then(gltf=>gltf.scene);
    this.cache.set(key,{url,model});
    try{return await model;}catch(error){this.cache.delete(key);throw error;}
  }
  prepare(source,{scale=1,yaw=0,position=[0,0,0]}={}){
    const root=new T.Group();
    root.add(clone(source));
    root.scale.setScalar(scale);
    root.rotation.y=yaw;
    root.position.set(...position);
    root.updateMatrixWorld(true);
    return root;
  }
  place(source,options){
    const root=this.prepare(source,options);
    const shapes=[],visuals=[];
    root.traverse(node=>{
      if(!node.isMesh)return;
      if(collisionNode(node)){node.visible=false;shapes.push(node);return;}
      node.receiveShadow=true;
      node.castShadow=true;
      visuals.push(node);
    });
    if(options.collider==='authored' && !shapes.length)throw Error('Model has no COL_ collider meshes.');
    if(options.collider==='authored'){
      for(const node of shapes){
        const shape=R.ColliderDesc.convexHull(pointsFor(node));
        if(!shape)throw Error('Degenerate collision node: '+node.name);
        this.world.createCollider(shape);
      }
    }
    if(options.collider==='hull'){
      const arrays=visuals.map(pointsFor);
      const vertices=new Float32Array(arrays.reduce((sum,array)=>sum+array.length,0));
      let offset=0;
      for(const array of arrays){vertices.set(array,offset);offset+=array.length;}
      const hull=vertices.length>=12?R.ColliderDesc.convexHull(vertices):null;
      if(hull)this.world.createCollider(hull);
      else{
        if(!visuals.length)throw Error('The asset contains no visual meshes.');
        const bounds=new T.Box3();
        for(const mesh of visuals){
          if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
          bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
        }
        const center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
        this.world.createCollider(R.ColliderDesc.cuboid(...size.toArray().map(n=>Math.max(.025,n/2)))
          .setTranslation(center.x,center.y,center.z));
      }
    }
    this.scene.add(root);
    return root;
  }
  // Keep a loose model's collision in body-local coordinates so it can move.
  loose(source,scale){
    const visual=this.prepare(source,{scale});
    const vertices=[];
    visual.traverse(node=>{
      if(!node.isMesh)return;
      if(collisionNode(node)){node.visible=false;return;}
      node.castShadow=node.receiveShadow=true;
      // Dynamic props own disposable geometry/materials. Keep cache copies intact.
      node.geometry=node.geometry.clone();
      node.material=Array.isArray(node.material)?node.material.map(m=>m.clone()):node.material.clone();
      const points=pointsFor(node);
      for(const value of points)vertices.push(value);
    });
    if(!vertices.length)throw Error('No usable mesh geometry.');
    let shape=R.ColliderDesc.convexHull(new Float32Array(vertices));
    if(!shape){
      const bounds=new T.Box3().setFromArray(vertices);
      const center=bounds.getCenter(new T.Vector3());
      const size=bounds.getSize(new T.Vector3());
      shape=R.ColliderDesc.cuboid(...size.toArray().map(n=>Math.max(.025,n/2)))
        .setTranslation(center.x,center.y,center.z);
    }
    // The root's local scale stays on the rendered model.
    return {visual,shape};
  }
  // Batch repeated foliage by source mesh/material while retaining mesh transforms.
  scatter(source,placements,{solid=false}={}){
    if(!placements.length)return;
    source.updateMatrixWorld(true);
    const parent=new T.Matrix4();
    const local=new T.Matrix4();
    const pivot=new T.Object3D();
    source.traverse(node=>{
      if(!node.isMesh||collisionNode(node))return;
      const batch=new T.InstancedMesh(node.geometry,node.material,placements.length);
      for(let i=0;i<placements.length;i++){
        const {x,y,z,scale,yaw}=placements[i];
        pivot.position.set(x,y,z);pivot.scale.setScalar(scale);pivot.rotation.y=yaw;pivot.updateMatrix();
        parent.copy(pivot.matrix);
        batch.setMatrixAt(i,local.multiplyMatrices(parent,node.matrixWorld));
      }
      batch.castShadow=solid;
      batch.receiveShadow=true;
      this.scene.add(batch);
    });
    if(solid)for(const {x,y,z,scale} of placements){
      this.world.createCollider(R.ColliderDesc.cylinder(1.3*scale,.24*scale)
        .setTranslation(x,y+1.3*scale,z));
    }
  }
}
