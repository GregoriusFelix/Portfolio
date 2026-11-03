import { cloneLayer, textGeometry, type Snapshot } from "./swarm-dom";
import { bezier } from "./swarm-paths";
import { AGENTS, TOTAL, createCursors, cursorColor } from "./swarm-cursors";
import type { CursorTask } from "./swarm-types";
export { AGENTS, TOTAL } from "./swarm-cursors";
export type Job = { start: number; duration: number; badge: HTMLElement; rect: DOMRect; drawing: boolean; linear: boolean; scaleFrom?: number; measurement?: "x" | "y" };

export function createSwarmScene() {
  const animations: Animation[] = [];
  const jobs: Job[] = [];
  const tracks: CursorTask[][] = Array.from({ length: AGENTS }, () => []);
  const root = getComputedStyle(document.documentElement);
  const easeOut = root.getPropertyValue("--ease-out").trim();
  const easeInOut = root.getPropertyValue("--ease-in-out").trim();
  const drawCurve = [0.77, 0, 0.175, 1];
  const snapshot = (selector: string): Snapshot => {
    const source = document.querySelector<HTMLElement>(selector)!;
    return { source, rect: source.getBoundingClientRect(), style: getComputedStyle(source) };
  };
  const hero = snapshot(".hero-sheet"), first = snapshot("#hero-title > span:first-child"), second = snapshot("#hero-title > span:last-child");
  const monogram = snapshot(".monogram"), identity = snapshot(".identity-name");
  const nav = [snapshot(".site-header nav a:nth-child(1)"), snapshot(".site-header nav a:nth-child(2)"), snapshot(".site-header nav a:nth-child(3)")];
  const selection = snapshot(".name-selection"), author = snapshot(".author-tag"), button = snapshot(".primary-button");
  const label = snapshot(".hero-top > span"), replay = snapshot("#replay-intro"), role = snapshot(".hero-bottom p");
  const caption = snapshot(".hero-caption > a"), folder = snapshot(".folder-work");
  const fragment = document.createDocumentFragment();
  const build = document.createElement("div");
  build.className = "swarm-build";
  const backdrop = document.createElement("div");
  backdrop.className = "swarm-backdrop";
  build.append(backdrop);
  fragment.append(build);
  const animate = (node: Element, frames: Keyframe[], start: number, duration: number, easing = easeOut) => {
    const animation = node.animate(frames, { delay: start, duration, easing, fill: "both" });
    animations.push(animation);
    return animation;
  };
  const show = (node: Element, start: number, opacity = 1) => animate(node, [{ opacity: 0 }, { opacity }], start, 1);
  const windowOf = (node: Element, start: number, duration: number) => animate(node, [
    { opacity: 0, offset: 0 }, { opacity: 1, offset: 0.001 }, { opacity: 1, offset: 0.88 }, { opacity: 0, offset: 1 },
  ], start, duration, "linear");
  const position = (node: HTMLElement, rect: DOMRect) => Object.assign(node.style, { position: "absolute", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  const clone = (item: Snapshot) => {
    const node = cloneLayer(item);
    for (const key of ["display", "alignItems", "justifyContent", "gap", "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "color", "textAlign", "fontKerning", "fontFeatureSettings", "fontVariationSettings", "fontOpticalSizing"] as const) node.style[key] = item.style[key];
    build.append(node);
    return node;
  };
  const task = (agent: number, start: number, duration: number, label: string, tool: CursorTask["tool"], point: CursorTask["point"]) => {
    tracks[agent].push({ start, duration, label, tool, point });
  };
  function frame(rect: DOMRect, start: number, duration: number, drawing = false, linear = false, scaleFrom = 0.02) {
    const box = document.createElement("div");
    box.className = "swarm-editor-frame";
    position(box, rect);
    for (let n = 0; n < 4; n++) box.append(document.createElement("i"));
    windowOf(box, start, duration + 140);
    if (drawing) animate(box, [{ transform: `scale(${scaleFrom},${scaleFrom})` }, { transform: "scale(1,1)" }], start, duration, linear ? "linear" : easeInOut);
    const badge = document.createElement("div");
    badge.className = "swarm-dimension";
    badge.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    badge.style.left = `${rect.left}px`;
    badge.style.top = `${rect.top + 6}px`;
    const scale = drawing ? scaleFrom : 1;
    animate(badge, [{ transform: `translate(${rect.width * scale}px,${rect.height * scale}px)` }, { transform: `translate(${rect.width}px,${rect.height}px)` }], start, duration, linear ? "linear" : easeInOut);
    windowOf(badge, start, duration + 140);
    build.append(box, badge);
    jobs.push({ start, duration, badge, rect, drawing, linear, scaleFrom });
    return box;
  }
  function draw(item: Snapshot, agent: number, start: number, duration: number, name: string, paper?: string) {
    const rect = item.rect;
    const node = clone(item);
    node.style.transformOrigin = "top left";
    if (paper) {
      node.style.color = "transparent";
      node.querySelectorAll<HTMLElement>("*").forEach(child => child.style.visibility = "hidden");
    }
    show(node, start, parseFloat(item.style.opacity) || 1);
    animate(node, [{ transform: "scale(.02,.02)" }, { transform: "scale(1,1)" }], start, duration, "linear");
    frame(rect, start, duration, true, true);
    task(agent, start, duration, name, "crosshair", progress => ({ x: rect.left + rect.width * (0.02 + 0.98 * progress), y: rect.top + rect.height * (0.02 + 0.98 * progress) }));
    return node;
  }
  function outline(item: Snapshot, agent: number, start: number, duration: number, name: string) {
    if (!item.rect.width || !item.rect.height) return;
    const rect = item.rect;
    frame(rect, start, duration, true, true);
    task(agent, start, duration, name, "crosshair", progress => ({ x: rect.left + rect.width * (0.02 + 0.98 * progress), y: rect.top + rect.height * (0.02 + 0.98 * progress) }));
  }
  function type(item: Snapshot, agent: number, start: number, duration: number, name: string, paper: string, scale = 1) {
    if (!item.rect.width || !item.rect.height) return;
    const node = clone(item);
    node.style.transformOrigin = "top left";
    node.style.transform = `scale(${scale})`;
    show(node, start);
    const geometry = textGeometry(item.source);
    const origin = item.rect;
    const point = (progress: number) => geometry.steps[Math.min(geometry.steps.length - 1, Math.floor(progress * (geometry.steps.length - 1)))];
    geometry.lines.forEach((line, index) => {
      const cover = document.createElement("div");
      cover.className = "swarm-word-cover";
      Object.assign(cover.style, { left: `${line.left - origin.left - 2}px`, top: `${line.top - origin.top - 2}px`, width: `${line.width + 4}px`, height: `${line.height + 4}px` });
      const ink = document.createElement("div");
      ink.className = "swarm-word-ink";
      ink.style.background = paper;
      cover.append(ink);
      node.append(cover);
      animate(ink, geometry.steps.map((step, n) => ({ offset: n / (geometry.steps.length - 1), transform: `translateX(${step.line > index ? line.width + 4 : step.line < index ? 0 : step.x - line.left}px)`, easing: "steps(1,end)" })), start, duration, "linear");
      animate(cover, [{ opacity: 1 }, { opacity: 1, offset: 0.999 }, { opacity: 0 }], start, duration + 1, "linear");
    });
    const rect = new DOMRect(origin.left, origin.top, origin.width * scale, origin.height * scale);
    frame(rect, start, duration);
    task(agent, start, duration, name, "ibeam", progress => {
      const step = point(progress);
      return { x: origin.left + (step.x - origin.left) * scale, y: origin.top + (step.y - origin.top) * scale };
    });
    return node;
  }
  function inspect(item: Snapshot, agent: number, start: number, duration: number, name: string, vertical = false) {
    if (!item.rect.width || !item.rect.height || item.rect.top >= innerHeight) return;
    const rect = item.rect;
    const color = cursorColor(agent);
    const box = frame(rect, start, duration);
    box.style.borderColor = color;
    box.querySelectorAll<HTMLElement>("i").forEach(handle => handle.style.borderColor = color);
    const job = jobs.at(-1)!;
    job.drawing = true;
    job.scaleFrom = 0;
    job.measurement = vertical ? "y" : "x";
    Object.assign(job.badge.style, { background: "var(--color-paper)", color: "var(--color-ink)", borderColor: color });
    animate(job.badge, [
      { transform: `translate(${vertical ? rect.width : 0}px,${vertical ? 0 : rect.height}px)` },
      { transform: `translate(${rect.width}px,${rect.height}px)` },
    ], start, duration, easeInOut);
    const line = document.createElement("div");
    line.className = "swarm-measure-line";
    Object.assign(line.style, { left: `${vertical ? rect.right : rect.left}px`, top: `${vertical ? rect.top : rect.bottom}px`, width: `${vertical ? 2 : rect.width}px`, height: `${vertical ? rect.height : 2}px`, background: color });
    animate(line, [{ transform: vertical ? "scaleY(.001)" : "scaleX(.001)" }, { transform: vertical ? "scaleY(1)" : "scaleX(1)" }], start, duration, easeInOut);
    windowOf(line, start, duration + 140);
    build.append(line);
    task(agent, start, duration, name, "crosshair", progress => ({
      x: vertical ? rect.right : rect.left + rect.width * bezier(progress, drawCurve),
      y: vertical ? rect.top + rect.height * bezier(progress, drawCurve) : rect.bottom,
    }));
  }
  function duplicate(item: Snapshot, destination: Snapshot, agent: number, start: number, duration: number, name: string, hold = 0) {
    const clip = document.createElement("div");
    clip.className = "swarm-duplicate-clip";
    position(clip, hero.rect);
    const copy = cloneLayer(item);
    for (const key of ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "color"] as const) copy.style[key] = item.style[key];
    copy.classList.add("swarm-duplicate-text");
    copy.style.left = `${item.rect.left - hero.rect.left}px`;
    copy.style.top = `${item.rect.top - hero.rect.top}px`;
    clip.append(copy);
    build.append(clip);
    const dx = destination.rect.left - item.rect.left, dy = destination.rect.top - item.rect.top;
    animate(copy, [{ transform: "translate(0px,0px)" }, { transform: `translate(${dx}px,${dy}px)` }], start, duration, easeInOut);
    windowOf(clip, start, duration + hold);
    const x = item.rect.left + Math.min(32, item.rect.width * 0.2), y = item.rect.top + Math.min(25, item.rect.height * 0.35);
    task(agent, start, duration, name, "arrow", progress => { const amount = bezier(progress, drawCurve); return { x: x + dx * amount, y: y + dy * amount }; });
  }

  const mark = document.createElement("div");
  mark.className = "swarm-mark swarm-scan-mark";
  mark.textContent = "gf.";
  mark.style.left = `${innerWidth / 2}px`;
  mark.style.top = `${innerHeight / 2}px`;
  windowOf(mark, 0, 950);
  build.append(mark);
  for (const axis of ["horizontal", "vertical"]) {
    const ruler = document.createElement("div");
    ruler.className = `swarm-editor-ruler swarm-editor-ruler-${axis}`;
    for (let n = 100; n < (axis === "horizontal" ? innerWidth : innerHeight); n += 100) {
      const tick = document.createElement("span");
      tick.textContent = String(n);
      tick.style[axis === "horizontal" ? "left" : "top"] = `${n}px`;
      ruler.append(tick);
    }
    windowOf(ruler, 900, 1490);
    build.append(ruler);
  }
  const guide = document.createElement("div");
  guide.className = "swarm-alignment-guide";
  guide.style.left = `${selection.rect.left}px`;
  windowOf(guide, 1180, 3900);
  build.append(guide);

  const surface = draw(hero, 0, 1180, 360, "Draw blue surface", "var(--color-field)");
  const logo = clone(monogram);
  show(logo, 1140);
  outline(monogram, 3, 1080, 260, "Frame monogram");
  outline(identity, 7, 1130, 180, "Frame identity");
  type(identity, 7, 1330, 420, "Type identity", "var(--color-paper)");
  outline(nav[0], 4, 1210, 120, "Frame first link");
  type(nav[0], 4, 1350, 180, "Type Work", "var(--color-paper)");
  const navCopy = (destination: Snapshot, agent: number, start: number, duration: number) => {
    const copy = clone(nav[0]);
    copy.style.border = "1px solid var(--color-tool-duplicate)";
    const dx = destination.rect.left - nav[0].rect.left;
    animate(copy, [{ transform: "translateX(0px)" }, { transform: `translateX(${dx}px)` }], start, duration, easeInOut);
    windowOf(copy, start, duration + 150);
    task(agent, start, duration, "Duplicate navigation link", "arrow", progress => ({ x: nav[0].rect.left + dx * bezier(progress, drawCurve), y: nav[0].rect.top + nav[0].rect.height / 2 }));
    frame(destination.rect, start + duration - 80, 160);
  };
  navCopy(nav[1], 8, 1660, 280);
  navCopy(nav[2], 9, 1880, 340);
  type(nav[1], 8, 2120, 260, "Replace About label", "var(--color-paper)");
  type(nav[2], 9, 2470, 260, "Replace Contact label", "var(--color-paper)");
  if (folder.rect.top < innerHeight) draw({ ...folder, rect: new DOMRect(folder.rect.left, folder.rect.top, folder.rect.width, Math.min(folder.rect.height, innerHeight - folder.rect.top - 16)) }, 13, 1450, 650, "Build first folder");
  type(caption, 0, 1650, 280, "Type folder link", "var(--color-paper)");

  const small = 18 / parseFloat(first.style.fontSize);
  const smallTitle = { ...first, rect: new DOMRect(first.rect.left, first.rect.top, first.rect.width * small, first.rect.height * small) };
  outline(smallTitle, 1, 2220, 140, "Frame title text");
  const firstTitle = type(first, 1, 2360, 260, "Type Gregorius", "var(--color-field)", small)!;
  animate(firstTitle, [{ transform: `scale(${small})` }, { transform: "scale(1)" }], 2650, 430, "linear");
  frame(first.rect, 2650, 430, true, true, small);
  task(1, 2650, 430, "Enlarge title by corner handle", "arrow", progress => {
    const scale = small + (1 - small) * progress;
    return { x: first.rect.left + first.rect.width * scale, y: first.rect.top + first.rect.height * scale };
  });
  outline(label, 10, 2180, 220, "Frame Portfolio label");
  type(label, 10, 2490, 230, "Type Portfolio label", "var(--color-field)");
  draw(replay, 11, 2230, 300, "Draw replay control", "var(--color-field)");
  type(replay, 11, 2780, 320, "Type replay control", "var(--color-field)");
  outline(role, 12, 2240, 220, "Frame role");
  type(role, 12, 2640, 280, "Type software engineer", "var(--color-field)");
  const selectionNode = draw(selection, 5, 2390, 390, "Draw title selection");
  selectionNode.style.opacity = selection.style.opacity;
  draw(author, 6, 2320, 160, "Draw author tag", "var(--color-field-ink)");
  type(author, 6, 2830, 240, "Type author tag", "var(--color-field-ink)");
  draw(button, 2, 2220, 300, "Draw portfolio button", "var(--color-field-ink)");
  const buttonText = type(button, 2, 2920, 380, "Type portfolio button", "var(--color-field-ink)")!;
  buttonText.querySelectorAll<HTMLElement>('[aria-hidden="true"]').forEach(node => show(node, 3300));
  inspect(button, 6, 3160, 170, "Place button icon", true);

  duplicate(first, second, 1, 3450, 640, "Duplicate title into second line", 500);
  type(second, 2, 4590, 340, "Replace duplicate with Felix", "var(--color-field)");
  const checks: [Snapshot, number, number, string][] = [
    [monogram, 3, 3650, "Check logo size"], [identity, 7, 3870, "Check identity alignment"],
    [nav[0], 4, 3670, "Check Work spacing"], [nav[1], 8, 3890, "Check About spacing"],
    [nav[2], 9, 4140, "Check Contact spacing"], [label, 10, 3540, "Check label alignment"],
    [replay, 11, 3830, "Check replay bounds"], [role, 12, 3910, "Check role baseline"],
    [author, 6, 4750, "Check author tag bounds"], [button, 0, 4210, "Check button size"],
    [selection, 5, 4400, "Measure title alignment"], [caption, 13, 4320, "Check folder caption"],
  ];
  checks.forEach(([item, agent, start, name]) => inspect(item, agent, start, Math.min(260, 5000 - start), name, agent % 2 === 0));
  const bounds = hero.rect;
  const panelWindow = `path(evenodd, "M0 0H${innerWidth}V${innerHeight}H0Z M${bounds.left} ${bounds.top}H${bounds.right}V${bounds.bottom}H${bounds.left}Z")`;
  animate(backdrop, [{ clipPath: "none" }, { clipPath: panelWindow }], 1540, 1, "steps(1,end)");
  animate(surface, [{ opacity: 1 }, { opacity: 0 }], 1540, 1, "steps(1,end)");
  animate(build, [{ opacity: 1 }, { opacity: 0 }], TOTAL, 150);
  const cursors = createCursors(tracks, { x: innerWidth, y: innerHeight }, TOTAL);
  for (const child of hero.source.children) {
    animate(child, [{ visibility: "hidden" }, { visibility: "hidden", offset: 0.999 }, { visibility: "visible" }], 0, TOTAL, "steps(1,end)");
  }
  fragment.append(cursors.fragment);
  animations.push(...cursors.animations);
  return { fragment, animations, jobs, contentDuration: TOTAL, duration: cursors.duration, drawCurve };
}
