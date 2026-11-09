import * as T from 'three';
import {height} from './terrain.js';
import {part} from './mechanics.js';

export class Gear {
  constructor(camera,bag,notice){
    this.notice=notice;
    this.bag=bag;
    this.pendingPhoto=false;
    this.light=new T.SpotLight(0xffe9ba,0,24,.34,.58,1.8);
    this.light.position.set(.13,-.12,0);
    this.light.target.position.set(.13,-.12,-12);
    camera.add(this.light,this.light.target);
    bag.record('camera','Field camera','Quick slot 2 · tap Photo or press C to capture the current view.','Gear');
    bag.record('flashlight','Field flashlight','Quick slot 1 · tap Light or press L to toggle.','Gear');
  }
  deployLantern(mechanics,camera){
    if(mechanics.driving)return this.notice('Exit the wagon to set the lantern down.');
    if(this.lantern?.parent){
      this.lantern.removeFromParent();
      return this.notice('Signal lantern recalled.');
    }
    if(!this.lantern){
      this.lantern=new T.Group();
      part(this.lantern,[.28,.085,.28],[0,.05,0],0x353837,.024);
      const flame=new T.Mesh(new T.CapsuleGeometry(.063,.14,5,12),new T.MeshBasicMaterial({color:0xffb14a}));
      flame.position.y=.19;
      const light=new T.PointLight(0xffac47,13,12,2);
      light.position.y=.32;
      const cap=part(this.lantern,[.23,.06,.23],[0,.34,0],0x353837,.022);
      cap.castShadow=false;
      for(const x of [-.096,.096])for(const z of [-.096,.096]){
        part(this.lantern,[.023,.27,.023],[x,.20,z],0x53514b);
      }
      this.lantern.add(flame,light);
    }
    const player=mechanics.walker.current;
    const direction=camera.getWorldDirection(new T.Vector3());
    direction.y=0;direction.normalize();
    const site=player.clone().addScaledVector(direction,1);
    site.y=mechanics.area?-.015:height(site.x,site.z);
    this.lantern.position.copy(site);
    mechanics.scenes[mechanics.area].add(this.lantern);
    this.notice('Signal lantern deployed. Use the lantern control again to recall it.');
  }
  takePhoto(){this.pendingPhoto=true;}
  capture(canvas,area,position){
    if(!this.pendingPhoto)return;
    this.pendingPhoto=false;
    const photo=document.createElement('canvas');
    photo.width=Math.min(384,canvas.width);
    photo.height=Math.round(photo.width*canvas.height/canvas.width);
    const context=photo.getContext('2d');
    if(!context)return this.notice('The camera could not capture a frame.');
    context.drawImage(canvas,0,0,photo.width,photo.height);
    const preview=document.querySelector('#photo-preview');
    preview.src=photo.toDataURL('image/jpeg',.78);
    preview.hidden=false;
    clearTimeout(this.previewTimer);
    this.previewTimer=setTimeout(()=>{preview.hidden=true;},2800);
    const location=area?'Echo Grid':'Foxglove Ridge';
    this.bag.record('field-photo-'+area,'Field photo · '+location,
      'Latest frame logged at '+Math.round(position.x)+', '+Math.round(position.z)+'.');
    this.notice('Photo captured. Location logged in Evidence.');
  }
  toggle(){
    const on=this.light.intensity===0;
    this.light.intensity=on?32:0;
    document.querySelector('#gear-button').setAttribute('aria-pressed',String(on));
    this.notice(on?'Flashlight on.':'Flashlight off.');
  }
}
