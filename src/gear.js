import * as T from 'three';

export class Gear {
  constructor(camera,bag,notice){
    this.notice=notice;
    this.light=new T.SpotLight(0xffe9ba,0,24,.34,.58,1.8);
    this.light.position.set(.13,-.12,0);
    this.light.target.position.set(.13,-.12,-12);
    camera.add(this.light,this.light.target);
    bag.record('flashlight','Field flashlight','Quick slot 1 · tap Light or press L to toggle.','Gear');
  }
  toggle(){
    const on=this.light.intensity===0;
    this.light.intensity=on?32:0;
    document.querySelector('#gear-button').setAttribute('aria-pressed',String(on));
    this.notice(on?'Flashlight on.':'Flashlight off.');
  }
}
