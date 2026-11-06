import * as T from 'three';

function material(color,roughness=.83,metalness=0){
  return new T.MeshStandardMaterial({color,roughness,metalness});
}
function mesh(root,geometry,mat,x,y,z){
  const piece=new T.Mesh(geometry,mat);
  piece.position.set(x,y,z);piece.castShadow=piece.receiveShadow=true;
  root.add(piece);return piece;
}
function paperTexture(letter){
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=640;
  const pen=canvas.getContext('2d');
  pen.fillStyle='#dfc495';pen.fillRect(0,0,512,640);
  for(let i=0;i<2100;i++){
    const x=(i*197.531)%512,y=(i*113.623)%640;
    pen.fillStyle=i%2?'#96764c30':'#fff8d943';pen.fillRect(x,y,1+i%4,2);
  }
  pen.strokeStyle='#af8e5b';pen.lineWidth=3;
  pen.strokeRect(12,12,488,616);
  pen.fillStyle='#463c31';
  pen.font=letter?'italic 43px Georgia':'bold 42px Georgia';
  pen.fillText(letter?'My dear,':'FIELD JOURNAL',46,80);
  const lines=letter?['I left the porch light on.','If you follow the creek,','keep to the old ford.','The arch remembers','the night I crossed.','','Love, Mom']:['BELLWETHER SURVEY','Vale House / Foxglove','The old ford is passable.','Signal repeats near camp.','The door heard my voice.','Then it answered twice.'];
  pen.font='italic 32px Georgia';
  lines.forEach((line,i)=>pen.fillText(line,46,151+i*58));
  if(letter){
    pen.strokeStyle='#967d5366';
    for(const y of [209,420]){pen.beginPath();pen.moveTo(0,y);pen.lineTo(512,y);pen.stroke();}
  }
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  return tex;
}
export function documentProp(letter){
  const root=new T.Group();
  const paper=new T.MeshStandardMaterial({map:paperTexture(letter),roughness:.95,side:T.DoubleSide});
  if(letter){
    const envelope=mesh(root,new T.BoxGeometry(.26,.009,.175),material(0xaa8763),.105,.008,.01);
    envelope.rotation.y=-.3;
    mesh(root,new T.CylinderGeometry(.024,.025,.006,12),material(0x7e3733),.171,.017,.043);
    const sheet=mesh(root,new T.PlaneGeometry(.25,.33,1,3),paper,-.053,.024,.012);
    const vertices=sheet.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++)vertices.setZ(i,Math.abs(vertices.getY(i))*.075);
    sheet.geometry.computeVertexNormals();
    sheet.rotation.set(-Math.PI/2,0,.12);
  }else{
    const cover=material(0x514238),leaves=material(0xb39b70);
    mesh(root,new T.BoxGeometry(.32,.023,.335),cover,0,.012,0);
    mesh(root,new T.BoxGeometry(.29,.034,.305),leaves,0,.039,0);
    const page=mesh(root,new T.PlaneGeometry(.285,.3),paper,0,.057,0);
    page.rotation.x=-Math.PI/2;
    mesh(root,new T.BoxGeometry(.023,.066,.34),cover,-.153,.029,0);
    for(let i=0;i<4;i++)mesh(root,new T.BoxGeometry(.276,.001,.002),cover,.006,.028+i*.006,.153);
  }
  return root;
}
export function campLantern(){
  const root=new T.Group(),metal=material(0x343934,.51,.44);
  for(const y of [-.13,.12])mesh(root,new T.CylinderGeometry(.105,.115,.045,18),metal,0,y,0);
  const glass=new T.MeshStandardMaterial({color:0xe5c483,roughness:.34,emissive:0x4a2911});
  mesh(root,new T.CylinderGeometry(.072,.083,.198,16),glass,0,-.006,0);
  for(let i=0;i<4;i++){
    const angle=Math.PI*.5*i;
    mesh(root,new T.CylinderGeometry(.008,.008,.237,8),metal,Math.cos(angle)*.092,0,Math.sin(angle)*.092);
  }
  mesh(root,new T.TorusGeometry(.071,.008,8,16,Math.PI),metal,0,.14,0);
  return root;
}
