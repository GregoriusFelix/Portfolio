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
  const editable = new Map<HTMLElement, HTMLElement>();
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
  const compactDialogs = matchMedia("(max-width: 760px)").matches;
  const viewportWidth = document.documentElement.clientWidth;
  const dialogTop = Math.max(24, hero.rect.top + 12);
  const dialogScale = compactDialogs
    ? Math.min(0.74, (viewportWidth - 24) / 320, (innerHeight - dialogTop - 80) / 530)
    : 1;
  const editorTop = dialogTop + 304 * dialogScale + 12;
  const fragment = document.createDocumentFragment();
  const mountDialog = (node: HTMLElement, left: number, top: number, width: number, height: number) => {
    Object.assign(node.style, { left: "0px", top: "0px", width: `${width}px` });
    const frame = document.createElement("div");
    frame.className = "swarm-dialog-frame";
    Object.assign(frame.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, transform: `scale(${dialogScale})` });
    frame.append(node);
    fragment.append(frame);
    return (x: number, y: number) => ({ x: left + x * dialogScale, y: top + y * dialogScale });
  };
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
    editable.set(item.source, node);
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
  function type(item: Snapshot, agent: number, start: number, duration: number, name: string, paper: string, scale = 1) {
    if (!item.rect.width || !item.rect.height) return;
    const node = clone(item);
    node.style.transformOrigin = "top left";
    node.style.transform = `scale(${scale})`;
    show(node, start);
    editable.set(item.source, node);
    const geometry = textGeometry(item.source);
    const origin = item.rect;
    const point = (progress: number) => {
      const position = progress * (geometry.steps.length - 1);
      const index = Math.min(geometry.steps.length - 1, Math.floor(position));
      const from = geometry.steps[index], to = geometry.steps[Math.min(index + 1, geometry.steps.length - 1)];
      const amount = position - index;
      return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount };
    };
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

  function portfolioLabel() {
    const lines = Array.from(identity.source.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent!.trim()).filter(Boolean);
    const measure = document.createElement("canvas").getContext("2d")!;
    const mobileSource = !identity.rect.width;
    let fontSize = mobileSource ? 9 : parseFloat(identity.style.fontSize);
    const setFont = () => { measure.font = `${identity.style.fontWeight} ${fontSize}px ${identity.style.fontFamily}`; };
    setFont();
    if (mobileSource) {
      const available = Math.max(48, nav[0].rect.left - monogram.rect.right - 16);
      fontSize *= Math.min(1, available / Math.max(...lines.map(line => measure.measureText(line).width)));
      setFont();
    }
    const widths = lines.map(line => measure.measureText(line).width);
    const lineHeight = mobileSource ? fontSize * 1.25 : parseFloat(identity.style.lineHeight);
    const sourceRect = mobileSource
      ? new DOMRect(monogram.rect.right + 8, monogram.rect.top + (monogram.rect.height - lineHeight * lines.length) / 2, Math.max(...widths), lineHeight * lines.length)
      : identity.rect;
    const destination = { x: label.rect.left, y: label.rect.top };
    const move = { x: destination.x - sourceRect.left, y: destination.y - sourceRect.top };
    const opacity = (node: Element, frames: Keyframe[]) => animate(node, frames, 0, TOTAL, "linear");
    const visibleBetween = (node: Element, start: number, end: number) => opacity(node, [
      { offset: 0, opacity: 0, easing: "steps(1,end)" },
      { offset: start / TOTAL, opacity: 1, easing: "steps(1,end)" },
      { offset: end / TOTAL, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    const identityCopy = () => {
      const node = clone(identity);
      Object.assign(node.style, { display: "block", left: `${sourceRect.left}px`, top: `${sourceRect.top}px`, width: `${sourceRect.width}px`, height: `${sourceRect.height}px`, fontSize: `${fontSize}px`, lineHeight: `${lineHeight}px` });
      return node;
    };
    if (mobileSource) {
      const source = identityCopy();
      source.dataset.swarmPortfolioSource = "true";
      visibleBetween(source, 1330, 2800);
    }
    const copy = identityCopy();
    copy.dataset.swarmPortfolioCopy = "original";
    const recolored = identityCopy();
    recolored.style.color = label.style.color;
    recolored.dataset.swarmPortfolioCopy = "recolored";
    for (const node of [copy, recolored]) animate(node, [{ transform: "translate(0px,0px)" }, { transform: `translate(${move.x}px,${move.y}px)` }], 2060, 480, easeInOut);
    opacity(copy, [
      { offset: 0, opacity: 0, easing: "steps(1,end)" },
      { offset: 2060 / TOTAL, opacity: 1 },
      { offset: 2860 / TOTAL, opacity: 1, easing: easeOut },
      { offset: 3020 / TOTAL, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    opacity(recolored, [
      { offset: 0, opacity: 0, easing: "steps(1,end)" },
      { offset: 2860 / TOTAL, opacity: 0, easing: easeOut },
      { offset: 3020 / TOTAL, opacity: 1, easing: "steps(1,end)" },
      { offset: 3900 / TOTAL, opacity: 0 },
      { offset: 1, opacity: 0 },
    ]);
    const from = { x: sourceRect.left + 8, y: sourceRect.top + lineHeight / 2 };
    const to = { x: destination.x + 8, y: destination.y + lineHeight / 2 };
    task(7, 1900, 100, "Select identity to duplicate", "arrow", () => from);
    task(7, 2060, 480, "Duplicate full identity below header", "arrow", progress => {
      const amount = bezier(progress, drawCurve);
      return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount };
    });
    const colors = document.createElement("div");
    colors.className = "swarm-portfolio-colors";
    colors.dataset.swarmPortfolioColors = "true";
    Object.assign(colors.style, { left: `${destination.x}px`, top: `${destination.y + sourceRect.height + 5}px` });
    colors.innerHTML = `<i></i><i></i>`;
    (colors.firstElementChild as HTMLElement).style.background = identity.style.color;
    (colors.lastElementChild as HTMLElement).style.background = label.style.color;
    build.append(colors);
    visibleBetween(colors, 2740, 3160);
    task(7, 2860, 120, "Change copied identity to light text", "arrow", () => ({ x: destination.x + 37, y: destination.y + sourceRect.height + 18 }));
    widths.forEach((width, index) => {
      const highlight = document.createElement("div");
      highlight.className = "swarm-portfolio-highlight";
      highlight.dataset.swarmPortfolioHighlight = String(index);
      Object.assign(highlight.style, { left: `${destination.x}px`, top: `${destination.y + index * lineHeight}px`, width: `${width}px`, height: `${lineHeight}px` });
      build.append(highlight);
      visibleBetween(highlight, 3330, 3900);
      animate(highlight, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], index === 0 ? 3330 : 3499, index === 0 ? 104 : 91, "linear");
    });
    const end = { x: destination.x + widths.at(-1)!, y: destination.y + lineHeight * (lines.length - 0.5) };
    task(7, 3330, 260, "Select all copied name text", "ibeam", progress => {
      if (progress < 0.4) return { x: destination.x + widths[0] * progress / 0.4, y: to.y };
      if (progress < 0.65) {
        const amount = (progress - 0.4) / 0.25;
        return { x: destination.x + widths[0] * (1 - amount), y: to.y + (end.y - to.y) * amount };
      }
      return { x: destination.x + widths.at(-1)! * (progress - 0.65) / 0.35, y: end.y };
    });
    task(7, 3900, 100, "Delete selected identity text", "ibeam", () => end);
    const caret = document.createElement("div");
    caret.className = "swarm-portfolio-caret";
    Object.assign(caret.style, { left: `${label.rect.left}px`, top: `${label.rect.top}px`, height: `${label.rect.height}px` });
    build.append(caret);
    visibleBetween(caret, 3900, 4760);
    const result = clone(label);
    result.replaceChildren();
    result.dataset.swarmPortfolioLabel = "true";
    editable.set(label.source, result);
    const text = label.source.textContent!.trim();
    measure.font = `${label.style.fontWeight} ${label.style.fontSize} ${label.style.fontFamily}`;
    const advances = [0, ...Array.from(text, (_, index) => measure.measureText(text.slice(0, index + 1)).width)];
    animate(caret, advances.map((advance, index) => ({ offset: index / text.length, transform: `translateX(${advance}px)`, easing: "steps(1,end)" })), 4240, 520, "linear");
    Array.from(text).forEach((letter, index) => {
      const glyph = document.createElement("span");
      glyph.textContent = letter;
      result.append(glyph);
      const start = 4240 + (index + 1) / text.length * 520;
      opacity(glyph, [{ offset: 0, opacity: 0, easing: "steps(1,end)" }, { offset: start / TOTAL, opacity: 1 }, { offset: 1, opacity: 1 }]);
    });
    task(7, 4240, 520, "Replace copied name with Portfolio", "ibeam", progress => {
      const position = progress * text.length;
      const index = Math.min(text.length - 1, Math.floor(position));
      return { x: label.rect.left + advances[index] + (advances[index + 1] - advances[index]) * (position - index), y: label.rect.top + label.rect.height / 2 };
    });
    jobs.push({ start: 1900, duration: 2860, badge: result, rect: label.rect, drawing: false, linear: false });
  }

  function codeRole() {
    const viewportWidth = document.documentElement.clientWidth;
    const width = compactDialogs ? 320 : Math.min(480, viewportWidth - 24);
    const compact = matchMedia("(max-width: 760px)").matches;
    const editorHeight = compact ? 210 : 260;
    const lineHeight = compact ? 18 : 22;
    const firstLine = compact ? 49 : 63;
    const left = Math.max(12, Math.min(viewportWidth - width * dialogScale - 12, role.rect.left));
    const aboveRole = role.rect.top - editorHeight * dialogScale - 12;
    const belowRole = Math.max(editorTop, role.rect.bottom + 12);
    const closeBeforeOutput = compact && aboveRole < editorTop && belowRole + editorHeight * dialogScale > innerHeight - 64;
    const top = compact
      ? aboveRole >= editorTop ? aboveRole : Math.min(belowRole, innerHeight - editorHeight * dialogScale - 64)
      : Math.max(32, Math.min(innerHeight - editorHeight - 24, role.rect.top - editorHeight - 24));
    const content = role.source.textContent!.trim();
    const editor = document.createElement("div");
    editor.className = "swarm-code-editor";
    editor.dataset.swarmCodeEditor = "true";
    editor.setAttribute("aria-hidden", "true");
    editor.innerHTML = `<div class="swarm-code-header"><span>main.cpp</span><span class="swarm-code-run"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 2 6 4-6 4Z"/></svg>Run</span></div><div class="swarm-code-body"></div><div class="swarm-code-footer"><span>C++ | UTF-8</span><span class="swarm-code-status"><span class="swarm-code-ready">Ready</span><span class="swarm-code-running">Running...</span><span class="swarm-code-success">Output updated</span></span></div>`;
    const editorPoint = mountDialog(editor, left, top, width, editorHeight);
    animate(editor, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0px)" }], 3520, 180);
    animate(editor, [{ opacity: 1, transform: "translateY(0px)" }, { opacity: 0, transform: "translateY(4px)" }], closeBeforeOutput ? 5300 : 5880, closeBeforeOutput ? 120 : 160).effect!.updateTiming({ fill: "forwards" });
    const opener = document.createElement("div");
    opener.className = "swarm-code-opener";
    opener.textContent = "</>";
    Object.assign(opener.style, { left: `${role.rect.left}px`, top: `${role.rect.top - 4}px` });
    windowOf(opener, 3000, 560);
    build.append(opener);
    task(12, 3400, 120, "Open role code editor", "arrow", () => ({ x: role.rect.left + 18, y: role.rect.top + 12 }));
    const canvas = document.createElement("canvas");
    const measure = canvas.getContext("2d")!;
    measure.font = `12px Consolas, "Courier New", monospace`;
    const glyphWidth = measure.measureText("M").width;
    const sourceLeft = compact ? 32 : 46;
    const lines = [
      "#include <iostream>",
      "using namespace std;",
      "",
      "int main() {",
      '    cout << "Software Engineer" <<endl;',
      "    return 0;",
      "}",
    ];
    const totalUnits = lines.reduce((sum, line) => sum + line.length, 0) + (lines.length - 1) * 16;
    const stops = [{ unit: 0, ...editorPoint(sourceLeft, firstLine) }];
    const reveal = (node: Element, time: number) => animate(node, [
      { opacity: 0, offset: 0, easing: "steps(1,end)" },
      { opacity: 1, offset: time / TOTAL },
      { opacity: 1, offset: 1 },
    ], 0, TOTAL, "linear");
    let unit = 0;
    lines.forEach((line, index) => {
      const row = document.createElement("div");
      row.className = "swarm-code-line";
      const number = document.createElement("span");
      number.className = "swarm-code-line-number";
      number.textContent = String(index + 1);
      const source = document.createElement("code");
      source.className = index > 1 ? "swarm-code-source" : "swarm-code-source swarm-code-tag";
      row.append(number, source);
      editor.querySelector(".swarm-code-body")!.append(row);
      if (index > 0) {
        unit += 16;
        stops.push({ unit, ...editorPoint(sourceLeft, firstLine + index * lineHeight) });
      }
      Array.from(line).forEach((letter, column) => {
        const glyph = document.createElement("span");
        glyph.textContent = letter;
        source.append(glyph);
        reveal(glyph, 3900 + unit / totalUnits * 1260);
        unit++;
        stops.push({ unit, ...editorPoint(sourceLeft + (column + 1) * glyphWidth, firstLine + index * lineHeight) });
      });
    });
    task(12, 3750, 100, "Focus role source", "ibeam", () => stops[0]);
    task(12, 3900, 1260, "Type role C++", "ibeam", progress => {
      const position = progress * totalUnits;
      let index = 0;
      while (index < stops.length - 2 && position > stops[index + 1].unit) index++;
      const from = stops[index], to = stops[index + 1];
      const amount = Math.min(1, Math.max(0, (position - from.unit) / (to.unit - from.unit)));
      return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount };
    });
    const run = editor.querySelector(".swarm-code-run")!;
    task(12, 5300, 120, "Run role C++", "arrow", () => editorPoint(width - 40, compact ? 16 : 19));
    animate(run, [{ transform: "scale(1)" }, { transform: "scale(.97)", offset: 0.5 }, { transform: "scale(1)" }], 5300, 120);
    const output = clone(role);
    output.textContent = content;
    output.dataset.swarmCodeOutput = "true";
    editable.set(role.source, output);
    animate(output, [{ opacity: 0 }, { opacity: 1 }], 5420, 160);
    reveal(editor.querySelector(".swarm-code-success")!, 5420);
    animate(editor.querySelector(".swarm-code-running")!, [
      { opacity: 0, offset: 0, easing: "steps(1,end)" },
      { opacity: 1, offset: 5300 / TOTAL, easing: "steps(1,end)" },
      { opacity: 0, offset: 5420 / TOTAL },
      { opacity: 0, offset: 1 },
    ], 0, TOTAL, "linear");
    animate(editor.querySelector(".swarm-code-ready")!, [
      { opacity: 1, offset: 0, easing: "steps(1,end)" },
      { opacity: 0, offset: 5300 / TOTAL },
      { opacity: 0, offset: 1 },
    ], 0, TOTAL, "linear");
    jobs.push({ start: 3400, duration: 2180, badge: editor, rect: role.rect, drawing: false, linear: false });
  }

  function finishDetails() {
    const viewportWidth = document.documentElement.clientWidth;
    const fadeOut = (node: Element, start: number, duration = 220) => {
      animate(node, [{ opacity: 1 }, { opacity: 0 }], start, duration).effect!.updateTiming({ fill: "forwards" });
    };
    const panel = (title: string, point: { x: number; y: number }, start: number, duration: number, width = 160) => {
      const node = document.createElement("div");
      node.className = "swarm-property-panel";
      node.style.left = `${Math.max(12, Math.min(viewportWidth - width - 12, point.x))}px`;
      node.style.top = `${Math.max(28, Math.min(innerHeight - 132, point.y))}px`;
      node.style.width = `${width}px`;
      const heading = document.createElement("span");
      heading.className = "swarm-property-heading";
      heading.textContent = title;
      node.append(heading);
      windowOf(node, start, duration);
      build.append(node);
      return node;
    };
    const register = (node: HTMLElement, rect: DOMRect, start: number, duration: number) => {
      jobs.push({ start, duration, badge: node, rect, drawing: false, linear: false });
    };
    const dialogWidth = compactDialogs ? 260 : Math.min(260, viewportWidth - 32);
    const dialogX = Math.max(16, Math.min(viewportWidth - dialogWidth * dialogScale - 16, hero.rect.right - dialogWidth * dialogScale - 12));
    const dialogY = compactDialogs ? dialogTop : Math.max(32, Math.min(innerHeight - 320, hero.rect.top + 64));
    const wellWidth = dialogWidth - 54;
    const field = { x: 14, y: 44 };
    const hueX = field.x + wellWidth + 18;
    const chosen = { x: wellWidth * 0.691, y: 120 * 0.467 };
    const picker = document.createElement("div");
    picker.className = "swarm-color-dialog";
    picker.dataset.swarmColorDialog = "true";
    picker.setAttribute("aria-hidden", "true");
    picker.innerHTML = `<div class="swarm-color-title">Choose a custom color</div><div class="swarm-color-fields"><div class="swarm-color-well"><span class="swarm-color-well-blue"></span><i class="swarm-color-target"></i></div><div class="swarm-color-hue"><i></i></div></div><div class="swarm-color-result"><i><span></span></i><span class="swarm-color-readout"><span class="swarm-color-before">#000000</span><span class="swarm-color-after">#2A4D88</span></span></div><div class="swarm-color-rgb"><span>RGB</span><span><b><span class="swarm-color-before">0</span><span class="swarm-color-after">42</span></b>R</span><span><b><span class="swarm-color-before">0</span><span class="swarm-color-after">77</span></b>G</span><span><b><span class="swarm-color-before">0</span><span class="swarm-color-after">136</span></b>B</span></div><div class="swarm-color-actions"><span>Cancel</span><span class="swarm-color-done">Done</span></div>`;
    const pickerPoint = mountDialog(picker, dialogX, dialogY, dialogWidth, 304);
    animate(picker, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0px)" }], 2140, 180);
    fadeOut(picker, 4220, 180);
    const trigger = panel("Fill", { x: dialogX + dialogWidth * dialogScale - 58, y: hero.rect.top + 56 }, 1700, 540, 54);
    trigger.classList.add("swarm-color-trigger");
    task(10, 2000, 140, "Open color dialog", "arrow", () => ({ x: dialogX + dialogWidth * dialogScale - 31, y: hero.rect.top + 72 }));
    task(10, 2540, 320, "Choose blue hue", "arrow", progress => pickerPoint(hueX, field.y + 12 + (120 * 0.603 - 12) * bezier(progress, drawCurve)));
    animate(picker.querySelector(".swarm-color-well-blue")!, [{ opacity: 0 }, { opacity: 1 }], 2540, 320, easeInOut);
    animate(picker.querySelector(".swarm-color-hue i")!, [{ transform: "translateY(12px)" }, { transform: `translateY(${120 * 0.603}px)` }], 2540, 320, easeInOut);
    task(10, 3200, 260, "Choose site blue", "arrow", progress => {
      const amount = bezier(progress, drawCurve);
      return pickerPoint(field.x + chosen.x * amount, field.y + 120 + (chosen.y - 120) * amount);
    });
    animate(picker.querySelector(".swarm-color-target")!, [{ transform: "translate(0px,120px)" }, { transform: `translate(${chosen.x}px,${chosen.y}px)` }], 3200, 260, easeInOut);
    picker.querySelectorAll(".swarm-color-after").forEach(node => show(node, 3460));
    picker.querySelectorAll(".swarm-color-before").forEach(node => fadeOut(node, 3460, 1));
    show(picker.querySelector(".swarm-color-result > i > span")!, 3460);
    const done = pickerPoint(14 + ((dialogWidth - 28) * 3 + 8) / 4, 275);
    task(10, 4100, 120, "Confirm site palette", "arrow", () => done);
    animate(picker.querySelector(".swarm-color-done")!, [{ transform: "scale(1)" }, { transform: "scale(.97)", offset: 0.5 }, { transform: "scale(1)" }], 4100, 120);
    register(picker, hero.rect, 2000, 2220);

    const bluePoint = { x: hero.rect.left + 20, y: hero.rect.top + 20 };
    const idleAgent = [3, 7, 9, 13].find(agent => tracks[agent].every(job => job.start + job.duration < 4800));
    if (idleAgent !== undefined) {
      task(idleAgent, 4800, 260, "Sample finished blue", "eyedropper", () => bluePoint);
      const chip = panel("Sampled blue", { x: bluePoint.x + 18, y: bluePoint.y + 18 }, 4800, 560, 124);
      chip.hidden = compactDialogs;
      const swatch = document.createElement("i");
      swatch.className = "swarm-sampled-color";
      swatch.style.background = "var(--color-deep-blue)";
      chip.append(swatch);
      register(chip, hero.rect, 4800, 260);
    }

    const radiusWidth = compactDialogs ? 320 : Math.min(320, viewportWidth - 32);
    const radiusX = Math.max(16, Math.min(viewportWidth - radiusWidth * dialogScale - 16, hero.rect.right - radiusWidth * dialogScale - 12));
    const radiusY = compactDialogs ? dialogTop : Math.max(28, Math.min(innerHeight - 260, hero.rect.top + 38));
    const radiusDialog = document.createElement("div");
    radiusDialog.className = "swarm-radius-dialog";
    radiusDialog.dataset.swarmRadius = "true";
    radiusDialog.setAttribute("aria-hidden", "true");
    const corners = ["top left", "top right", "bottom left", "bottom right"];
    radiusDialog.innerHTML = `<div class="swarm-radius-title">Corner radius</div><div class="swarm-radius-grid">${corners.map((corner, index) => `<div class="swarm-radius-setting" data-corner="${corner}"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="4"/><path d="M3 10V7a4 4 0 0 1 4-4h3" transform="rotate(${[0, 90, 270, 180][index]} 10 10)"/></svg><div class="swarm-radius-field"><span class="swarm-radius-zero">0</span><span class="swarm-radius-number">${radius}</span><i class="swarm-radius-caret"></i><span class="swarm-radius-unit">px</span><i class="swarm-radius-focus"></i></div></div>`).join("")}</div><div class="swarm-radius-footer"><span>All corners linked</span><span class="swarm-radius-done">Done</span></div>`;
    const radiusPoint = mountDialog(radiusDialog, radiusX, radiusY, radiusWidth, 238);
    animate(radiusDialog, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0px)" }], 4670, 160);
    fadeOut(radiusDialog, 6040, 140);
    const radiusTrigger = document.createElement("div");
    radiusTrigger.className = "swarm-radius-trigger";
    Object.assign(radiusTrigger.style, { left: `${hero.rect.right - 36}px`, top: `${hero.rect.top + 4}px` });
    radiusTrigger.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9a5 5 0 0 1 5-5h7"/></svg>`;
    windowOf(radiusTrigger, 4300, 430);
    build.append(radiusTrigger);
    task(0, 4550, 120, "Open corner-radius dialog", "arrow", () => ({ x: hero.rect.right - 22, y: hero.rect.top + 18 }));
    const inputPoint = radiusPoint(62, 89);
    task(0, 5200, 140, "Select corner-radius field", "ibeam", () => inputPoint);
    task(0, 5480, 100, "Enter linked corner radius", "ibeam", () => inputPoint);
    const firstField = radiusDialog.querySelector(".swarm-radius-field")!;
    const focus = firstField.querySelector(".swarm-radius-focus")!;
    show(focus, 5200);
    fadeOut(focus, 5880, 1);
    const caret = firstField.querySelector(".swarm-radius-caret")!;
    show(caret, 5200);
    fadeOut(caret, 5580, 1);
    radiusDialog.querySelectorAll(".swarm-radius-setting").forEach((setting, index) => {
      const change = index === 0 ? 5480 : 5880;
      show(setting.querySelector(".swarm-radius-number")!, change);
      fadeOut(setting.querySelector(".swarm-radius-zero")!, change, 1);
      if (index !== 0) (setting.querySelector(".swarm-radius-caret") as HTMLElement).style.display = "none";
      if (index !== 0) (setting.querySelector(".swarm-radius-focus") as HTMLElement).style.display = "none";
    });
    const radiusDone = radiusDialog.querySelector(".swarm-radius-done")!;
    task(0, 5880, 120, "Apply linked corner radius", "arrow", () => radiusPoint(radiusWidth - 54, 201));
    animate(radiusDone, [{ transform: "scale(1)" }, { transform: "scale(.97)", offset: 0.5 }, { transform: "scale(1)" }], 5880, 120);
    cornerPatches.forEach(patch => fadeOut(patch, 5880, 180));
    register(radiusDialog, hero.rect, 4550, 1510);

    const replayNode = editable.get(replay.source)!;
    replayNode.style.borderRadius = "0";
    const roundedReplay = clone(replay);
    roundedReplay.dataset.swarmRoundedControl = "true";
    animate(roundedReplay, [{ opacity: 0 }, { opacity: 1 }], 4700, 420);
    fadeOut(replayNode, 4700, 420);
    const replayCorner = { x: replay.rect.right - 2, y: replay.rect.top + 2 };
    task(11, 4700, 420, "Finish replay-control corners", "crosshair", progress => ({ x: replayCorner.x - 5 * progress, y: replayCorner.y + 5 * progress }));
    register(roundedReplay, replay.rect, 4700, 420);
  }

  function buildWorkFolder() {
    if (folder.rect.top >= innerHeight) return;
    if (!matchMedia("(max-width: 760px)").matches) {
      draw({ ...folder, rect: new DOMRect(folder.rect.left, folder.rect.top, folder.rect.width, Math.min(folder.rect.height, innerHeight - folder.rect.top - 16)) }, 13, 1450, 650, "Build first folder");
      return;
    }
    const node = clone(folder);
    editable.set(folder.source, node);
    node.style.lineHeight = String(parseFloat(folder.style.lineHeight) / parseFloat(folder.style.fontSize));
    node.dataset.swarmMobileFolder = "true";
    show(node, 1450);
    const tab = snapshot(".folder-work .folder-tab");
    const body = snapshot(".folder-work .folder-body");
    const tabNode = node.querySelector<HTMLElement>(".folder-tab")!;
    const bodyNode = node.querySelector<HTMLElement>(".folder-body")!;
    tabNode.querySelectorAll<HTMLElement>("span").forEach(text => text.style.opacity = "0");
    tabNode.style.transformOrigin = "center bottom";
    const tabFrames = [{ transform: "scaleX(.04)" }, { transform: "scaleX(1)" }];
    animate(tabNode, tabFrames, 1450, 340, easeInOut);
    const tabFrame = frame(tab.rect, 1450, 340);
    tabFrame.style.transformOrigin = "center bottom";
    animate(tabFrame, tabFrames, 1450, 340, easeInOut);
    jobs.at(-1)!.badge.hidden = true;
    task(13, 1450, 340, "Form work-folder tab", "crosshair", progress => ({ x: tab.rect.left + tab.rect.width * (0.5 + 0.5 * (0.04 + 0.96 * bezier(progress, drawCurve))), y: tab.rect.bottom }));
    animate(bodyNode, [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "translateY(0px)" }], 2150, 360, easeOut);
    const bodyHeight = Math.min(body.rect.height, innerHeight - body.rect.top - 12);
    if (bodyHeight > 12) inspect({ ...body, rect: new DOMRect(body.rect.left, body.rect.top, body.rect.width, bodyHeight) }, 13, 2150, 360, "Unfold work-folder body", true);
    type(snapshot(".folder-work .folder-tab > span:first-child"), 3, 2600, 180, "Type folder number", "var(--color-field)");
    type(snapshot(".folder-work .folder-tab > span:last-child"), 4, 2500, 330, "Type Selected work", "var(--color-field)");
    const title = snapshot("#work-title");
    if (title.rect.top + title.rect.height * 0.6 < innerHeight - 12) {
      node.querySelector<HTMLElement>(".section-heading h2")!.style.opacity = "0";
      type(title, 8, 3500, 500, "Type The work folder", "var(--color-field)");
    }
    const heading = snapshot(".folder-work .section-heading");
    if (heading.rect.bottom < innerHeight - 12) {
      node.querySelector<HTMLElement>(".section-heading")!.style.borderBottomColor = "transparent";
      const divider = document.createElement("div");
      divider.className = "swarm-measure-line";
      Object.assign(divider.style, { left: `${heading.rect.left}px`, top: `${heading.rect.bottom - 1}px`, width: `${heading.rect.width}px`, height: "1px", background: "var(--color-field-ink)" });
      show(divider, 3900);
      animate(divider, [{ transform: "scaleX(.02)" }, { transform: "scaleX(1)" }], 3900, 300, easeInOut);
      build.append(divider);
      task(9, 3900, 300, "Draw folder divider", "crosshair", progress => ({ x: heading.rect.left + heading.rect.width * (0.02 + 0.98 * bezier(progress, drawCurve)), y: heading.rect.bottom - 1 }));
    }
    const content = node.querySelector<HTMLElement>(".empty-work,.project-grid");
    if (content) animate(content, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0px)" }], 4340, 220, easeOut);
    const source = folder.source.querySelector<HTMLElement>(".empty-work,.project-grid");
    if (source) {
      const contentRect = source.getBoundingClientRect();
      const visibleHeight = Math.min(contentRect.height, innerHeight - contentRect.top - 12);
      if (visibleHeight > 16) inspect({ source, rect: new DOMRect(contentRect.left, contentRect.top, contentRect.width, visibleHeight), style: getComputedStyle(source) }, 6, 4340, 260, "Place folder contents");
    }
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

  const cornerPatches: HTMLElement[] = [];
  const radius = parseFloat(hero.style.borderTopRightRadius);
  for (const [x, y] of [[hero.rect.left, hero.rect.top], [hero.rect.right - radius, hero.rect.top], [hero.rect.left, hero.rect.bottom - radius], [hero.rect.right - radius, hero.rect.bottom - radius]]) {
    const patch = document.createElement("div");
    patch.className = "swarm-corner-patch";
    position(patch, new DOMRect(x, y, radius, radius));
    show(patch, 1540);
    build.append(patch);
    cornerPatches.push(patch);
  }
  const surface = draw(hero, 0, 1180, 360, "Draw panel surface", "var(--color-field)");
  surface.style.borderRadius = "0";
  const logo = clone(monogram);
  show(logo, 1140);
  task(3, 1080, 260, "Place monogram", "arrow", () => ({ x: monogram.rect.left + monogram.rect.width / 2, y: monogram.rect.top + monogram.rect.height / 2 }));
  type(identity, 7, 1330, 420, "Type identity", "var(--color-paper)");
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
  buildWorkFolder();
  type(caption, 0, 3000, 280, "Type folder link", "var(--color-paper)");

  const small = 18 / parseFloat(first.style.fontSize);
  const firstTitle = type(first, 1, 2360, 260, "Type Gregorius", "var(--color-field)", small)!;
  animate(firstTitle, [{ transform: `scale(${small})` }, { transform: "scale(1)" }], 2650, 430, "linear");
  frame(first.rect, 2650, 430, true, true, small);
  task(1, 2650, 430, "Enlarge title by corner handle", "arrow", progress => {
    const scale = small + (1 - small) * progress;
    return { x: first.rect.left + first.rect.width * scale, y: first.rect.top + first.rect.height * scale };
  });
  portfolioLabel();
  draw(replay, 11, 2230, 300, "Draw replay control", "var(--color-field)");
  type(replay, 11, 2780, 320, "Type replay control", "var(--color-field)");
  codeRole();
  const extendedRight = Math.max(selection.rect.right, hero.rect.right - Math.max(16, parseFloat(hero.style.paddingRight) / 2));
  const extended = new DOMRect(selection.rect.left, selection.rect.top, extendedRight - selection.rect.left, selection.rect.height);
  const expansion = extended.width / selection.rect.width;
  const selectionNode = clone(selection);
  selectionNode.dataset.swarmSelection = "true";
  selectionNode.style.transformOrigin = "top left";
  show(selectionNode, 2390, parseFloat(selection.style.opacity));
  animate(selectionNode, [{ transform: `scale(${expansion * 0.02},.02)` }, { transform: `scale(${expansion},1)` }], 2390, 390, "linear");
  frame(extended, 2390, 390, true, true);
  task(5, 2390, 390, "Draw extended title selection", "crosshair", progress => ({ x: extended.left + extended.width * (0.02 + 0.98 * progress), y: extended.top + extended.height * (0.02 + 0.98 * progress) }));
  const resize = animate(selectionNode, [{ transform: `scale(${expansion},1)` }, { transform: "scale(1,1)" }], 4930, 360, easeInOut);
  resize.effect!.updateTiming({ fill: "forwards" });
  task(5, 4930, 360, "Resize outer frame to fit Felix", "arrow", progress => ({ x: extended.right + (selection.rect.right - extended.right) * bezier(progress, drawCurve), y: selection.rect.bottom }));
  draw(author, 6, 2320, 160, "Draw author tag", "var(--color-field-ink)");
  type(author, 6, 2830, 240, "Type author tag", "var(--color-field-ink)");
  draw(button, 2, 2220, 300, "Draw portfolio button", "var(--color-field-ink)");
  const buttonText = type(button, 2, 2920, 380, "Type portfolio button", "var(--color-field-ink)")!;
  buttonText.querySelectorAll<HTMLElement>('[aria-hidden="true"]').forEach(node => show(node, 3300));

  const duplicateTarget = { ...second, rect: new DOMRect(Math.max(first.rect.left, extended.right - 16 - first.rect.width), second.rect.top, first.rect.width, second.rect.height) };
  duplicate(first, duplicateTarget, 1, 3950, 640, "Duplicate title into second line");
  type(second, 2, 4590, 340, "Replace duplicate with Felix", "var(--color-field)");
  finishDetails();
  const bounds = hero.rect;
  const panelWindow = `path(evenodd, "M0 0H${innerWidth}V${innerHeight}H0Z M${bounds.left} ${bounds.top}H${bounds.right}V${bounds.bottom}H${bounds.left}Z")`;
  animate(backdrop, [{ clipPath: "none" }, { clipPath: panelWindow }], 1540, 1, "steps(1,end)");
  const revealPanel = animate(surface, [{ opacity: 1 }, { opacity: 0 }], 1540, 1, "steps(1,end)");
  revealPanel.effect!.updateTiming({ fill: "forwards" });
  animate(build, [{ opacity: 1 }, { opacity: 0 }], TOTAL, 150);
  const cursors = createCursors(tracks, { x: innerWidth, y: innerHeight }, TOTAL);
  for (const child of hero.source.children) {
    animate(child, [{ visibility: "hidden" }, { visibility: "hidden", offset: 0.999 }, { visibility: "visible" }], 0, TOTAL, "steps(1,end)");
  }
  const monochrome = [build, ...cursors.fragment.children, ...document.querySelectorAll("body > header,body > main,body > footer,.intro-toolbar")];
  monochrome.forEach(node => animate(node, [
    { filter: "grayscale(1)", offset: 0, easing: "steps(1,end)" },
    { filter: "grayscale(0)", offset: 4220 / cursors.duration },
    { filter: "grayscale(0)", offset: 1 },
  ], 0, cursors.duration, "linear"));
  fragment.append(cursors.fragment);
  animations.push(...cursors.animations);
  const pace = 0.72;
  animations.forEach(animation => {
    const timing = animation.effect!.getTiming();
    animation.effect!.updateTiming({ delay: timing.delay * pace, duration: Number(timing.duration) * pace });
  });
  jobs.forEach(job => { job.start *= pace; job.duration *= pace; });
  return { fragment, animations, jobs, contentDuration: TOTAL * pace, duration: cursors.duration * pace, scanDuration: 900 * pace, drawCurve };
}
