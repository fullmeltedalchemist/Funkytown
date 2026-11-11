import {diner,height} from './terrain.js';
import {person} from './rescue.js';
import * as T from 'three';
import {part} from './mechanics.js';

export class Diner {
  constructor(mechanics,chapters,bag,pipeline,models){
    Object.assign(this,{chapters,bag});
    const {x,z}=diner;
    const floor=diner.y+.15;
    const box=(size,dx,y,dz,color)=>mechanics.staticBox(size,[x+dx,floor+y,z+dz],color);
    const cream=0xe3cfab, red=0x944936, wood=0x5f4334;
    box([6.6,.24,5.8],0,-.12,0,wood);
    const apron=height(x,z+3.15);
    const stepHeight=floor-apron;
    if(stepHeight>.06){
      box([2.2,stepHeight*.55,.65],0,-stepHeight*.725,3.15,wood);
    }
    box([6.6,2.75,.19],0,1.375,-2.81,cream);
    for(const side of [-1,1]){
      box([.19,2.75,5.6],side*3.2,1.375,0,cream);
      box([2.35,1.08,.19],side*2.12,.54,2.81,red);
      box([.25,1.67,.19],side*1.07,1.915,2.81,cream);
      box([1.3,.15,1.7],side*2.08,.75,.45,wood);
      for(const dz of [-.63,.63]){
        box([.11,.675,.11],side*2.08,.3375,.45+dz,wood);
      }
      box([1.3,.45,.46],side*2.08,.225,-.73,red);
      box([1.3,.45,.46],side*2.08,.225,1.63,red);
    }
    box([6.85,.22,6.3],0,2.86,0,red);
    box([6.55,.52,.2],0,2.49,2.81,cream);
    box([3.8,.96,.68],0,.48,-1.94,red);
    const counter=box([3.95,.1,.8],0,1.01,-1.94,cream);
    const radio=pipeline.prepare(models.receiver,{scale:.69,position:[x+.82,floor+1.06,z-1.95],groundY:floor+1.06});
    const owner=person(0x806347).root;
    owner.position.set(x-.65,floor,z-2.46);
    const scene=mechanics.scenes[0];
    scene.add(radio,owner);
    const tiles=new T.InstancedMesh(new T.BoxGeometry(.395,.008,.395),
      new T.MeshStandardMaterial({roughness:.81}),16*14);
    const tile=new T.Matrix4();
    for(let row=0;row<14;row++)for(let col=0;col<16;col++){
      const i=row*16+col;
      tiles.setMatrixAt(i,tile.makeTranslation(x+(col-7.5)*.4,floor+.004,z+(row-6.5)*.4));
      tiles.setColorAt(i,new T.Color((row+col)%2?0xc9b997:0x706c60));
    }
    tiles.receiveShadow=true;
    scene.add(tiles);
    const mugs=new T.CylinderGeometry(.073,.056,.11,12);
    const ceramic=new T.MeshStandardMaterial({color:0xc7dbd0,roughness:.42});
    for(const [dx,y,dz] of [[-2.3,.88,.1],[-1.89,.88,.75],[.33,1.06,-1.83],[-.17,1.06,-1.91]]){
      const mug=new T.Mesh(mugs,ceramic);
      mug.position.set(x+dx,floor+y+.055,z+dz);
      scene.add(mug);
    }
    for(const shelfY of [1.33,1.75]){
      part(scene,[2.8,.07,.25],[x,floor+shelfY,z-2.56],wood,.015);
      for(const dx of [-1.17,-.71,-.25,.21,.67,1.13]){
        const cup=new T.Mesh(mugs,ceramic);
        cup.position.set(x+dx,floor+shelfY+.09,z-2.55);
        scene.add(cup);
      }
    }
    mechanics.tag(counter.collider,{
      name:'Talk to June at the diner counter',
      action:()=>this.counterStory(),
      acceptName:'Show June the mill time slip',
      accept:item=>{
        if(!item.millSlip)return 'June sets a hand on the counter. “I can read the mill’s time slip if you bring it by.”';
        mechanics.remove(item);
        bag.record('mill-slip-identified','June identified the mill time slip',
          'The alarm time was stamped after Cal’s coffee was marked paid. June’s ledger counted a prepaid pot. Inez’s far-bank account still stands.');
        return 'June runs a finger over the stamp. “I wrote PAID when he left money for the whole shift. That entry tells us when he paid, not when he got home.”';
      }
    });
    const booth=box([1.26,.055,.86],-2.08,.85,.45,0xe5ba7d);
    const serving=box([.42,.042,.29],.8,1.08,-1.77,0x75867c);
    mechanics.tag(serving.collider,{name:'Share a hot plate with June',action:()=>{
      if(bag.records.has('diner-hot-plate'))return 'June has already taken a plate to the relief crew.';
      if(!bag.records.has('camp-meal'))return 'Bring a meal from the camp skillet to share with the relief crew.';
      bag.forget('camp-meal');
      bag.record('diner-hot-plate','A plate for the relief crew',
        'June took your hot plate to the crew and put your name next to Cal’s on her kitchen chalkboard.','Keepsakes');
      return 'June sets a lid over the plate. “Cal used to leave a second one for the late shift. They’ll be glad you remembered.”';
    }});
    this.booth=booth.visual.position;
    mechanics.tag(booth.collider,{name:'Check Cal’s booth at the diner',action:()=>this.boothStory()});
  }

