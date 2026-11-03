type Glyph = { text: string; x: number; y: number; font: string; color: string };
type TextTask = { glyphs: Glyph[]; x: number; y: number; w: number; h: number; start: number; duration: number };
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => 1 - Math.pow(1 - clamp(n), 3);

export function initSwarmIntro() {
  const overlay = document.querySelector<HTMLElement>('#swarm-intro');
  const canvas = document.querySelector<HTMLCanvasElement>('#swarm-canvas');
  const skip = document.querySelector<HTMLButtonElement>('#skip-intro');
  const replay = document.querySelector<HTMLButtonElement>('#replay-intro');
  const status = document.querySelector<HTMLElement>('#intro-status');
  if (!overlay || !canvas || !skip || !replay || !status) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const app = Array.from(document.querySelectorAll<HTMLElement>('body > header, body > main, body > footer, body > .skip-link'));
  let active = false;
  let frame = 0;
  let deadline: ReturnType<typeof setTimeout>;
  let exitAnimation: Animation | undefined;
  let previousFocus: HTMLElement | null = null;
  let inertBefore: boolean[] = [];
  let savedOverflow = '';
  let generation = 0;
  const key = 'felix-portfolio:intro-v1';
  const remember = () => { try { sessionStorage.setItem(key, 'seen'); } catch { /* Storage is optional in private contexts. */ } };
  const hide = () => {
    overlay.hidden = true;
    overlay.style.opacity = '';
    app.forEach((el, i) => { el.inert = inertBefore[i] ?? false; });
    document.body.style.overflowY = savedOverflow;
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
  };
  const finish = (immediate = false) => {
    if (!active) return;
    active = false;
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    generation++;
    remember();
    status.textContent = 'Introduction complete.';
    if (immediate || reduced.matches) hide();
    else {
      exitAnimation = overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' });
      exitAnimation.finished.then(() => { hide(); exitAnimation?.cancel(); }).catch(hide);
    }
  };

  function snapshot(element: Element): Glyph[] {
    const glyphs: Glyph[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('[aria-hidden="true"], [hidden]')) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const value = node.textContent ?? '';
      let offset = 0;
      for (const char of value) {
        range.setStart(node, offset);
        offset += char.length;
        range.setEnd(node, offset);
        const rect = range.getBoundingClientRect();
        if (!char.trim() || !rect.width || rect.bottom < 0 || rect.top > innerHeight) continue;
        glyphs.push({ text: char, x: rect.x, y: rect.y + rect.height / 2, font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, color: style.color });
      }
    }
    return glyphs;
  }

  async function play() {
    if (active || exitAnimation?.playState === 'running') return;
    if (reduced.matches) { status.textContent = 'Motion is reduced in your device settings.'; return; }
    if (document.visibilityState === 'hidden') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 900))]);
    if (active || reduced.matches || document.visibilityState === 'hidden') return;
    active = true;
    const thisGeneration = ++generation;
    previousFocus = document.activeElement as HTMLElement;
    savedOverflow = document.body.style.overflowY;
    document.body.style.overflowY = 'hidden';
    inertBefore = app.map(el => el.inert);
    app.forEach(el => { el.inert = true; });
    overlay!.hidden = false;
    overlay!.setAttribute('role', 'dialog');
    overlay!.setAttribute('aria-modal', 'true');
    overlay!.setAttribute('aria-label', 'Animated portfolio introduction');
    skip!.focus({ preventScroll: true });
    status!.textContent = 'Assembling an introduction…';
    const width = innerWidth, height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas!.width = Math.round(width * dpr);
    canvas!.height = Math.round(height * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const paper = token('--color-paper'), blue = token('--color-field'), ink = token('--color-ink');
    const white = token('--color-field-ink');
    const colors = [token('--color-cursor-1'), token('--color-cursor-2'), token('--color-cursor-3'), white];
    const family = styles.getPropertyValue('--font-body').trim();
    const hero = document.querySelector<HTMLElement>('.hero-sheet')!;
    const box = hero.getBoundingClientRect();
    const blocks: [string, number, number][] = [
      ['.site-header', 1050, 650], ['.hero-top', 1550, 500],
      ['#hero-title > span:first-child', 1850, 650], ['#hero-title > span:last-child', 2200, 750],
      ['.hero-bottom', 2900, 650], ['.hero-caption', 3400, 450],
    ];
    const tasks: TextTask[] = blocks.map(([selector, start, duration]) => {
      const el = document.querySelector(selector)!;
      const r = el.getBoundingClientRect();
      return { glyphs: snapshot(el), x: r.x, y: r.y, w: r.width, h: r.height, start, duration };
    });
    // Geometry and glyphs are measured once; the animation never reads layout per frame.
    const buttons = Array.from(hero.querySelectorAll<HTMLElement>('.primary-button')).map(el => ({ rect: el.getBoundingClientRect(), color: getComputedStyle(el).backgroundColor }));
    const selection = document.querySelector('.name-selection')!.getBoundingClientRect();
    const bottomBoxes = Array.from(document.querySelectorAll<HTMLElement>('.folder-body, .folder-tab')).map(el => ({ rect: el.getBoundingClientRect(), color: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el).color, glyphs: snapshot(el) })).filter(item => item.rect.top < height);
    const started = performance.now();
    const center = { x: width / 2, y: height / 2 };
    const labels = ['Layout', 'Type', 'Type', 'Details', 'Layout', 'Felix'];
    const cursor = (x: number, y: number, index: number, opacity: number) => {
      ctx!.save(); ctx!.globalAlpha = opacity; ctx!.translate(x, y);
      ctx!.fillStyle = colors[index % colors.length]; ctx!.strokeStyle = ink; ctx!.lineWidth = 1.4;
      ctx!.beginPath(); ctx!.moveTo(0, 0); ctx!.lineTo(0, 20); ctx!.lineTo(5, 15); ctx!.lineTo(10, 25); ctx!.lineTo(14, 23); ctx!.lineTo(9, 13); ctx!.lineTo(17, 13); ctx!.closePath(); ctx!.fill(); ctx!.stroke();
      ctx!.font = `600 11px ${family}`;
      const label = labels[index], labelWidth = ctx!.measureText(label).width + 14;
      ctx!.fillRect(19, 23, labelWidth, 20); ctx!.fillStyle = ink; ctx!.textBaseline = 'middle'; ctx!.fillText(label, 26, 33);
      ctx!.restore();
    };
    const draw = (now: number) => {
      if (!active || thisGeneration !== generation) return;
      const time = now - started;
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = paper; ctx!.fillRect(0, 0, width, height);
      if (time < 900) {
        ctx!.globalAlpha = 1 - clamp((time - 600) / 250);
        ctx!.fillStyle = ink; ctx!.font = `800 56px ${family}`; ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.fillText('gf.', center.x, center.y);
        ctx!.textAlign = 'left'; ctx!.globalAlpha = 1;
      }
      const build = ease((time - 720) / 1000);
      if (build > 0) {
        ctx!.fillStyle = blue;
        ctx!.fillRect(box.x, box.y, box.width * build, box.height * build);
        ctx!.strokeStyle = ink; ctx!.lineWidth = 1;
        if (build < 1) {
          ctx!.setLineDash([4, 4]); ctx!.strokeRect(box.x, box.y, box.width * build, box.height * build); ctx!.setLineDash([]);
          ctx!.fillStyle = ink; ctx!.font = `400 12px ${family}`; ctx!.fillText(`${Math.round(box.width * build)} × ${Math.round(box.height * build)}`, box.x + 8, box.y - 10);
        }
      }
      if (time > 2850) buttons.forEach(button => { ctx!.fillStyle = button.color; const r = button.rect; ctx!.fillRect(r.x, r.y, r.width, r.height); });
      tasks.forEach(task => {
        const progress = clamp((time - task.start) / task.duration);
        if (!progress) return;
        const count = Math.floor(task.glyphs.length * progress);
        for (const glyph of task.glyphs.slice(0, count)) { ctx!.font = glyph.font; ctx!.fillStyle = glyph.color; ctx!.textBaseline = 'middle'; ctx!.fillText(glyph.text, glyph.x, glyph.y); }
        if (progress < 1 && count > 0) { const g = task.glyphs[count - 1]; ctx!.fillStyle = g.color; ctx!.fillRect(g.x + ctx!.measureText(g.text).width + 2, g.y - task.h * 0.3, 2, Math.min(task.h * 0.6, 90)); }
      });
      if (time > 1750 && time < 3900) {
        ctx!.strokeStyle = white; ctx!.globalAlpha = 0.6; ctx!.lineWidth = 1; ctx!.strokeRect(selection.x, selection.y, selection.width * ease((time - 1750) / 500), selection.height);
        if (time > 2250) for (const x of [selection.left, selection.right]) for (const y of [selection.top, selection.bottom]) { ctx!.fillStyle = white; ctx!.fillRect(x - 3, y - 3, 6, 6); }
        ctx!.globalAlpha = 1;
      }
      if (time > 3600) bottomBoxes.forEach(item => { const r = item.rect; ctx!.fillStyle = item.color; ctx!.fillRect(r.x, r.y, r.width, r.height); for (const g of item.glyphs) { ctx!.font = g.font; ctx!.fillStyle = g.color; ctx!.fillText(g.text, g.x, g.y); } });
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3 + time / 450;
        const orbit = { x: center.x + Math.cos(angle) * 90, y: center.y + Math.sin(angle) * 65 };
        let target = { x: box.x + box.width * build, y: box.y + box.height * build };
        if (i > 0) {
          const task = tasks[(i - 1) % tasks.length];
          const progress = clamp((time - task.start) / task.duration);
          const g = task.glyphs[Math.max(0, Math.floor((task.glyphs.length - 1) * progress))];
          target = g ? { x: g.x + 14, y: g.y + 12 } : { x: task.x, y: task.y };
        }
        const fan = ease((time - 650 - i * 65) / 700);
        const leave = ease((time - 3950) / 450);
        const x = orbit.x + (target.x - orbit.x) * fan + (i % 2 ? 1 : -1) * leave * width * 0.15;
        const y = orbit.y + (target.y - orbit.y) * fan + leave * 100;
        cursor(x, y, i, 1 - leave);
      }
      if (time > 2900 && status!.textContent !== 'Adding the finishing touches…') status!.textContent = 'Adding the finishing touches…';
      if (time >= 4450) { finish(); return; }
      frame = requestAnimationFrame(draw);
    };
    deadline = setTimeout(() => finish(true), 6500);
    frame = requestAnimationFrame(draw);
  }
  skip.addEventListener('click', () => finish(true));
  document.addEventListener('keydown', event => { if (!active) return; if (event.key === 'Escape') finish(true); if (event.key === 'Tab') { event.preventDefault(); skip.focus(); } });
  window.addEventListener('resize', () => finish(true), { passive: true });
  window.addEventListener('pagehide', () => finish(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(true); });
  reduced.addEventListener('change', () => { replay.hidden = reduced.matches; if (reduced.matches) finish(true); });
  replay.hidden = reduced.matches;
  replay.addEventListener('click', () => { void play().catch(() => finish(true)); });
  let seen = false;
  try { seen = sessionStorage.getItem(key) === 'seen'; } catch { /* A blocked storage API must not block the page. */ }
  if (!seen && !location.hash && !reduced.matches && window.scrollY < 20) void play().catch(() => finish(true));
}
