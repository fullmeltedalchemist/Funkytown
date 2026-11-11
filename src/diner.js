import {diner,height} from './terrain.js';
import {person} from './rescue.js';

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
    mechanics.scenes[0].add(radio,owner);
    mechanics.tag(counter.collider,{name:'Talk to June at the diner counter',action:()=>this.counterStory()});
    const booth=box([1.26,.055,.86],-2.08,.85,.45,0xe5ba7d);
    this.booth=booth.visual.position;
    mechanics.tag(booth.collider,{name:'Check Cal’s booth at the diner',action:()=>this.boothStory()});
  }

  counterStory(){
    if(!this.chapters.ending){
      if(this.bag.records.has('extraction-return'))return 'June sets out two cups. “He remembered how I used to burn the first pot. If he wants to tell us more, we can listen over coffee.”';
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
