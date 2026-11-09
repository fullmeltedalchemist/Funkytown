import * as T from 'three';
import R from 'rapier';
import {groundPoint} from './field-stations.js';

export class CreekEncounter {
  delay=18;
  time=0;
  constructor(mechanics,bag,notice){
    Object.assign(this,{mechanics,notice});
    this.site=groundPoint(-8.1,6.8);
    this.flock=new T.Group();
    this.flock.position.copy(this.site);
    mechanics.scenes[0].add(this.flock);
    this.flock.visible=false;
    const mesh=new T.SphereGeometry(.036,6,5);
    const glow=new T.MeshBasicMaterial({color:0xe4ff80});
    for(let i=0;i<13;i++)this.flock.add(new T.Mesh(mesh,glow));
    const collider=mechanics.world.createCollider(R.ColliderDesc.ball(.43).setSensor(true)
      .setTranslation(this.site.x,this.site.y+.95,this.site.z).setCollisionGroups((128<<16)|2));
    this.collider=collider;
    collider.setEnabled(false);
    mechanics.tag(collider,{name:'Watch the fireflies',action:()=>{
      if(!bag.records.has('creek-fireflies')){
        bag.record('creek-fireflies','Fireflies at the old ford',
          'The fireflies trace a ring above the bank. For a few seconds the creek goes quiet.','Keepsakes');
      }
      this.remaining=Math.min(this.remaining,6);
      return 'The swarm spirals up and scatters over the water.';
    }});
  }
  tick(dt){
    this.time+=dt;
    if(this.flock.visible){
      this.remaining-=dt;
      if(this.remaining<=0){
        this.flock.visible=false;
        this.collider.setEnabled(false);
        this.delay=85+Math.random()*70;
        return;
      }
      this.flock.children.forEach((fly,i)=>{
        const phase=i*2.399+this.time*(.7+i%3*.25);
        const radius=.32+i*.065;
        fly.position.set(Math.cos(phase)*radius,
          .93+Math.sin(phase*1.2)*.41,Math.sin(phase)*radius);
        fly.scale.setScalar(.65+.35*Math.sin(this.time*4+i));
      });
      return;
    }
    if(this.mechanics.area!==0||this.mechanics.driving)return;
    const position=this.mechanics.walker.current;
    if(Math.hypot(position.x-this.site.x,position.z-this.site.z)>14)return;
    this.delay-=dt;
    if(this.delay>0)return;
    this.remaining=29;
    this.flock.visible=true;
    this.collider.setEnabled(true);
    this.notice('Fireflies are gathering on the west side of the old ford.');
  }
}
