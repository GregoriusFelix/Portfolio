type Point = { x: number; y: number };
type Stop = Point & { time: number };
type Snapshot = { source: HTMLElement; rect: DOMRect };

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const TOTAL = 4600;
const softClamp = (value: number, low: number, high: number) => {
  const softplus = (n: number) => 12 * (Math.max(0, n / 12) + Math.log1p(Math.exp(-Math.abs(n / 12))));
  return low + softplus(value - low) - softplus(value - high);
};

// Sample a time-aware spline once. Its shared tangents carry velocity through task boundaries.
function pathAt(stops: Stop[], time: number): Point {
  let index = 0;
  while (index < stops.length - 2 && time > stops[index + 1].time) index++;
  const a = stops[index], b = stops[index + 1];
  const before = stops[Math.max(0, index - 1)];
  const after = stops[Math.min(stops.length - 1, index + 2)];
  const duration = b.time - a.time;
  const t = clamp((time - a.time) / duration);
  const t2 = t * t, t3 = t2 * t;
  const tangent = (start: Stop, end: Stop, axis: 'x' | 'y') =>
    (end[axis] - start[axis]) / Math.max(1, end.time - start.time) * duration;
  const axis = (key: 'x' | 'y') =>
    (2 * t3 - 3 * t2 + 1) * a[key] +
    (t3 - 2 * t2 + t) * tangent(before, b, key) +
    (-2 * t3 + 3 * t2) * b[key] +
    (t3 - t2) * tangent(a, after, key);
  return { x: axis('x'), y: axis('y') };
}

