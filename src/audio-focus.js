// Visibility covers tab switches and phone lock. Page events also cover navigation and bfcache.
export function watchAudioFocus(change,page=document,host=window){
  let showing=true,focused=true,foreground;
  const sync=()=>{
    const next=showing&&focused&&!page.hidden;
    if(next!==foreground){foreground=next;change(next);}
  };
  const listen=(target,name,action)=>{
    const listener=()=>{action?.();sync();};
    target.addEventListener(name,listener);
    return ()=>target.removeEventListener(name,listener);
  };
  const cleanup=[
    listen(page,'visibilitychange',()=>{if(!page.hidden)focused=true;}),
    listen(page,'freeze',()=>{showing=false;}),
    listen(page,'resume',()=>{showing=true;}),
    listen(host,'pagehide',()=>{showing=false;}),
    listen(host,'pageshow',()=>{showing=focused=true;}),
    listen(host,'blur',()=>{focused=false;}),
    listen(host,'focus',()=>{focused=true;})
  ];
  sync();
  return ()=>cleanup.forEach(remove=>remove());
}
