type Point = { x: number; y: number };
type Stop = Point & { time: number };
type Snapshot = { source: HTMLElement; rect: DOMRect; style: CSSStyleDeclaration };
type Job = { start: number; duration: number; badge: HTMLElement; rect: DOMRect; drawing: boolean; linear: boolean };
const TOTAL = 10300;
const AGENTS = 14;
const PANEL_START = 1420, PANEL_DRAW = 1160;
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));

function pathAt(stops: Stop[], time: number): Point {
  let index = 0;
  while (index < stops.length - 2 && time > stops[index + 1].time) index++;
  const a = stops[index], b = stops[index + 1];
  const before = stops[Math.max(0, index - 1)], after = stops[Math.min(stops.length - 1, index + 2)];
  const duration = b.time - a.time, t = clamp((time - a.time) / duration), t2 = t*t, t3 = t2*t;
  const tangent = (start: Stop, end: Stop, axis: 'x'|'y') => (end[axis]-start[axis])/Math.max(1,end.time-start.time)*duration;
  const axis = (key: 'x'|'y') => (2*t3-3*t2+1)*a[key]+(t3-2*t2+t)*tangent(before,b,key)+(-2*t3+3*t2)*b[key]+(t3-t2)*tangent(a,after,key);
  return {x:axis('x'),y:axis('y')};
}

function bezier(t: number, points: number[]): number {
  const [x1,y1,x2,y2] = points;
  const curve = (v: number,a: number,b: number) => 3*(1-v)*(1-v)*v*a+3*(1-v)*v*v*b+v*v*v;
  let low=0,high=1;
  for(let i=0;i<12;i++){const middle=(low+high)/2;if(curve(middle,x1,x2)<t)low=middle;else high=middle;}
  return curve((low+high)/2,y1,y2);
}