  counterStory(){
    if(!this.chapters.ending){
      if(this.bag.records.has('extraction-return'))return 'June sets out two cups. “He remembered how I used to burn the first pot. If he wants to tell us more, we can listen over coffee.”';
      if(this.bag.records.has('mill-slip-identified'))return 'June folds the slip into her ledger. “Inez and I were both telling the truth. I just remembered the wrong part of the night.”';
      if(this.bag.records.has('founders-original-tape')){
        this.bag.record('diner-night-shift','June’s coffee ledger',
          'June served the man who came back after the evacuation. He ordered his coffee exactly the way Cal did. She cannot say which man was speaking from the far bank.');
        return 'June opens the old coffee ledger. “The man who came back ordered Cal’s coffee exactly right. Same cracked cup, same spoon. Hearing two voices on that tape changes what I thought I knew.”';
      }
      return 'June checks the radio by the till. “I ran the night shift when the creek came up. Cal said to leave the lights on so the rescue crew could see us. He never asked me to put his coffee on the tab. I did anyway.”';
    }
    if(this.chapters.ending==='seal')return 'The radio gives the regular weather report. “First night in years it hasn’t called out a second temperature. I can hear the fridge again.”';
    return 'June turns down the radio. “The ranger calls a roll every hour. We write the replies on paper so the next shift knows who’s still out there.”';
  }

  boothStory(){
    const ending=this.chapters.ending;
    if(!ending)return 'Two initials are scratched into the table. Cal used to sit here after the night shift and draw the crossing on a napkin for Cricket.';
    const returned=this.bag.records.has('extraction-return');
    const message=ending==='seal'?
      returned?'Cricket left a note beside two empty mugs. “He showed me how he drew the crossing. Same little bend by the mill. We’re coming back Saturday.”':
        'Cal’s sister left his mug upside down. Her note thanks the crew and asks that Cal’s name stay on the evacuation ledger.':
      returned?'Cal’s crossing sketch is pinned to the booth. Cricket marked the lights that got him home. The ranger added a call sign for the next search.':
        'The booth holds a thermos and a fresh search roster. Cricket has penciled Cal’s name at the top, right beside the time of the next radio check.';
    this.bag.record(returned?'diner-return':'diner-watch','Cal’s diner booth',message,'Keepsakes');
    return message;
  }

  objective(){
    if(!this.chapters.ending||this.chapters.story.area!==0)return null;
    const key=this.bag.records.has('extraction-return')?'diner-return':'diner-watch';
    if(this.bag.records.has(key))return null;
    return {text:'Epilogue · Check Cal’s booth at the diner',target:this.booth};
  }
}