function cloneLayer({ source, rect }: Snapshot): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  [clone, ...clone.querySelectorAll<HTMLElement>('*')].forEach(node => {
    node.removeAttribute('id');
    node.removeAttribute('autofocus');
    node.removeAttribute('href');
    node.removeAttribute('name');
    if (node.matches('a, button, input, select, textarea, [tabindex]')) node.tabIndex = -1;
  });
  Object.assign(clone.style, {
    position: 'absolute', left: `${rect.x}px`, top: `${rect.y}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, minHeight: '0',
    maxWidth: 'none', margin: '0', pointerEvents: 'none',
  });
  return clone;
}

export function initSwarmIntro() {
  const overlay = document.querySelector<HTMLElement>('#swarm-intro');
  const scene = document.querySelector<HTMLElement>('#swarm-scene');
  const skip = document.querySelector<HTMLButtonElement>('#skip-intro');
  const replay = document.querySelector<HTMLButtonElement>('#replay-intro');
  const status = document.querySelector<HTMLElement>('#intro-status');
  const motionNote = document.querySelector<HTMLElement>('#intro-motion-note');
  if (!overlay || !scene || !skip || !replay || !status) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const app = Array.from(document.querySelectorAll<HTMLElement>('body > header, body > main, body > footer, body > .skip-link'));
  const key = 'felix-portfolio:intro-v1';
  let active = false, preparing = false, exiting = false;
  let generation = 0;
  let animations: Animation[] = [];
  let timers: ReturnType<typeof setTimeout>[] = [];
  let exitAnimation: Animation | undefined;
  let previousFocus: HTMLElement | null = null;
  let inertBefore: boolean[] = [];
  let savedOverflow = '', savedPadding = '';

  function remember() { try { sessionStorage.setItem(key, 'seen'); } catch { /* Storage is optional. */ } }
  function clearTimeline() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    timers.forEach(timer => clearTimeout(timer));
    timers = [];
  }
  function hide() {
    overlay!.hidden = true;
    exiting = false;
    exitAnimation?.cancel();
    exitAnimation = undefined;
    scene!.replaceChildren();
    app.forEach((node, index) => { node.inert = inertBefore[index] ?? false; });
    document.body.style.overflowY = savedOverflow;
    document.body.style.paddingRight = savedPadding;
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
  }
  function finish(immediate = false) {
    if (!active && !exiting) return;
    active = false;
    const finishedGeneration = ++generation;
    timers.forEach(timer => clearTimeout(timer));
    timers = [];
    remember();
    status!.textContent = 'Introduction complete.';
    if (immediate || reduced.matches) { clearTimeline(); hide(); return; }
    exiting = true;
    // Keep the finished replica intact during the handoff; cancel only after it is covered.
    const easeOut = getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim();
    exitAnimation = overlay!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: easeOut, fill: 'both' });
    exitAnimation.finished.then(() => {
      if (generation !== finishedGeneration) return;
      clearTimeline(); hide();
    }).catch(() => {});
  }

  async function play() {
    if (active || preparing || exiting || reduced.matches || document.hidden) return;
    preparing = true;
    const requestedGeneration = generation;
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 900))]);
    preparing = false;
    if (requestedGeneration !== generation || active || reduced.matches || document.hidden) return;
    previousFocus = document.activeElement as HTMLElement;
    window.scrollTo({ top: 0, behavior: 'instant' });
    savedOverflow = document.body.style.overflowY;
    savedPadding = document.body.style.paddingRight;
    const scrollbar = innerWidth - document.documentElement.clientWidth;
    const padding = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.overflowY = 'hidden';
    if (scrollbar) document.body.style.paddingRight = `${padding + scrollbar}px`;
    inertBefore = app.map(node => node.inert);
    active = true;

    // One geometry pass before building the detached scene. Playback performs no layout reads.
    const snapshot = (selector: string): Snapshot => {
      const source = document.querySelector<HTMLElement>(selector)!;
      return { source, rect: source.getBoundingClientRect() };
    };
    const header = snapshot('.site-header');
    const hero = snapshot('.hero-sheet');
    const caption = snapshot('.hero-caption');
    const folder = snapshot('.folder-work');
    const titleA = snapshot('#hero-title > span:first-child');
    const titleB = snapshot('#hero-title > span:last-child');
    const titleGroup = snapshot('.name-selection');
    const button = snapshot('.primary-button');
    const styles = getComputedStyle(document.documentElement);
    const easeOut = styles.getPropertyValue('--ease-out').trim();
    const easeInOut = styles.getPropertyValue('--ease-in-out').trim();
    const radius = getComputedStyle(hero.source).borderRadius;
    const width = innerWidth, height = innerHeight;
    const fragment = document.createDocumentFragment();
    const headerClone = cloneLayer(header), heroClone = cloneLayer(hero);
    const captionClone = cloneLayer(caption), folderClone = cloneLayer(folder);
    heroClone.style.background = 'var(--color-clear)';
    const animate = (node: Element, frames: Keyframe[], delay: number, duration: number, easing = easeOut) => {
      const animation = node.animate(frames, { delay, duration, easing, fill: 'both' });
      animations.push(animation);
      return animation;
    };
    const arrive = (node: Element, delay: number, distance = 6, duration = 420) => animate(node, [
      { opacity: 0, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: 'translateY(0px)' },
    ], delay, duration);
    const position = (node: HTMLElement, rect: DOMRect, extra = 0) => Object.assign(node.style, {
      left: `${rect.x - extra}px`, top: `${rect.y - extra}px`,
      width: `${rect.width + extra * 2}px`, height: `${rect.height + extra * 2}px`,
    });

    const surface = document.createElement('div');
    surface.className = 'swarm-surface'; position(surface, hero.rect);
    surface.style.borderRadius = radius;
    const fill = document.createElement('div'); fill.className = 'swarm-surface-fill'; surface.append(fill);
    animate(fill, [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0%)' }], 850, 700, easeInOut);
    fragment.append(surface, headerClone, heroClone, captionClone);
    if (folder.rect.top < height) { fragment.append(folderClone); arrive(folderClone, 3420, 8); }
    const outline = document.createElement('div'); outline.className = 'swarm-outline'; position(outline, hero.rect);
    ['top', 'right', 'bottom', 'left'].forEach((edge, index) => {
      const window = document.createElement('div'); window.className = `swarm-edge swarm-edge-${edge}`;
      const line = document.createElement('span'); window.append(line); outline.append(window);
      const vertical = edge === 'left' || edge === 'right';
      const start = edge === 'bottom' || edge === 'left' ? '100%' : '-100%';
      animate(line, [{ transform: `translate${vertical ? 'Y' : 'X'}(${start})` }, { transform: `translate${vertical ? 'Y' : 'X'}(0%)` }], 580 + index * 160, 420, easeInOut);
    });
    animate(outline, [{ opacity: 1 }, { opacity: 0 }], 1500, 220);
    fragment.append(outline);

    arrive(headerClone.querySelector('.identity')!, 820);
    headerClone.querySelectorAll('nav a').forEach((node, index) => arrive(node, 1000 + index * 40));
    heroClone.querySelectorAll('.hero-top > *').forEach((node, index) => arrive(node, 1400 + index * 40));
    const titles = heroClone.querySelectorAll<HTMLElement>('.name-stage h1 > span');
    const typing: { ink: HTMLElement; caret: HTMLElement; rect: DOMRect; start: number }[] = [];
    [titleA, titleB].forEach((title, index) => {
      const start = 1720 + index * 380;
      // A moving cover reveals real text without stretching glyphs or repainting them per frame.
      animate(titles[index], [{ opacity: 0 }, { opacity: 1 }], start, 1);
      const cover = document.createElement('div'); cover.className = 'swarm-word-cover'; position(cover, title.rect, 12);
      const ink = document.createElement('div'); ink.className = 'swarm-word-ink'; cover.append(ink);
      animate(cover, [
        { opacity: 0, offset: 0 }, { opacity: 1, offset: 0.001 },
        { opacity: 1, offset: 0.84 }, { opacity: 0, offset: 1 },
      ], start, 800, 'linear');
      fragment.append(cover);
      const caret = document.createElement('div'); caret.className = 'swarm-type-caret';
      Object.assign(caret.style, { left: `${title.rect.x}px`, top: `${title.rect.y + title.rect.height * 0.2}px`, height: `${title.rect.height * 0.65}px` });
      typing.push({ ink, caret, rect: title.rect, start });
      animate(caret, [{ opacity: 0, offset: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.8 }, { opacity: 0, offset: 1 }], start, 800, 'linear');
      fragment.append(caret);
    });
    animate(heroClone.querySelector('.name-selection')!, [{ opacity: 0 }, { opacity: 0.6 }], 1650, 420);
    arrive(heroClone.querySelector('.author-tag')!, 2900, 4);
    arrive(heroClone.querySelector('.hero-bottom p')!, 2840);
    animate(heroClone.querySelector('.primary-button')!, [
      { opacity: 0, transform: 'translateY(6px) scale(0.97)' },
      { opacity: 1, transform: 'translateY(0px) scale(1)' },
    ], 3000, 420);
    arrive(captionClone, 3300, 4);

    const mark = document.createElement('div'); mark.className = 'swarm-mark'; mark.textContent = 'gf.';
    Object.assign(mark.style, { left: `${width / 2}px`, top: `${height / 2}px` });
    animate(mark, [
      { opacity: 0, transform: 'translate(-50%, -45%) scale(0.97)', offset: 0 },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.3 },
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.65 },
      { opacity: 0, transform: 'translate(-50%, -55%) scale(0.97)', offset: 1 },
    ], 0, 850);
    fragment.append(mark);

    const h = hero.rect, a = titleA.rect, b = titleB.rect, selection = titleGroup.rect;
    const routes: Stop[][] = [
      [{time:750,x:h.left,y:h.top},{time:1100,x:h.right,y:h.top},{time:1450,x:h.right,y:h.bottom},{time:1800,x:h.left,y:h.bottom},{time:2200,x:h.left,y:h.top},{time:3400,x:selection.left,y:selection.top},{time:3900,x:selection.right,y:selection.top}],
      [{time:1350,x:a.left-20,y:a.top+30},{time:1720,x:a.left,y:a.top+a.height*.65},{time:2370,x:a.right,y:a.top+a.height*.65},{time:3000,x:a.right+12,y:a.bottom+15},{time:3900,x:width*.7,y:height*.35}],
      [{time:1600,x:b.left-24,y:b.top+20},{time:2100,x:b.left,y:b.top+b.height*.65},{time:2750,x:b.right,y:b.top+b.height*.65},{time:3300,x:b.right+12,y:b.bottom+20},{time:3900,x:width*.76,y:height*.5}],
      [{time:780,x:header.rect.left+30,y:header.rect.top+38},{time:1100,x:header.rect.right-200,y:header.rect.top+50},{time:1450,x:header.rect.right-40,y:header.rect.top+50},{time:2200,x:h.right-70,y:h.top+40},{time:3900,x:width*.8,y:height*.2}],
      [{time:1500,x:h.left+24,y:h.bottom-40},{time:2840,x:h.left+60,y:h.bottom-44},{time:3100,x:button.rect.left,y:button.rect.top},{time:3420,x:button.rect.right,y:button.rect.bottom},{time:3900,x:width*.6,y:height*.78}],
      [{time:1600,x:h.left+20,y:h.top+20},{time:2600,x:selection.right,y:selection.bottom},{time:3420,x:folder.rect.left+30,y:Math.min(folder.rect.top+25,height-70)},{time:3800,x:folder.rect.left+220,y:Math.min(folder.rect.top+25,height-70)},{time:3900,x:width*.25,y:height*.8}],
    ];
    const names = ['Layout', 'Type', 'Type', 'Details', 'Layout', 'Felix'];
    routes.forEach((route, index) => {
      const angle = index * Math.PI / 3;
      const orbit = (time: number) => ({ x: width/2 + Math.cos(angle + time/420)*72, y: height/2 + Math.sin(angle + time/420)*52 });
      const entry = [0,100,200,300].map(time => ({time,...orbit(time)}));
      const stops = [...entry, ...route, { time: 4450, x: width/2 + Math.cos(angle)*110, y: height/2 + Math.sin(angle)*80 }, {time:TOTAL,x:width/2+Math.cos(angle)*130,y:height/2+Math.sin(angle)*95}];
      if (index === 1 || index === 2) {
        const { ink, caret, rect, start } = typing[index - 1];
        const reveals: Keyframe[] = [], carets: Keyframe[] = [];
        for (let step = 0; step <= 32; step++) {
          const x = pathAt(stops, start + 650 * step / 32).x;
          const travel = clamp(x - rect.left, 0, rect.width);
          reveals.push({ offset: step / 32, transform: `translateX(${(travel + 12).toFixed(2)}px)` });
          carets.push({ offset: step / 32, transform: `translateX(${travel.toFixed(2)}px)` });
        }
        animate(ink, reveals, start, 650, 'linear');
        animate(caret, carets, start, 650, 'linear');
      }
      const pointer = document.createElement('div'); pointer.className = 'swarm-pointer'; pointer.dataset.tone = String(index % 4);
      pointer.innerHTML = '<svg viewBox="0 0 24 30" width="24" height="30" aria-hidden="true"><path d="M2 2v21l5-6 5 11 4-2-5-10h9L2 2Z" /></svg>';
      const label = document.createElement('span'); label.className = 'swarm-pointer-label'; label.textContent = names[index]; pointer.append(label);
      const samples: Keyframe[] = [], labels: Keyframe[] = [];
      for (let step=0; step<=144; step++) {
        const time = TOTAL*step/144;
        const point = pathAt(stops,time);
        const x = softClamp(point.x, 8, width-24), y = softClamp(point.y, 8, height-35);
        samples.push({ offset:step/144, transform:`translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)` });
        const labelWidth = names[index].length*7+20;
        labels.push({ offset:step/144, transform:`translateX(${Math.min(18,width-x-labelWidth-8).toFixed(2)}px)` });
      }
      animate(pointer,samples,0,TOTAL,'linear');
      animate(label,labels,0,TOTAL,'linear');
      animate(pointer,[{opacity:0,offset:0},{opacity:1,offset:.04},{opacity:1,offset:.84},{opacity:0,offset:.98},{opacity:0,offset:1}],0,TOTAL,'linear');
      fragment.append(pointer);
    });

    scene!.replaceChildren(fragment);
    app.forEach(node => { node.inert = true; });
    overlay!.setAttribute('role','dialog'); overlay!.setAttribute('aria-modal','true');
    overlay!.setAttribute('aria-label','Animated portfolio introduction');
    overlay!.hidden = false;
    skip!.focus({ preventScroll:true });
    status!.textContent = 'Assembling an introduction…';
    const completion = animate(scene!,[{opacity:1},{opacity:1}],0,TOTAL,'linear');
    // Align every native animation to one clock, regardless of scene construction time.
    const epoch = Number(document.timeline.currentTime ?? 0)+32;
    animations.forEach(animation => { animation.startTime = epoch; });
    completion.finished.then(() => finish()).catch(() => {});
    timers.push(setTimeout(() => { if(active) status!.textContent='Adding the finishing touches…'; },2900));
    timers.push(setTimeout(() => finish(true),TOTAL+1800));
  }

  const safePlay = () => { void play().catch(() => { preparing=false; finish(true); }); };
  skip.addEventListener('click',() => finish(true));
  replay.addEventListener('click',safePlay);
  document.addEventListener('keydown',event => {
    if (!active && !exiting) return;
    if(event.key==='Escape') finish(true);
    if(event.key==='Tab') { event.preventDefault(); skip.focus(); }
  });
  window.addEventListener('resize',() => finish(true),{passive:true});
  window.addEventListener('pagehide',() => { generation++; finish(true); });
  document.addEventListener('visibilitychange',() => { if(document.hidden) { generation++; finish(true); } });
  const syncMotionPreference = () => {
    replay.hidden=reduced.matches;
    if(motionNote) motionNote.hidden=!reduced.matches;
    if(reduced.matches) { generation++; finish(true); }
  };
  reduced.addEventListener('change',syncMotionPreference); syncMotionPreference();
  let seen=false;
  try { seen=sessionStorage.getItem(key)==='seen'; } catch { /* No persistent storage is required. */ }
  const forceIntro=new URLSearchParams(location.search).get('intro')==='1';
  if (!reduced.matches && (forceIntro || (!seen && !location.hash && window.scrollY<20))) safePlay();
}
