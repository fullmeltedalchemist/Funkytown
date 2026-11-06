export class Input {
  held=new Set();
  stick=[0,0];
  look=[0,0];
  active=false;
  jump=false;
  actions=new Set();
  touch=matchMedia('(pointer:coarse)').matches;
  dragMode=false;
  constructor(canvas,onUse,onBag,onGear,onPhoto){
    this.canvas=canvas;
    const menu=document.querySelector('#menu'),pad=document.querySelector('#pad');
    const clear=()=>{
      this.held.clear();this.actions.clear();this.stick=[0,0];this.look=[0,0];this.jump=false;
      pad.firstElementChild.style.transform='';
    };
    this.toggle=(active)=>{
      this.active=active;menu.hidden=active;
      document.querySelector('#touch').hidden=!active||!this.touch;
      if(!active)clear();
    };
    const start=document.querySelector('#start');
    start.onclick=async()=>{
      if(this.touch||this.dragMode)return this.toggle(true);
      try{await canvas.requestPointerLock();}
      catch{this.dragMode=true;this.toggle(true);}
    };
    document.querySelector('#touch-mode').onclick=()=>{
      this.touch=true;this.dragMode=true;this.toggle(true);
    };
    document.addEventListener('pointerlockchange',()=>{
      if(!this.touch&&!this.dragMode)this.toggle(document.pointerLockElement===canvas);
    });
    document.addEventListener('pointerlockerror',()=>{this.dragMode=true;this.toggle(true);});
    document.addEventListener('keydown',e=>{
      if(!this.active||document.querySelector('#tape').open||document.querySelector('#rigging').open)return;
      if(e.code==='Escape'&&(this.touch||this.dragMode))return this.toggle(false);
      if(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','KeyE','KeyQ','KeyF','KeyG'].includes(e.code))e.preventDefault();
      this.held.add(e.code);
      if(e.repeat)return;
      if(e.code==='Space')this.jump=true;
      if(e.code==='KeyE')onUse();
      if(e.code==='KeyB')onBag();
      if(e.code==='KeyL'||e.code==='Digit1')onGear();
      if(e.code==='KeyC'||e.code==='Digit2')onPhoto();
      if(e.code==='KeyF')this.actions.add('fire');
      if(e.code==='KeyG')this.actions.add('grapple');
      if(e.code==='KeyQ')this.actions.add('throw');
    });
    document.addEventListener('keyup',e=>this.held.delete(e.code));
    document.addEventListener('mousemove',e=>{
      if(document.pointerLockElement!==canvas)return;
      this.look[0]+=e.movementX;this.look[1]+=e.movementY;
    });
    window.addEventListener('blur',()=>{
      if(document.pointerLockElement===canvas)document.exitPointerLock();
      this.toggle(false);
    });
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{
      if(document.pointerLockElement!==canvas)return;
      if(e.button===0)this.actions.add('fire');
      if(e.button===2)this.actions.add('grapple');
    });
    for(const action of ['fire','grapple','throw']){
      document.querySelector('#'+action).addEventListener('pointerdown',e=>{
        e.preventDefault();this.actions.add(action);
      });
    }
    let drag=null;
    canvas.addEventListener('pointerdown',e=>{
      if(!this.active||(!this.touch&&!this.dragMode)||drag)return;
      canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};
    });
    canvas.addEventListener('pointermove',e=>{
      if(!this.active||drag?.id!==e.pointerId)return;
      this.look[0]+=e.clientX-drag.x;this.look[1]+=e.clientY-drag.y;
      drag.x=e.clientX;drag.y=e.clientY;
    });
    canvas.addEventListener('lostpointercapture',()=>{drag=null;});
    let pointer=null;
    const move=e=>{
      const rect=pad.getBoundingClientRect();
      const x=(e.clientX-rect.left-rect.width/2)/36,z=(e.clientY-rect.top-rect.height/2)/36;
      const length=Math.hypot(x,z);
      const factor=length<.12?0:1/Math.max(1,length);
      this.stick=[x*factor,-z*factor];
      pad.firstElementChild.style.transform=`translate(${this.stick[0]*34}px,${-this.stick[1]*34}px)`;
    };
    pad.addEventListener('pointerdown',e=>{
      if(pointer!==null)return;
      pointer=e.pointerId;pad.setPointerCapture(pointer);move(e);
    });
    pad.addEventListener('pointermove',e=>{if(this.active&&e.pointerId===pointer)move(e);});
    pad.addEventListener('lostpointercapture',()=>{
      pointer=null;this.stick=[0,0];pad.firstElementChild.style.transform='';
    });
    const jumpButton=document.querySelector('#jump');
    jumpButton.addEventListener('pointerdown',e=>{
      e.preventDefault();jumpButton.setPointerCapture(e.pointerId);this.jump=true;this.held.add('Space');
    });
    jumpButton.addEventListener('lostpointercapture',()=>this.held.delete('Space'));
    document.querySelector('#use').addEventListener('pointerdown',onUse);
    document.querySelector('#bag-button').onclick=onBag;
    document.querySelector('#gear-button').onclick=onGear;
    document.querySelector('#photo-button').onclick=onPhoto;
    document.querySelector('#pause').onclick=()=>this.toggle(false);
  }
  movement(){
    const jump=this.jump;this.jump=false;
    return {x:this.stick[0]+Number(this.held.has('KeyD'))-Number(this.held.has('KeyA')),
      z:this.stick[1]+Number(this.held.has('KeyW'))-Number(this.held.has('KeyS')),
      sprint:this.held.has('ShiftLeft'),drift:this.held.has('Space'),jump};
  }
}