function cloneLayer({source,rect}: Snapshot): HTMLElement {
  const clone=source.cloneNode(true) as HTMLElement;
  [clone,...clone.querySelectorAll<HTMLElement>('*')].forEach(node=>{
    ['id','autofocus','href','name'].forEach(attribute=>node.removeAttribute(attribute));
    if(node.matches('a,button,input,select,textarea,[tabindex]'))node.tabIndex=-1;
  });
  Object.assign(clone.style,{position:'absolute',left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`,minHeight:'0',maxWidth:'none',margin:'0',pointerEvents:'none'});
  return clone;
}

function advances(source: HTMLElement): number[] {
  const walker=document.createTreeWalker(source,NodeFilter.SHOW_TEXT), range=document.createRange();
  const left=source.getBoundingClientRect().left, result=[0];
  let node:Node|null;
  while((node=walker.nextNode())){
    if(node.parentElement?.closest('[aria-hidden="true"]'))continue;
    let offset=0;
    for(const letter of node.textContent??''){
      offset+=letter.length;range.setStart(node,0);range.setEnd(node,offset);
      const rect=range.getBoundingClientRect();
      if(letter.trim())result.push(Math.max(0,rect.right-left));
    }
  }
  return result;
}

export function initSwarmIntro(){
  const overlay=document.querySelector<HTMLElement>('#swarm-intro');
  const scene=document.querySelector<HTMLElement>('#swarm-scene');
  const skip=document.querySelector<HTMLButtonElement>('#skip-intro');
  const replay=document.querySelector<HTMLButtonElement>('#replay-intro');
  const pause=document.querySelector<HTMLButtonElement>('#pause-intro');
  const speed=document.querySelector<HTMLButtonElement>('#speed-intro');
  const status=document.querySelector<HTMLElement>('#intro-status');
  const layers=document.querySelector<HTMLElement>('#intro-layers');
  const progress=document.querySelector<HTMLElement>('#intro-progress');
  const progressFill=document.querySelector<HTMLElement>('#intro-progress-fill');
  const motionNote=document.querySelector<HTMLElement>('#intro-motion-note');
  if(!overlay||!scene||!skip||!replay||!pause||!speed||!status||!layers||!progress||!progressFill)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const app=Array.from(document.querySelectorAll<HTMLElement>('body > header,body > main,body > footer,body > .skip-link'));
  const key='felix-portfolio:intro-v1';
  let active=false,preparing=false,exiting=false,paused=false;
  let rate=1,generation=0,monitorFrame=0,buildDuration=TOTAL;
  let animations:Animation[]=[], jobs:Job[]=[];
  let master:Animation|undefined, exitAnimation:Animation|undefined;
  let deadline:ReturnType<typeof setTimeout>|undefined;
  let previousFocus:HTMLElement|null=null;
  let inertBefore:boolean[]=[];
  let savedOverflow='',savedPadding='',easeOut='';
  let drawCurve=[.77,0,.175,1];

  function remember(){try{sessionStorage.setItem(key,'seen');}catch{/* Storage is optional. */}}
  function clearTimeline(){cancelAnimationFrame(monitorFrame);clearTimeout(deadline);animations.forEach(a=>a.cancel());animations=[];jobs=[];master=undefined;}
  function hide(){
    overlay!.hidden=true;exiting=false;exitAnimation?.cancel();exitAnimation=undefined;scene!.replaceChildren();
    app.forEach((node,index)=>{node.inert=inertBefore[index]??false;});
    document.body.style.overflowY=savedOverflow;document.body.style.paddingRight=savedPadding;
    if(previousFocus?.isConnected&&previousFocus!==document.body)previousFocus.focus({preventScroll:true});
  }
  function finish(immediate=false){
    if(!active&&!exiting)return;
    active=false;const token=++generation;cancelAnimationFrame(monitorFrame);clearTimeout(deadline);remember();
    if(immediate||reduced.matches){clearTimeline();hide();return;}
    exiting=true;status!.textContent='Build complete';
    exitAnimation=overlay!.animate([{opacity:1},{opacity:0}],{duration:220,easing:easeOut,fill:'both'});
    exitAnimation.finished.then(()=>{if(token===generation){clearTimeline();hide();}}).catch(()=>{});
  }
  function armDeadline(){
    clearTimeout(deadline);
    if(!paused&&master)deadline=setTimeout(()=>finish(true),Math.max(0,buildDuration-Number(master.currentTime??0))/rate+3000);
  }
  function monitor(){
    if(!active||!master||paused)return;
    const time=Number(master.currentTime??0);
    const done=jobs.filter(job=>time>=job.start+job.duration).length;
    const message=time<1200?'Scanning page…':time<6500?`${AGENTS} agents`:'Build complete';
    if(status!.textContent!==message)status!.textContent=message;
    const count=time<1200?'':`${done} / ${jobs.length} layers`;
    if(layers!.textContent!==count){layers!.textContent=count;progressFill!.style.transform=`scaleX(${done/Math.max(1,jobs.length)})`;progress!.setAttribute('aria-valuenow',String(Math.round(done/Math.max(1,jobs.length)*100)));}
    jobs.forEach(job=>{
      if(!job.drawing||time<job.start||time>job.start+job.duration)return;
      const progress=clamp((time-job.start)/job.duration);
      const amount=.02+.98*(job.linear?progress:bezier(progress,drawCurve));
      const label=`${Math.round(job.rect.width*amount)} × ${Math.round(job.rect.height*amount)}`;
      if(job.badge.textContent!==label)job.badge.textContent=label;
    });
    monitorFrame=requestAnimationFrame(monitor);
  }

  async function play(){
    if(active||preparing||exiting||reduced.matches||document.hidden)return;
    preparing=true;const request=generation;
    await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,900))]);
    preparing=false;
    if(request!==generation||active||reduced.matches||document.hidden)return;
    previousFocus=document.activeElement as HTMLElement;
    window.scrollTo({top:0,behavior:'instant'});
    savedOverflow=document.body.style.overflowY;savedPadding=document.body.style.paddingRight;
    const scrollbar=innerWidth-document.documentElement.clientWidth;
    const padding=parseFloat(getComputedStyle(document.body).paddingRight)||0;
    document.body.style.overflowY='hidden';if(scrollbar)document.body.style.paddingRight=`${padding+scrollbar}px`;
    inertBefore=app.map(node=>node.inert);active=true;paused=false;rate=1;jobs=[];
    pause!.textContent='Pause';pause!.setAttribute('aria-pressed','false');speed!.textContent='1×';

    // Batch geometry, typography and character measurements before scene construction.
    const snapshot=(selector:string):Snapshot=>{const source=document.querySelector<HTMLElement>(selector)!;return{source,rect:source.getBoundingClientRect(),style:getComputedStyle(source)};};
    const header=snapshot('.site-header'),hero=snapshot('.hero-sheet'),caption=snapshot('.hero-caption'),folder=snapshot('.folder-work');
    const first=snapshot('#hero-title > span:first-child'),second=snapshot('#hero-title > span:last-child');
    const selection=snapshot('.name-selection'),button=snapshot('.primary-button'),author=snapshot('.author-tag');
    const nav=Array.from(header.source.querySelectorAll<HTMLElement>('nav a')).map(source=>({source,rect:source.getBoundingClientRect(),style:getComputedStyle(source)}));
    const titleSteps=[advances(first.source),advances(second.source)];
    const navSteps=nav.map(item=>advances(item.source));
    const root=getComputedStyle(document.documentElement);easeOut=root.getPropertyValue('--ease-out').trim();
    const easeInOut=root.getPropertyValue('--ease-in-out').trim();drawCurve=(easeInOut.match(/[\d.]+/g)??[]).map(Number);
    const width=innerWidth,height=innerHeight,fragment=document.createDocumentFragment();
    const headerClone=cloneLayer(header),heroClone=cloneLayer(hero),captionClone=cloneLayer(caption),folderClone=cloneLayer(folder);
    heroClone.style.background='var(--color-clear)';
    const animate=(node:Element,frames:Keyframe[],delay:number,duration:number,easing=easeOut)=>{const a=node.animate(frames,{delay,duration,easing,fill:'both'});animations.push(a);return a;};
    const show=(node:Element,start:number,duration=120)=>animate(node,[{opacity:0},{opacity:1}],start,duration);
    const position=(node:HTMLElement,rect:DOMRect,extra=0)=>Object.assign(node.style,{left:`${rect.x-extra}px`,top:`${rect.y-extra}px`,width:`${rect.width+extra*2}px`,height:`${rect.height+extra*2}px`});
    const windowOf=(node:Element,start:number,duration:number)=>animate(node,[{opacity:0,offset:0},{opacity:1,offset:.001},{opacity:1,offset:.86},{opacity:0,offset:1}],start,duration,'linear');
    function frame(rect:DOMRect,start:number,duration:number,drawing=false,linear=false){
      const box=document.createElement('div');box.className='swarm-editor-frame';position(box,rect);
      for(let i=0;i<4;i++){const handle=document.createElement('i');box.append(handle);}
      fragment.append(box);windowOf(box,start,duration+550);
      if(drawing){box.style.transformOrigin='top left';animate(box,[{transform:'scale(.02,.02)'},{transform:'scale(1,1)'}],start,duration,linear?'linear':easeInOut);}
      const badge=document.createElement('div');badge.className='swarm-dimension';badge.textContent=`${Math.round(rect.width)} × ${Math.round(rect.height)}`;
      Object.assign(badge.style,{left:`${rect.left}px`,top:`${rect.top+6}px`});
      const sx=drawing ? .02 : 1;
      animate(badge,[{transform:`translate(${rect.width*sx}px,${rect.height*sx}px)`},{transform:`translate(${rect.width}px,${rect.height}px)`}],start,duration,linear?'linear':easeInOut);
      windowOf(badge,start,duration+550);fragment.append(badge);jobs.push({start,duration,badge,rect,drawing,linear});return box;
    }
    function typeInto(node:HTMLElement,item:Snapshot,steps:number[],start:number,duration:number,paper:string){
      show(node,start,1);frame(item.rect,start-120,duration+100);
      const cover=document.createElement('div');cover.className='swarm-word-cover';position(cover,item.rect,5);
      const ink=document.createElement('div');ink.className='swarm-word-ink';ink.style.background=paper;cover.append(ink);fragment.append(cover);
      windowOf(cover,start,duration+150);
      animate(ink,steps.map((distance,index)=>({offset:index/(steps.length-1),transform:`translateX(${distance+5}px)`,easing:'steps(1,end)'})),start,duration,'linear');
    }

    const ghost=document.createElement('div');ghost.className='swarm-scan-ghost';ghost.append(cloneLayer(header),cloneLayer(hero),cloneLayer(caption));fragment.append(ghost);
    animate(ghost,[{opacity:.02,offset:0},{opacity:.02,offset:.85},{opacity:0,offset:1}],0,1400,'linear');
    const surface=document.createElement('div');surface.className='swarm-reference-surface';position(surface,hero.rect);surface.style.borderRadius=hero.style.borderRadius;
    show(surface,PANEL_START,1);animate(surface,[{transform:'scale(.02,.02)'},{transform:'scale(1,1)'}],PANEL_START,PANEL_DRAW,'linear');
    fragment.append(surface,headerClone,heroClone,captionClone);frame(hero.rect,PANEL_START,PANEL_DRAW,true,true);
    show(headerClone.querySelector('.monogram')!,1350,160);show(headerClone.querySelector('.identity-name')!,1700,220);
    frame(new DOMRect(header.rect.left,header.rect.top+24,50,46),1300,500);
    headerClone.querySelectorAll<HTMLElement>('nav a').forEach((node,index)=>typeInto(node,nav[index],navSteps[index],1550+index*470,380,'var(--color-paper)'));
    const captionLink=captionClone.querySelector<HTMLElement>('a')!;show(captionLink,1450,220);
    const note=captionClone.querySelector<HTMLElement>('#intro-motion-note');if(note)note.hidden=true;
    heroClone.querySelectorAll<HTMLElement>('.hero-top > *').forEach((node,index)=>{show(node,2800+index*350,180);});
    show(heroClone.querySelector('.name-selection')!,2800,350);frame(selection.rect,2400,500,true);
    show(heroClone.querySelector('.author-tag')!,3100,150);frame(author.rect,3000,430);
    show(heroClone.querySelector('.hero-bottom p')!,2850,180);
    const buttonClone=heroClone.querySelector<HTMLElement>('.primary-button')!;
    const textNode=Array.from(buttonClone.childNodes).find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent?.trim());
    if(textNode){const label=document.createElement('span');label.className='swarm-button-label';label.textContent=textNode.textContent!.trim();textNode.replaceWith(label);show(label,3850,250);}
    buttonClone.querySelectorAll<HTMLElement>('span:not(.swarm-button-label)').forEach(node=>show(node,4100,120));
    buttonClone.style.transformOrigin='top left';animate(buttonClone,[{opacity:0,transform:'scale(.02,.02)'},{opacity:1,transform:'scale(.02,.02)',offset:.01},{opacity:1,transform:'scale(1,1)'}],3400,400,easeInOut);frame(button.rect,3400,400,true);
    if(folder.rect.top<height){fragment.append(folderClone);show(folderClone,1850,220);frame(folder.rect,1700,500);}

    const titleClones=heroClone.querySelectorAll<HTMLElement>('.name-stage h1 > span');
    titleClones.forEach(node=>{node.style.opacity='0';});
    const titleSpecs=[{item:first,steps:titleSteps[0],start:2450,duration:600,grow:380},{item:second,steps:titleSteps[1],start:4450,duration:1000,grow:0}];
    titleSpecs.forEach(({item,steps,start,duration,grow},index)=>{
      const task=document.createElement('div');task.className='swarm-type-layer';position(task,item.rect);
      ['fontFamily','fontSize','fontWeight','fontStyle','fontStretch','letterSpacing','lineHeight','fontKerning','fontFeatureSettings','fontVariationSettings','fontOpticalSizing','color'].forEach(key=>{(task.style as unknown as Record<string,string>)[key]=(item.style as unknown as Record<string,string>)[key];});
      const text=document.createElement('span');text.className='swarm-type-text';text.textContent=item.source.textContent;task.append(text);
      const cover=document.createElement('div');cover.className='swarm-word-cover';Object.assign(cover.style,{inset:'-12px',width:'auto',height:'auto'});
      const ink=document.createElement('div');ink.className='swarm-word-ink';cover.append(ink);task.append(cover);
      const caret=document.createElement('span');caret.className='swarm-local-caret';task.append(caret);
      for(let i=0;i<4;i++){const handle=document.createElement('i');handle.className='swarm-type-handle';task.append(handle);windowOf(handle,start,duration+grow+350);}
      show(task,start,1);
      const scale=grow?18/parseFloat(item.style.fontSize):1;
      animate(task,[{transform:`scale(${scale})`,offset:0},{transform:`scale(${scale})`,offset:duration/(duration+Math.max(1,grow)),easing:easeOut},{transform:'scale(1)',offset:1}],start,duration+Math.max(1,grow),'linear');
      const keyframes=steps.map((distance,n)=>({offset:n/(steps.length-1),transform:`translateX(${distance+12}px)`,easing:'steps(1,end)'}));
      animate(ink,keyframes,start,duration,'linear');windowOf(cover,start,duration+180);
      animate(caret,steps.map((distance,n)=>({offset:n/(steps.length-1),transform:`translateX(${distance}px)`,easing:'steps(1,end)'})),start,duration,'linear');
      windowOf(caret,start,duration+500);fragment.append(task);
      frame(item.rect,start+duration+grow-80,80);
    });

    // Alt-drag choreography: duplicate the first text layer, then replace its contents.
    const duplicate=document.createElement('div');duplicate.className='swarm-duplicate-text';position(duplicate,first.rect);
    ['fontFamily','fontSize','fontWeight','letterSpacing','lineHeight','color'].forEach(key=>{(duplicate.style as unknown as Record<string,string>)[key]=(first.style as unknown as Record<string,string>)[key];});
    duplicate.textContent=first.source.textContent;fragment.append(duplicate);
    const duplicateX=second.rect.right-first.rect.width-first.rect.left;
    animate(duplicate,[{opacity:0,transform:'translate(0px,0px)',offset:0},{opacity:1,transform:'translate(0px,0px)',offset:.08},{opacity:1,transform:`translate(${duplicateX}px,${second.rect.top-first.rect.top}px)`,offset:.75},{opacity:0,transform:`translate(${duplicateX}px,${second.rect.top-first.rect.top}px)`,offset:1}],3700,800,easeInOut);
    nav.slice(1).forEach((item,index)=>{
      const copy=document.createElement('div');copy.className='swarm-nav-duplicate';copy.textContent=nav[0].source.textContent;
      Object.assign(copy.style,{left:`${nav[0].rect.left}px`,top:`${nav[0].rect.top}px`,fontSize:nav[0].style.fontSize,color:nav[0].style.color});
      animate(copy,[{opacity:0,transform:'translateX(0px)',offset:0},{opacity:1,transform:'translateX(0px)',offset:.1},{opacity:1,transform:`translateX(${item.rect.left-nav[0].rect.left}px)`,offset:.7},{opacity:0,transform:`translateX(${item.rect.left-nav[0].rect.left}px)`,offset:1}],1950+index*400,450,easeInOut);fragment.append(copy);
    });
    const ruler=document.createElement('div');ruler.className='swarm-ruler';Object.assign(ruler.style,{left:`${selection.rect.left}px`,top:`${selection.rect.top}px`,height:`${selection.rect.height}px`});windowOf(ruler,3850,1000);fragment.append(ruler);
    const mark=document.createElement('div');mark.className='swarm-mark swarm-scan-mark';mark.textContent='gf.';
    Object.assign(mark.style,{left:`${width/2}px`,top:`${height/2}px`});windowOf(mark,0,1400);fragment.append(mark);

    const h=hero.rect,a=first.rect,b=second.rect;
    const routes:Stop[][]=[
      [{time:PANEL_START,x:h.left,y:h.top},{time:PANEL_START+PANEL_DRAW,x:h.right,y:h.bottom},{time:3000,x:h.right-40,y:h.bottom-40}],
      [{time:2300,x:a.left,y:a.top},{time:2450,x:a.left,y:a.top+18},{time:3050,x:a.left+titleSteps[0].at(-1)!*18/parseFloat(first.style.fontSize),y:a.top+18},{time:3430,x:a.right,y:a.bottom}],
      [{time:4300,x:b.left,y:b.top},{time:4450,x:b.left,y:b.top+b.height*.65},{time:5450,x:b.right,y:b.top+b.height*.65}],
      [{time:1400,x:header.rect.left+20,y:header.rect.top+40},{time:1750,x:header.rect.left+150,y:header.rect.top+45},{time:2800,x:h.left+50,y:h.top+40}],
      [{time:1450,x:nav[0].rect.left,y:nav[0].rect.top+10},{time:1950,x:nav[0].rect.right,y:nav[0].rect.top+10},{time:2400,x:nav[1].rect.right,y:nav[1].rect.top+10},{time:2900,x:nav[2].rect.right,y:nav[2].rect.top+10}],
      [{time:2400,x:selection.rect.left,y:selection.rect.top},{time:2900,x:selection.rect.right,y:selection.rect.bottom},{time:3500,x:author.rect.right,y:author.rect.bottom}],
      [{time:3300,x:button.rect.left,y:button.rect.top},{time:3800,x:button.rect.right,y:button.rect.bottom},{time:4300,x:button.rect.right-20,y:button.rect.top+15}],
    ];
    for(let index=0;index<AGENTS;index++){
      const phase=index*Math.PI*2/AGENTS;
      const start={time:0,x:width*(index%2?.18:.82)+Math.sin(index*2.3)*width*.12,y:height*(.2+(index%5)*.12)};
      const gathering=[start,{time:650,x:width/2+Math.cos(phase)*150,y:height/2+Math.sin(phase)*105},{time:1120,x:width/2+Math.cos(phase+1)*92,y:height/2+Math.sin(phase+1)*75}];
      const work=routes[index]??[{time:1600,x:h.left+h.width*(.1+(index%4)*.23),y:h.top+h.height*(.1+(index%3)*.32)},{time:3000,x:h.left+h.width*(.2+(index%3)*.25),y:h.top+h.height*(.2+(index%4)*.17)},{time:4600,x:h.left+h.width*(.1+(index%4)*.23),y:h.top+h.height*(.1+(index%3)*.32)}];
      const last=work.at(-1)!.time;
      const wanderPoint=(turn:number)=>({x:h.left+h.width*(.5+.42*Math.sin(index*2.399963+turn)),y:h.top+h.height*(.5+.4*Math.cos(index*1.731+turn*.9))});
      const wander=[{time:Math.max(6100,last+450),...wanderPoint(.3)},{time:7900,...wanderPoint(1.5)},{time:TOTAL,...wanderPoint(2.9)}];
      const stops=[...gathering,...work,...wander];
      const pointer=document.createElement('div');pointer.className='swarm-pointer swarm-editor-pointer';pointer.dataset.tone=String(index%7);
      pointer.innerHTML='<svg class="swarm-arrow" viewBox="-17 -11 22 22" width="20" height="20" aria-hidden="true"><path d="M1 0-14-8-10 0-14 8 1 0Z"/></svg><svg class="swarm-crosshair" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 2v16M2 10h16"/></svg><svg class="swarm-ibeam" viewBox="0 0 16 24" width="16" height="24" aria-hidden="true"><path d="M4 3h8M8 3v18M4 21h8"/></svg>';
      const positions:Keyframe[]=[],rotations:Keyframe[]=[];let previousAngle=phase*180/Math.PI;
      for(let step=0;step<=240;step++){
        const time=TOTAL*step/240;let point=pathAt(stops,time);
        if(index===0&&time>=PANEL_START&&time<=PANEL_START+PANEL_DRAW){const amount=.02+.98*(time-PANEL_START)/PANEL_DRAW;point={x:h.left+h.width*amount,y:h.top+h.height*amount};}
        const x=clamp(point.x,10,width-20),y=clamp(point.y,10,height-30);
        const next=pathAt(stops,Math.min(TOTAL,time+16));let angle=Math.atan2(next.y-point.y,next.x-point.x)*180/Math.PI;
        while(angle-previousAngle>180)angle-=360;while(angle-previousAngle< -180)angle+=360;previousAngle=angle;
        positions.push({offset:step/240,transform:`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`});rotations.push({offset:step/240,transform:`rotate(${angle.toFixed(2)}deg)`});
      }
      animate(pointer,positions,0,TOTAL,'linear');animate(pointer.querySelector('.swarm-arrow')!,rotations,0,TOTAL,'linear');
      const toolStart=index===0?PANEL_START:index===5?2400:index===6?3400:0;
      const toolEnd=index===0?PANEL_START+PANEL_DRAW:index===5?2900:index===6?3800:0;
      const typeStart=index===1?2450:index===2?4450:index===4?1550:0;
      const typeEnd=index===1?3050:index===2?5450:index===4?2850:0;
      const opacity=(start:number,end:number,invert=false):Keyframe[]=>{
        if(!end)return[{opacity:invert?1:0},{opacity:invert?1:0}];
        return[{opacity:invert?1:0,offset:0},{opacity:invert?1:0,offset:Math.max(0,start/TOTAL-.001)},{opacity:invert?0:1,offset:start/TOTAL},{opacity:invert?0:1,offset:end/TOTAL},{opacity:invert?1:0,offset:Math.min(1,end/TOTAL+.001)},{opacity:invert?1:0,offset:1}];
      };
      animate(pointer.querySelector('.swarm-crosshair')!,opacity(toolStart,toolEnd),0,TOTAL,'linear');animate(pointer.querySelector('.swarm-ibeam')!,opacity(typeStart,typeEnd),0,TOTAL,'linear');
      animate(pointer.querySelector('.swarm-arrow')!,opacity(toolStart||typeStart,toolEnd||typeEnd,true),0,TOTAL,'linear');
      animate(pointer,[{opacity:0,offset:0},{opacity:1,offset:.025},{opacity:1,offset:1}],0,TOTAL,'linear');fragment.append(pointer);
    }

    scene!.replaceChildren(fragment);app.forEach(node=>{node.inert=true;});
    overlay!.setAttribute('role','dialog');overlay!.setAttribute('aria-modal','true');overlay!.setAttribute('aria-label','Animated portfolio introduction');overlay!.hidden=false;
    skip!.focus({preventScroll:true});status!.textContent='Scanning page…';layers!.textContent='';progressFill!.style.transform='scaleX(0)';
    buildDuration=Math.max(...jobs.map(job=>job.start+job.duration),...titleSpecs.map(task=>task.start+task.duration+task.grow));
    master=animate(scene!,[{opacity:1},{opacity:1}],0,buildDuration,'linear');
    const epoch=Number(document.timeline.currentTime??0)+32;animations.forEach(a=>{a.startTime=epoch;});
    master.finished.then(()=>finish(true)).catch(()=>{});armDeadline();monitor();
  }

  const safePlay=()=>{void play().catch(()=>{preparing=false;finish(true);});};
  skip.addEventListener('click',()=>finish(true));replay.addEventListener('click',safePlay);
  pause.addEventListener('click',()=>{
    if(!active||!master)return;
    const time=Number(master.currentTime??0);paused=!paused;
    if(paused)animations.forEach(a=>{a.pause();a.currentTime=time;});
    else {const epoch=Number(document.timeline.currentTime??0);animations.forEach(a=>{a.playbackRate=rate;a.play();a.startTime=epoch-time/rate;});}
    pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));
    cancelAnimationFrame(monitorFrame);armDeadline();if(!paused)monitor();
  });
  speed.addEventListener('click',()=>{if(!active)return;rate=rate===3?1:rate+1;animations.forEach(a=>a.updatePlaybackRate(rate));speed.textContent=`${rate}×`;armDeadline();});
  document.addEventListener('keydown',event=>{
    if(!active&&!exiting)return;if(event.key==='Escape')finish(true);
    if(event.key==='Tab'){
      const controls=Array.from(overlay.querySelectorAll<HTMLButtonElement>('.intro-toolbar button:not([hidden]):not([disabled])'));
      const index=controls.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length]?.focus();
    }
  });
  window.addEventListener('resize',()=>finish(true),{passive:true});window.addEventListener('pagehide',()=>{generation++;finish(true);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){generation++;finish(true);}});
  const syncMotionPreference=()=>{replay.hidden=reduced.matches;if(motionNote)motionNote.hidden=!reduced.matches;if(reduced.matches){generation++;finish(true);}};
  reduced.addEventListener('change',syncMotionPreference);syncMotionPreference();
  let seen=false;try{seen=sessionStorage.getItem(key)==='seen';}catch{/* No persistent storage is required. */}
  const forceIntro=new URLSearchParams(location.search).get('intro')==='1';
  if(!reduced.matches&&(forceIntro||(!seen&&!location.hash&&window.scrollY<20)))safePlay();
}
