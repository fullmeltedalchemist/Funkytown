import {cabinX,cabinZ} from './terrain.js';
import {groundPoint,station} from './field-stations.js';

const trackingKey='bellwether-distress-tracking-v1';
const call='distress-dispatch', shifted='distress-shifted';
const quiet='distress-silent-relay', live='distress-live-relay', filed='distress-resolved';

export class DistressCall {
  constructor(mechanics,pipeline,model,bag,diner,ready,sound){
    Object.assign(this,{mechanics,bag,diner,ready,sound});
    this.tracked=bag.records.has(call)&&!bag.records.has(filed);
    try{if(localStorage.getItem(trackingKey)==='off')this.tracked=false;}catch{}
    const addRadio=(base,name,action,contact)=>{
      const radio=station(mechanics,0,base,name,action,{color:0x536f63});
      radio.body.add(pipeline.prepare(model,{position:[0,.945,0],groundY:.945,scale:.57}));
      if(contact)mechanics.fixed.get(radio.collider.handle).contact=contact;
      return radio.point;
    };
    this.dispatch=addRadio(groundPoint(cabinX-3.4,cabinZ+5.8),'Answer the moving distress call',()=>this.answer());
    this.west=addRadio(groundPoint(-13.8,-12.2),'Answer the west-bank relay',()=>this.answerWest(),
      ()=>this.sample(false));
    this.east=addRadio(groundPoint(4.6,-11.8),'Check the old survey relay',()=>this.answerEast(),
      ()=>this.sample(true));
    diner.distressWitness=()=>this.compare();
  }

  setTracking(tracked){
    this.tracked=tracked;
    try{localStorage.setItem(trackingKey,tracked?'on':'off');}catch{}
  }

  answer(){
    const {records}=this.bag;
    if(!this.ready())return 'The emergency band is quiet. Finish reconstructing the ford rescue first.';
    if(records.has(filed))return 'June has logged the genuine call. Only the survey relay gets a reply now.';
    if(records.has(call)){
      this.setTracking(!this.tracked);
      return this.tracked?'Distress call tracked again. Follow the bearing.':'Distress call untracked. Answer here again to resume.';
    }
    this.setTracking(true);
    this.bag.record(call,'Distress call on the west bank','A caller asks for a lamp at the west-bank relay. Check the marked location.');
    this.sound(this.dispatch);
    return '“West-bank relay. Bring a light.” You mark the bearing. Follow it before answering again.';
  }

  answerWest(){
    const {records}=this.bag;
    if(!records.has(call))return 'The west-bank relay is quiet. The dispatch radio at camp monitors this frequency.';
    if(records.has(filed))return 'June logged this station as a false relay.';
    if(!records.has(shifted)){
      this.bag.record(shifted,'The distress call changed banks',
        'When you answered on the west bank, the same caller immediately named the east survey relay.');
      this.sound(this.east);
      return '“No. East survey relay. Bring a light.” The voice changed banks mid-sentence. Use Mic on this case before moving on.';
    }
    return 'The voice sounded close, but the case is still. Use Mic to check whether it actually transmitted.';
  }

  answerEast(){
    if(!this.bag.records.has(shifted))return 'The old survey relay is waiting on a call.';
    if(this.bag.records.has(filed))return 'This is the relay June logged. The signal is steady now.';
    this.sound(this.east);
    return 'A loose spring taps against the case. Use Mic here and on the west relay, then ask June who was on shift.';
  }

  sample(east){
    const {records}=this.bag;
    if(!records.has(shifted))return {strength:0,message:'No active call to compare. Answer at camp, then check the west bank.'};
    const id=east?live:quiet;
    const message=east?'Two pulses and a spring rattle travel through the survey relay case.':
      'The west-bank case is silent. The voice came from somewhere else.';
    if(!records.has(id))this.bag.record(id,east?'Live survey relay sample':'Silent west-bank sample',message);
    return {strength:east?.74:0,message};
  }

  compare(){
    const {records}=this.bag;
    if(records.has(filed))return '';
    if(!records.has(quiet)||!records.has(live))return '';
    this.bag.record(filed,'The call that crossed the creek',
      'June recognized the survey relay’s two-pulse signal and loose spring. The west-bank voice had no transmitter. The real caller was the lamp crew on the east bank.');
    this.setTracking(false);
    return 'June taps the counter twice. “The survey relay had a broken spring. That rattle is real. The west-bank voice was a copy. I’ll tell dispatch to answer the lamp crew.”';
  }

  objective(){
    const {records}=this.bag;
    if(this.mechanics.area!==0||!this.tracked||records.has(filed))return null;
    if(!records.has(shifted))return {text:'Optional · Answer the west-bank relay',target:this.west};
    if(!records.has(quiet))return {text:'Optional · Use Mic on the west-bank relay case',target:this.west};
    if(!records.has(live))return {text:'Optional · Use Mic on the east survey relay',target:this.east};
    return {text:'Optional · Compare both samples with June',target:this.diner.counterPoint};
  }
}
