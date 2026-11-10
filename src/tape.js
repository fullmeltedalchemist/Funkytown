import {watchAudioFocus} from './audio-focus.js';

const tracks=[
  {label:'Echo recording',cues:[[1.2,'Siren'],[3.4,'Winch'],[6.4,'Voice']]},
  {label:'Dispatch tape',cues:[[3.2,'Siren'],[5.4,'Winch'],[8.4,'Voice']]}
];
const aligned=(offset)=>tracks[0].cues.slice(0,2).every(([time],i)=>Math.abs(time-tracks[1].cues[i][0]-offset)<=.15);

export function openTape(onAligned){
  const panel=document.querySelector('#tape');
  const slider=panel.querySelector('input');
  const readout=panel.querySelector('output');
  const cueList=panel.querySelector('ul');
  const status=panel.querySelector('[role=status]');
  let audio=null,foreground=true;
  function stop(){
    if(audio){audio.close().catch(()=>{});audio=null;}
  }
  const unwatch=watchAudioFocus(visible=>{
    foreground=visible;
    if(visible||!audio)return;
    stop();
    status.textContent='Playback stopped. Tap Play to start both tracks again.';
  });
  function render(){
    const offset=Number(slider.value);
    readout.value=(offset>=0?'+':'')+offset.toFixed(1)+' seconds';
    cueList.replaceChildren();
    for(const [i,track] of tracks.entries()){
      const row=document.createElement('li');
      row.textContent=track.label+' · '+track.cues.map(([time,label])=>label+' '+(time+(i?offset:0)).toFixed(1)+' s').join(' · ');
      cueList.append(row);
    }
  }
  function play(){
    if(!foreground)return;
    stop();
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio){status.textContent='Audio is unavailable. Use the cue timestamps to align the tapes.';return;}
    audio=new Audio();
    audio.resume().catch(()=>{});
    const offset=Number(slider.value),zero=audio.currentTime+.5+Math.max(0,-offset-3.2);
    for(const [i,track] of tracks.entries())for(const [time,label] of track.cues){
      const t=zero+time+(i?offset:0),o=audio.createOscillator(),gain=audio.createGain();
      const panner=audio.createStereoPanner?.();
      if(panner){panner.pan.value=i?.65:-.65;gain.connect(panner);panner.connect(audio.destination);}
      else gain.connect(audio.destination);
      o.connect(gain);
      o.type=label==='Winch'?'triangle':'sine';
      const hz=label==='Siren'?470:label==='Winch'?82:176;
      o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(hz*(label==='Siren'?1.55:.73),t+.29);
      gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.14,t+.035);
      gain.gain.exponentialRampToValueAtTime(.001,t+.38);o.start(t);o.stop(t+.4);
    }
    status.textContent='Playing both tracks. Echo is left, dispatch is right.';
  }
  slider.value='0';status.textContent='Match the siren and winch across both recordings.';
  slider.oninput=()=>{stop();render();};
  panel.querySelector('[data-play]').onclick=play;
  panel.querySelector('[data-align]').onclick=()=>{
    if(!aligned(Number(slider.value))){status.textContent='The cues still land at different times.';return;}
    panel.close();onAligned();
  };
  panel.querySelector('[data-close]').onclick=()=>panel.close();
  panel.onclose=()=>{stop();unwatch();};
  render();
  if(document.pointerLockElement)document.exitPointerLock();
  panel.showModal();
}
