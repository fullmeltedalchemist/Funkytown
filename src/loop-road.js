import * as T from 'three';
import {groundPoint,station} from './field-stations.js';
import {height,trailDistance,trailX} from './terrain.js';
import {part,vec} from './mechanics.js';

const start=-16.7,turn=-24.5;
const recordKey='road-that-loops';

export class LoopRoad {
  constructor(mechanics,story,bag,notice){
    Object.assign(this,{mechanics,story,bag,notice});
    const base=groundPoint(trailX(start)+2.3,start);
    const post=station(mechanics,0,base,'Inspect the repeated mile marker',()=>this.usePost(),{color:0xb69d62});
    this.point=post.point;
    const plate=part(post.body,[.39,.29,.045],[0,1.14,.04],0x695b44,.018);
    for(const x of [-.085,.085]){
      part(plate,[.082,.017,.01],[x,.065,.027],0xd8ba78,.003);
      part(plate,[.018,.117,.01],[x+.009,.009,.028],0xd8ba78,.003).rotation.z=-.38;
    }
    this.chalk=part(plate,[.128,.024,.018],[0,-.065,.029],0xf5e8c0,.003);
    this.chalk.rotation.z=.52;
    this.chalk.visible=bag.records.has(recordKey);
    this.bypass=groundPoint(trailX(turn)+5.4,turn);
    this.trigger=groundPoint(trailX(turn),turn);
    this.exitFlag=part(mechanics.scenes[0],[.21,1.05,.15],this.bypass.clone().add(new T.Vector3(0,.53,0)).toArray(),0x986644,.015);
    this.exitFlag.visible=false;
  }
  usePost(){
    if(this.bag.records.has(recordKey))return 'The chalk slash is still there. The road now leads past the marker.';
    if(this.story.state<4)return 'Mile marker seven. Someone scratched the same number twice.';
    if(!this.run){
      this.run={laps:0,time:110,compared:false};
      this.chalk.visible=true;
      return 'You chalk a slash across the seven. Drive the wagon south past the next bend and watch the mileposts.';
    }
    if(!this.run.laps)return 'Your chalk is still fresh. Drive south and see if this marker turns up again.';
    this.run.compared=true;
    this.exitFlag.visible=true;
    return 'Your slash crosses both sevens exactly. The road folded back to this post. Follow the old verge east of the bend to break the loop.';
  }
  finish(){
    this.run=null;
    this.exitFlag.visible=false;
    this.bag.record(recordKey,'The Road That Loops',
      'The same chalked mile marker appeared after the bend. The eastern verge broke the loop.');
    this.notice('The road stays put this time. You record where it folded.');
  }
  tick(dt){
    const run=this.run;
    const m=this.mechanics;
    if(!run||m.area!==0)return;
    const player=m.driving?vec(m.car.body.translation()):m.walker.current;
    run.time-=dt;
    if(run.time<=0||player.distanceTo(this.point)>45){
      this.run=null;this.chalk.visible=false;this.exitFlag.visible=false;
      this.notice('The chalk fades. You can retry at the mile marker.');
      return;
    }
    if(!m.driving)return;
    if(run.compared&&Math.hypot(player.x-this.bypass.x,player.z-this.bypass.z)<2.1){
      this.finish();
      return;
    }
    if(player.z>turn||player.z<turn-1.3||trailDistance(player.x,player.z)>2)return;
    const car=m.car.body;
    if(car.linvel().z>-.45)return;
    const z=start+.85,x=trailX(z);
    car.setTranslation({x,y:height(x,z)+.74,z},true);
    car.setLinvel({x:0,y:0,z:0},true);
    car.setAngvel({x:0,y:0,z:0},true);
    car.setRotation({x:0,y:0,z:0,w:1},true);
    run.laps++;
    this.notice('You pass mile seven again. Your chalk slash is still on the post.');
  }
  objective(){
    if(!this.run||this.mechanics.area!==0)return null;
    if(this.run.compared)return {text:'The Road That Loops · Drive along the eastern verge',target:this.bypass};
    if(this.run.laps)return {text:'The Road That Loops · Compare the chalk slash',target:this.point};
    return {text:'The Road That Loops · Drive south past the bend',target:this.trigger};
  }
}
