// Draw the recorded clues as film frames, including the damage the player must identify.
export function evidenceFrame(canvas,kind,frame){
  const pen=canvas.getContext('2d');
  const w=480,h=218;
  canvas.width=w;canvas.height=h;
  const night=kind!=='reel';
  const rect=(x,y,width,height,color)=>{pen.fillStyle=color;pen.fillRect(x,y,width,height);};
  const ellipse=(x,y,rx,ry,color)=>{
    pen.beginPath();pen.ellipse(x,y,rx,ry,0,0,Math.PI*2);pen.fillStyle=color;pen.fill();
  };
  const shape=(points,color)=>{
    pen.beginPath();points.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));
    pen.closePath();pen.fillStyle=color;pen.fill();
  };
  const sky=pen.createLinearGradient(0,10,0,185);
  sky.addColorStop(0,night?'#101c28':'#675345');sky.addColorStop(1,night?'#32454a':'#c7a36b');
  rect(0,0,w,h,sky);
  ellipse(362,50,24,24,night?'#b7d6d1':'#e6c89b');
  for(let i=0;i<24;i++){
    const x=i*24-20,y=36+(i*91)%85;
    shape([[x-22,151],[x,y],[x+22,151]],night?'#1d3033':'#514a38');
  }
  shape([[0,127],[153,155],[305,136],[480,145],[480,218],[0,218]],night?'#243536':'#6c6349');
  shape([[0,160],[215,151],[338,164],[480,153],[480,180],[325,174],[165,184],[0,175]],night?'#50636c':'#a59673');
  if(kind==='reel'&&[1,2,3].includes(frame)){
    rect(214,48,14,139,'#59432f');rect(188,76,89,9,'#6c533a');
    for(const x of frame===3?[194,263]:[253]){
      rect(x-2,82,4,22,'#312721');
      shape([[x-6,101],[x+6,101],[x+11,121],[x-11,121]],'#b28c55');
      ellipse(x,121,11,3,'#675137');
    }
  }
  if(kind==='reel'&&frame===5){
    for(const x of [117,158,199,240,281])rect(x,88,8,103,'#45362d');
    for(const y of [105,139,165])rect(112,y,180,6,'#574333');
    ellipse(317,93,13,15,'#6d5440');ellipse(317,85,21,5,'#312b24');
    shape([[306,108],[328,108],[342,167],[301,167]],'#45453a');
    shape([[309,112],[280,132],[285,138],[321,125]],'#45453a');
  }
  if(kind==='thief'){
    rect(174,141,129,45,'#5f4a37');rect(174,149,129,3,'#a38057');
    const x=frame===0?134:frame===1?233:339;
    ellipse(x,151,31,13,'#777d79');ellipse(x+24,146,14,11,'#a2a39a');
    ellipse(x+26,146,13,5,'#32383c');ellipse(x+31,139,4,5,'#a2a39a');
    for(let i=0;i<5;i++)ellipse(x-32-i*6,153-i*2,8,5,i%2?'#363e40':'#838c87');
  }
  if(kind==='echo'&&frame===1){
    pen.globalAlpha=.66;
    ellipse(331,102,11,13,'#b6d1cc');
    shape([[319,114],[342,115],[350,163],[313,165]],'#b6d1cc');
    pen.globalAlpha=1;
  }
  for(let i=0;i<900;i++){
    const color=i%2?'#00000018':'#fff6d521';
    rect((i*137)%w,(i*53)%h,1+(i%3===0),1,color);
  }
  rect(0,0,20,h,'#221d18');rect(w-20,0,20,h,'#221d18');
  for(const x of [5,w-15])for(let y=8;y<h;y+=24){
    if(kind==='reel'&&frame===2&&x===5&&y>45&&y<160)continue;
    rect(x,y,10,12,'#b6a17e');
  }
  if(kind==='reel'&&frame===2){
    for(let i=0;i<5;i++)shape([[58+i*53,0],[62+i*53,0],[183+i*48,h],[177+i*48,h]],'#e8d8ac');
  }
  if(kind==='reel'&&frame===4){
    rect(20,0,w-40,h,'#d1b985');
    pen.save();pen.translate(w,0);pen.scale(-1,1);
    pen.fillStyle='#403222';pen.font='bold 75px monospace';pen.fillText('05',190,130);
    pen.restore();
  }
  pen.fillStyle=night?'#c4d8cf':'#f0d59b';pen.font='13px monospace';
  pen.fillText(kind==='reel'?'WEST BANK • 11/06':'FIELD CAMERA • '+kind.toUpperCase(),32,200);
  pen.fillText(String(frame+1).padStart(2,'0'),411,200);
}
