const outcomes={
  'seal-watch':{
    family:'Cal’s sister says, “Leave his name on the missing list. If anyone asks, tell them I chose to close the crossing. I never said I’d stopped looking.”',
    resident:'“At nine I put my hand against the wall. It was quiet for the first time. Write that down. Quiet is all I can swear to.”',
    bulletin:'Foxglove report: The crossing is sealed. Cal remains listed as missing. A copy of the witness accounts is at the post office.'
  },
  'seal-return':{
    family:'Cricket says, “He still draws the bend in the river backward.” Cal’s sister adds, “He’s coming to supper. Give us time to hear the rest from him.”',
    resident:'“He asked about the strip of red tape on the chair. I never told him it was there. The wall stayed quiet after he left.”',
    bulletin:'Foxglove report: A man was brought back before the seal. The family is receiving him privately. The original evacuation records will stay on file.'
  },
  'hold-watch':{
    family:'Cal’s sister unfolds a watch schedule. “Cricket can tend the lamp. I’ll take second watch. Put both names down, but nobody crosses without the ranger’s line.”',
    resident:'“Three knocks after the nine o’clock call. I’ll keep logging them. Send one crew to the bank. Keep the other at the radio.”',
    bulletin:'Foxglove report: The crossing remains open. A two-bank watch is posted. Cal remains missing, and each crossing now requires a check-in from both banks.'
  },
  'hold-return':{
    family:'Cricket unfolds Cal’s map. “He showed me where he saw Mom’s lamp. Leave it there. Somebody else might still be walking toward it.”',
    resident:'“He recognized the chair. Later I heard the same three knocks from the wall. Put those in separate entries. I heard one man and then I heard a sound.”',
    bulletin:'Foxglove report: One survivor returned. Another signal remains unconfirmed. Search crews will log every voice before sending anyone across.'
  }
};

export class CrossingReport {
  constructor(chapters,bag,diner,address,finale){
    Object.assign(this,{chapters,bag,diner,address,finale});
  }
  get version(){
    const {ending}=this.chapters;
    return ending?ending+'-'+(this.bag.records.has('extraction-return')?'return':'watch'):'';
  }
  key(section){return 'crossing-report-'+this.version+'-'+section;}
  has(section){return this.bag.records.has(this.key(section));}
  collect(section){
    const outcome=outcomes[this.version];
    if(!outcome)return '';
    const title=section==='family'?'Cal’s family statement':'The dry-house resident’s statement';
    if(!this.has(section))this.bag.record(this.key(section),title,outcome[section]);
    return outcome[section];
  }
  broadcast(){
    const outcome=outcomes[this.version];
    if(!outcome)return '';
    const frame=this.bag.records.has('projectionist-screening')&&this.finale.choice==='public'?
      ' The dated west-bank frame is attached to the public ledger.':'';
    const correction=this.bag.records.has('sheriff-amended-report')&&this.finale.choice==='public'?
      ' The sheriff’s signed correction is posted beside the original report.':'';
    if(this.has('filed'))return outcome.bulletin+correction+frame;
    if(!this.has('family')||!this.has('resident'))return '';
    this.bag.record(this.key('filed'),'Foxglove crossing report',outcome.bulletin);
    return 'The postmaster reads both accounts back over the radio. '+outcome.bulletin+correction+frame;
  }
  objective(){
    if(!this.version||this.chapters.story.area!==0||this.has('filed'))return null;
    if(this.diner.objective())return null;
    if(!this.has('family')&&this.chapters.family)return {text:'Epilogue · Take the family’s statement at camp',target:this.chapters.family};
    if(!this.has('resident'))return {text:'Epilogue · Ask the dry-house resident what she heard',target:this.address.mailbox};
    if(!this.has('family'))return null;
    return {text:'Epilogue · File both accounts at the post office radio',target:this.finale.bulletin};
  }
}
