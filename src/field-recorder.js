import * as T from 'three';
import {height} from './terrain.js';

const key='bellwether-contact-sample-v1';

export class FieldRecorder {
  constructor(mechanics,pipeline,model,bag,sound){
    Object.assign(this,{mechanics,pipeline,model,bag,sound});
    try{
      const sample=JSON.parse(localStorage.getItem(key));
      if(typeof sample?.message==='string'&&Number.isFinite(sample.strength)&&sample.strength>=0&&sample.strength<=1){
        this.sample=sample;
      }
    }catch{}
  }
  record(target){
    const sample=target.contact?.()??{
      strength:target.body?Math.min(1,target.body.linvel().length*.24):0,
      message:'Contact sample taken.'
    };
    this.sample={strength:sample.strength,message:sample.message};
    try{localStorage.setItem(key,JSON.stringify(this.sample));}catch{}
    const percent=Math.round(sample.strength*100);
    this.bag.record('last-contact-sample','Latest contact recording',
      sample.message+' Signal '+percent+'%. Play it back with Speaker.');
    this.play();
    return sample.message+' Contact signal '+percent+'%.';
  }
  play(position){
    const strength=this.sample.strength;
    if(strength)this.sound(90+strength*155,61,.34,.18*strength,position);
  }
  deploy(camera){
    const m=this.mechanics;
    if(m.driving||m.carried)return 'Stand on foot with both hands free to place the speaker.';
    if(!this.sample)return 'Record a contact sample with Mic first.';
    if(!this.speaker){
      this.speaker=this.pipeline.prepare(this.model,{scale:.52});
      const bounds=new T.Box3().setFromObject(this.speaker);
      this.base=bounds.isEmpty()?0:bounds.min.y;
      this.indicator=new T.PointLight(0x75ffc3,0,3,2);
      this.indicator.position.y=.34;
      this.speaker.add(this.indicator);
    }
    const direction=camera.getWorldDirection(new T.Vector3());
    direction.y=0;
    const wall=m.aim(camera,2.6);
    const distance=wall?Math.max(.55,wall.timeOfImpact-.4):2.6;
    const site=m.walker.current.clone().addScaledVector(direction.normalize(),distance);
    site.y=m.area?-.015:height(site.x,site.z);
    this.speaker.position.copy(site);
    this.speaker.position.y-=this.base;
    m.scenes[m.area].add(this.speaker);
    this.indicator.intensity=3;
    this.remaining=2;
    this.area=m.area;
    this.source=this.sample.strength>=.12?site:null;
    this.play(site);
    return this.sample.strength?'Speaker placed. Playing the contact sample.':'Speaker placed. The recording is silent.';
  }
  tick(dt){
    if(!this.remaining)return;
    this.remaining=Math.max(0,this.remaining-dt);
    if(this.remaining)return;
    this.indicator.intensity=0;
    this.source=null;
  }
}
