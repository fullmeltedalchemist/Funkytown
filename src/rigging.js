const routes={
  low:{start:2.4,end:2.1,sag:1.25},
  high:{start:4.1,end:3.8,sag:.76}
};
export class RiggingRun {
  route='low';
  travel=0;
  slack=.9;
  result='';
  sample(){
    const t=this.travel/100, route=routes[this.route];
    const clearance=route.start+(route.end-route.start)*t-route.sag*Math.sin(Math.PI*t)-this.slack;
    const rock=.45+1.18*Math.exp(-((t-.52)**2)/.024);
    return {clearance,rock,tension:(1.4-this.slack)*56+(this.route==='high'?12:0)};
  }
  haul(){
    if(this.result)return this.result;
    this.travel=Math.min(100,this.travel+5);
    const {clearance,rock,tension}=this.sample();
    if(tension>79)this.result='The line overloaded. Reset and pay out more slack.';
    else if(clearance<=rock)this.result='The dummy struck the rocks. Reset and try the higher anchor or reel in some slack.';
    else if(this.travel===100)this.result='complete';
    return this.result;
  }
  reset(){this.travel=0;this.slack=.9;this.result='';}
}

export function openRigging(onComplete){
  const run=new RiggingRun();
  const panel=document.querySelector('#rigging');
  const anchor=panel.querySelector('select'), slack=panel.querySelector('input');
  const status=panel.querySelector('[role=status]');
  const haul=panel.querySelector('[data-haul]');
  function render(){
    const sample=run.sample();
    const x=30+run.travel*2.9;
    const y=152-sample.clearance*28;
    panel.querySelector('circle').setAttribute('cx',x);
    panel.querySelector('circle').setAttribute('cy',y);
    panel.querySelector('line').setAttribute('x2',x);
    panel.querySelector('line').setAttribute('y2',y);
    panel.querySelector('output').textContent=run.travel+'% across · '+sample.clearance.toFixed(1)+' m clearance · '+Math.round(sample.tension)+'% tension';
    anchor.disabled=run.travel>0;
    haul.disabled=!!run.result;
  }
  anchor.value=run.route;slack.value=run.slack;
  anchor.onchange=()=>{run.route=anchor.value;render();};
  slack.oninput=()=>{run.slack=Number(slack.value);render();};
  haul.onclick=()=>{
    const outcome=run.haul();
    if(outcome==='complete'){panel.close();onComplete();return;}
    status.textContent=outcome||'Haul steadily. Adjust slack as the dummy approaches the rocks.';
    render();
  };
  panel.querySelector('[data-reset]').onclick=()=>{
    run.reset();slack.value=run.slack;status.textContent='Dummy returned to the bank.';render();
  };
  panel.querySelector('[data-close]').onclick=()=>panel.close();
  status.textContent='Choose an anchor before hauling. Keep the dummy above the rocks without overloading the line.';
  render();
  if(document.pointerLockElement)document.exitPointerLock();
  panel.showModal();
}
