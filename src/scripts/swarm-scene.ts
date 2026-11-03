import { advances, cloneLayer, type Snapshot } from "./swarm-dom";
import { clamp, departureFrames, pathAt, type Stop } from "./swarm-paths";
export type Job = {
  start: number;
  duration: number;
  badge: HTMLElement;
  rect: DOMRect;
  drawing: boolean;
  linear: boolean;
};
export const TOTAL = 10300;
export const AGENTS = 14;
const LINE_UP = 420,
  LEAVE_SCREEN = 600;
const PANEL_START = 1420,
  PANEL_DRAW = 1160;

export function createSwarmScene() {
  const animations: Animation[] = [];
  const jobs: Job[] = [];
  const snapshot = (selector: string): Snapshot => {
    const source = document.querySelector<HTMLElement>(selector)!;
    return {
      source,
      rect: source.getBoundingClientRect(),
      style: getComputedStyle(source),
    };
  };
  const header = snapshot(".site-header"),
    hero = snapshot(".hero-sheet"),
    caption = snapshot(".hero-caption"),
    folder = snapshot(".folder-work");
  const first = snapshot("#hero-title > span:first-child"),
    second = snapshot("#hero-title > span:last-child");
  const selection = snapshot(".name-selection"),
    button = snapshot(".primary-button"),
    author = snapshot(".author-tag");
  const nav = Array.from(header.source.querySelectorAll<HTMLElement>("nav a")).map((source) => ({
    source,
    rect: source.getBoundingClientRect(),
    style: getComputedStyle(source),
  }));
  const titleSteps = [advances(first.source), advances(second.source)];
  const navSteps = nav.map((item) => advances(item.source));
  const root = getComputedStyle(document.documentElement);
  const easeOut = root.getPropertyValue("--ease-out").trim();
  const easeInOut = root.getPropertyValue("--ease-in-out").trim();
  const drawCurve = (easeInOut.match(/[\d.]+/g) ?? []).map(Number);
  const width = innerWidth,
    height = innerHeight,
    fragment = document.createDocumentFragment();
  const headerClone = cloneLayer(header),
    heroClone = cloneLayer(hero),
    captionClone = cloneLayer(caption),
    folderClone = cloneLayer(folder);
  heroClone.style.background = "var(--color-clear)";
  const animate = (
    node: Element,
    frames: Keyframe[],
    delay: number,
    duration: number,
    easing = easeOut,
    fill: FillMode = "both",
  ) => {
    const a = node.animate(frames, { delay, duration, easing, fill });
    animations.push(a);
    return a;
  };
  const show = (node: Element, start: number, duration = 120) =>
    animate(node, [{ opacity: 0 }, { opacity: 1 }], start, duration);
  const position = (node: HTMLElement, rect: DOMRect, extra = 0) =>
    Object.assign(node.style, {
      left: `${rect.x - extra}px`,
      top: `${rect.y - extra}px`,
      width: `${rect.width + extra * 2}px`,
      height: `${rect.height + extra * 2}px`,
    });
  const windowOf = (node: Element, start: number, duration: number) =>
    animate(
      node,
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.001 },
        { opacity: 1, offset: 0.86 },
        { opacity: 0, offset: 1 },
      ],
      start,
      duration,
      "linear",
    );
  function frame(rect: DOMRect, start: number, duration: number, drawing = false, linear = false) {
    const box = document.createElement("div");
    box.className = "swarm-editor-frame";
    position(box, rect);
    for (let i = 0; i < 4; i++) {
      const handle = document.createElement("i");
      box.append(handle);
    }
    fragment.append(box);
    windowOf(box, start, duration + 550);
    if (drawing) {
      box.style.transformOrigin = "top left";
      animate(
        box,
        [{ transform: "scale(.02,.02)" }, { transform: "scale(1,1)" }],
        start,
        duration,
        linear ? "linear" : easeInOut,
      );
    }
    const badge = document.createElement("div");
    badge.className = "swarm-dimension";
    badge.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    Object.assign(badge.style, {
      left: `${rect.left}px`,
      top: `${rect.top + 6}px`,
    });
    const sx = drawing ? 0.02 : 1;
    animate(
      badge,
      [
        {
          transform: `translate(${rect.width * sx}px,${rect.height * sx}px)`,
        },
        { transform: `translate(${rect.width}px,${rect.height}px)` },
      ],
      start,
      duration,
      linear ? "linear" : easeInOut,
    );
    windowOf(badge, start, duration + 550);
    fragment.append(badge);
    jobs.push({ start, duration, badge, rect, drawing, linear });
    return box;
  }
  function typeInto(
    node: HTMLElement,
    item: Snapshot,
    steps: number[],
    start: number,
    duration: number,
    paper: string,
  ) {
    show(node, start, 1);
    frame(item.rect, start - 120, duration + 100);
    const cover = document.createElement("div");
    cover.className = "swarm-word-cover";
    position(cover, item.rect, 5);
    const ink = document.createElement("div");
    ink.className = "swarm-word-ink";
    ink.style.background = paper;
    cover.append(ink);
    fragment.append(cover);
    windowOf(cover, start, duration + 150);
    animate(
      ink,
      steps.map((distance, index) => ({
        offset: index / (steps.length - 1),
        transform: `translateX(${distance + 5}px)`,
        easing: "steps(1,end)",
      })),
      start,
      duration,
      "linear",
    );
  }

  const ghost = document.createElement("div");
  ghost.className = "swarm-scan-ghost";
  ghost.append(cloneLayer(header), cloneLayer(hero), cloneLayer(caption));
  fragment.append(ghost);
  animate(
    ghost,
    [
      { opacity: 0.02, offset: 0 },
      { opacity: 0.02, offset: 0.85 },
      { opacity: 0, offset: 1 },
    ],
    0,
    1400,
    "linear",
  );
  const surface = document.createElement("div");
  surface.className = "swarm-reference-surface";
  position(surface, hero.rect);
  surface.style.borderRadius = hero.style.borderRadius;
  show(surface, PANEL_START, 1);
  animate(surface, [{ transform: "scale(.02,.02)" }, { transform: "scale(1,1)" }], PANEL_START, PANEL_DRAW, "linear");
  fragment.append(surface, headerClone, heroClone, captionClone);
  frame(hero.rect, PANEL_START, PANEL_DRAW, true, true);
  show(headerClone.querySelector(".monogram")!, 1350, 160);
  show(headerClone.querySelector(".identity-name")!, 1700, 220);
  frame(new DOMRect(header.rect.left, header.rect.top + 24, 50, 46), 1300, 500);
  headerClone
    .querySelectorAll<HTMLElement>("nav a")
    .forEach((node, index) =>
      typeInto(node, nav[index], navSteps[index], 1550 + index * 470, 380, "var(--color-paper)"),
    );
  const captionLink = captionClone.querySelector<HTMLElement>("a")!;
  show(captionLink, 1450, 220);
  const note = captionClone.querySelector<HTMLElement>("#intro-motion-note");
  if (note) note.hidden = true;
  heroClone.querySelectorAll<HTMLElement>(".hero-top > *").forEach((node, index) => {
    show(node, 2800 + index * 350, 180);
  });
  show(heroClone.querySelector(".name-selection")!, 2800, 350);
  frame(selection.rect, 2400, 500, true);
  show(heroClone.querySelector(".author-tag")!, 3100, 150);
  frame(author.rect, 3000, 430);
  show(heroClone.querySelector(".hero-bottom p")!, 2850, 180);
  const buttonClone = heroClone.querySelector<HTMLElement>(".primary-button")!;
  const textNode = Array.from(buttonClone.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
  );
  if (textNode) {
    const label = document.createElement("span");
    label.className = "swarm-button-label";
    label.textContent = textNode.textContent!.trim();
    textNode.replaceWith(label);
    show(label, 3850, 250);
  }
  buttonClone.querySelectorAll<HTMLElement>("span:not(.swarm-button-label)").forEach((node) => show(node, 4100, 120));
  buttonClone.style.transformOrigin = "top left";
  animate(
    buttonClone,
    [
      { opacity: 0, transform: "scale(.02,.02)" },
      { opacity: 1, transform: "scale(.02,.02)", offset: 0.01 },
      { opacity: 1, transform: "scale(1,1)" },
    ],
    3400,
    400,
    easeInOut,
  );
  frame(button.rect, 3400, 400, true);
  if (folder.rect.top < height) {
    fragment.append(folderClone);
    show(folderClone, 1850, 220);
    frame(folder.rect, 1700, 500);
  }

  const titleClones = heroClone.querySelectorAll<HTMLElement>(".name-stage h1 > span");
  titleClones.forEach((node) => {
    node.style.opacity = "0";
  });
  const titleSpecs = [
    {
      item: first,
      steps: titleSteps[0],
      start: 2450,
      duration: 600,
      grow: 380,
    },
    {
      item: second,
      steps: titleSteps[1],
      start: 4450,
      duration: 1000,
      grow: 0,
    },
  ];
  titleSpecs.forEach(({ item, steps, start, duration, grow }, index) => {
    const task = document.createElement("div");
    task.className = "swarm-type-layer";
    position(task, item.rect);
    [
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "fontStretch",
      "letterSpacing",
      "lineHeight",
      "fontKerning",
      "fontFeatureSettings",
      "fontVariationSettings",
      "fontOpticalSizing",
      "color",
    ].forEach((key) => {
      (task.style as unknown as Record<string, string>)[key] = (item.style as unknown as Record<string, string>)[key];
    });
    const text = document.createElement("span");
    text.className = "swarm-type-text";
    text.textContent = item.source.textContent;
    task.append(text);
    const cover = document.createElement("div");
    cover.className = "swarm-word-cover";
    Object.assign(cover.style, {
      inset: "-12px",
      width: "auto",
      height: "auto",
    });
    const ink = document.createElement("div");
    ink.className = "swarm-word-ink";
    cover.append(ink);
    task.append(cover);
    const caret = document.createElement("span");
    caret.className = "swarm-local-caret";
    task.append(caret);
    for (let i = 0; i < 4; i++) {
      const handle = document.createElement("i");
      handle.className = "swarm-type-handle";
      task.append(handle);
      windowOf(handle, start, duration + grow + 350);
    }
    show(task, start, 1);
    const scale = grow ? 18 / parseFloat(item.style.fontSize) : 1;
    animate(
      task,
      [
        { transform: `scale(${scale})`, offset: 0 },
        {
          transform: `scale(${scale})`,
          offset: duration / (duration + Math.max(1, grow)),
          easing: easeOut,
        },
        { transform: "scale(1)", offset: 1 },
      ],
      start,
      duration + Math.max(1, grow),
      "linear",
    );
    const keyframes = steps.map((distance, n) => ({
      offset: n / (steps.length - 1),
      transform: `translateX(${distance + 12}px)`,
      easing: "steps(1,end)",
    }));
    animate(ink, keyframes, start, duration, "linear");
    windowOf(cover, start, duration + 180);
    animate(
      caret,
      steps.map((distance, n) => ({
        offset: n / (steps.length - 1),
        transform: `translateX(${distance}px)`,
        easing: "steps(1,end)",
      })),
      start,
      duration,
      "linear",
    );
    windowOf(caret, start, duration + 500);
    fragment.append(task);
    frame(item.rect, start + duration + grow - 80, 80);
  });

  const duplicate = document.createElement("div");
  duplicate.className = "swarm-duplicate-text";
  position(duplicate, first.rect);
  ["fontFamily", "fontSize", "fontWeight", "letterSpacing", "lineHeight", "color"].forEach((key) => {
    (duplicate.style as unknown as Record<string, string>)[key] = (first.style as unknown as Record<string, string>)[
      key
    ];
  });
  duplicate.textContent = first.source.textContent;
  fragment.append(duplicate);
  const duplicateX = second.rect.right - first.rect.width - first.rect.left;
  animate(
    duplicate,
    [
      { opacity: 0, transform: "translate(0px,0px)", offset: 0 },
      { opacity: 1, transform: "translate(0px,0px)", offset: 0.08 },
      {
        opacity: 1,
        transform: `translate(${duplicateX}px,${second.rect.top - first.rect.top}px)`,
        offset: 0.75,
      },
      {
        opacity: 0,
        transform: `translate(${duplicateX}px,${second.rect.top - first.rect.top}px)`,
        offset: 1,
      },
    ],
    3700,
    800,
    easeInOut,
  );
  nav.slice(1).forEach((item, index) => {
    const copy = document.createElement("div");
    copy.className = "swarm-nav-duplicate";
    copy.textContent = nav[0].source.textContent;
    Object.assign(copy.style, {
      left: `${nav[0].rect.left}px`,
      top: `${nav[0].rect.top}px`,
      fontSize: nav[0].style.fontSize,
      color: nav[0].style.color,
    });
    animate(
      copy,
      [
        { opacity: 0, transform: "translateX(0px)", offset: 0 },
        { opacity: 1, transform: "translateX(0px)", offset: 0.1 },
        {
          opacity: 1,
          transform: `translateX(${item.rect.left - nav[0].rect.left}px)`,
          offset: 0.7,
        },
        {
          opacity: 0,
          transform: `translateX(${item.rect.left - nav[0].rect.left}px)`,
          offset: 1,
        },
      ],
      1950 + index * 400,
      450,
      easeInOut,
    );
    fragment.append(copy);
  });
  const ruler = document.createElement("div");
  ruler.className = "swarm-ruler";
  Object.assign(ruler.style, {
    left: `${selection.rect.left}px`,
    top: `${selection.rect.top}px`,
    height: `${selection.rect.height}px`,
  });
  windowOf(ruler, 3850, 1000);
  fragment.append(ruler);
  const mark = document.createElement("div");
  mark.className = "swarm-mark swarm-scan-mark";
  mark.textContent = "gf.";
  Object.assign(mark.style, {
    left: `${width / 2}px`,
    top: `${height / 2}px`,
  });
  windowOf(mark, 0, 1400);
  fragment.append(mark);

  const h = hero.rect,
    a = first.rect,
    b = second.rect;
  const routes: Stop[][] = [
    [
      { time: PANEL_START, x: h.left, y: h.top },
      { time: PANEL_START + PANEL_DRAW, x: h.right, y: h.bottom },
      { time: 3000, x: h.right - 40, y: h.bottom - 40 },
    ],
    [
      { time: 2300, x: a.left, y: a.top },
      { time: 2450, x: a.left, y: a.top + 18 },
      {
        time: 3050,
        x: a.left + (titleSteps[0].at(-1)! * 18) / parseFloat(first.style.fontSize),
        y: a.top + 18,
      },
      { time: 3430, x: a.right, y: a.bottom },
    ],
    [
      { time: 4300, x: b.left, y: b.top },
      { time: 4450, x: b.left, y: b.top + b.height * 0.65 },
      { time: 5450, x: b.right, y: b.top + b.height * 0.65 },
    ],
    [
      { time: 1400, x: header.rect.left + 20, y: header.rect.top + 40 },
      { time: 1750, x: header.rect.left + 150, y: header.rect.top + 45 },
      { time: 2800, x: h.left + 50, y: h.top + 40 },
    ],
    [
      { time: 1450, x: nav[0].rect.left, y: nav[0].rect.top + 10 },
      { time: 1950, x: nav[0].rect.right, y: nav[0].rect.top + 10 },
      { time: 2400, x: nav[1].rect.right, y: nav[1].rect.top + 10 },
      { time: 2900, x: nav[2].rect.right, y: nav[2].rect.top + 10 },
    ],
    [
      { time: 2400, x: selection.rect.left, y: selection.rect.top },
      { time: 2900, x: selection.rect.right, y: selection.rect.bottom },
      { time: 3500, x: author.rect.right, y: author.rect.bottom },
    ],
    [
      { time: 3300, x: button.rect.left, y: button.rect.top },
      { time: 3800, x: button.rect.right, y: button.rect.bottom },
      { time: 4300, x: button.rect.right - 20, y: button.rect.top + 15 },
    ],
  ];
  const contentDuration = Math.max(
    ...jobs.map((job) => job.start + job.duration),
    ...titleSpecs.map((task) => task.start + task.duration + task.grow),
  );
  const spacing = Math.min(22, (width - 64) / (AGENTS - 1));
  const lineLeft = (width - spacing * (AGENTS - 1)) / 2;
  const lineY = Math.min(height - 80, h.top + h.height * 0.78);
  const exitDuration = LINE_UP + LEAVE_SCREEN;
  for (let index = 0; index < AGENTS; index++) {
    const phase = (index * Math.PI * 2) / AGENTS;
    const start = {
      time: 0,
      x: width * (index % 2 ? 0.18 : 0.82) + Math.sin(index * 2.3) * width * 0.12,
      y: height * (0.2 + (index % 5) * 0.12),
    };
    const gathering = [
      start,
      {
        time: 650,
        x: width / 2 + Math.cos(phase) * 150,
        y: height / 2 + Math.sin(phase) * 105,
      },
      {
        time: 1120,
        x: width / 2 + Math.cos(phase + 1) * 92,
        y: height / 2 + Math.sin(phase + 1) * 75,
      },
    ];
    const work = routes[index] ?? [
      {
        time: 1600,
        x: h.left + h.width * (0.1 + (index % 4) * 0.23),
        y: h.top + h.height * (0.1 + (index % 3) * 0.32),
      },
      {
        time: 3000,
        x: h.left + h.width * (0.2 + (index % 3) * 0.25),
        y: h.top + h.height * (0.2 + (index % 4) * 0.17),
      },
      {
        time: 4600,
        x: h.left + h.width * (0.1 + (index % 4) * 0.23),
        y: h.top + h.height * (0.1 + (index % 3) * 0.32),
      },
    ];
    const last = work.at(-1)!.time;
    const wanderPoint = (turn: number) => ({
      x: h.left + h.width * (0.5 + 0.42 * Math.sin(index * 2.399963 + turn)),
      y: h.top + h.height * (0.5 + 0.4 * Math.cos(index * 1.731 + turn * 0.9)),
    });
    const wander = [
      { time: Math.max(6100, last + 450), ...wanderPoint(0.3) },
      { time: 7900, ...wanderPoint(1.5) },
      { time: TOTAL, ...wanderPoint(2.9) },
    ];
    const stops = [...gathering, ...work, ...wander];
    const pointer = document.createElement("div");
    pointer.className = "swarm-pointer swarm-editor-pointer";
    pointer.dataset.tone = String(index % 7);
    pointer.innerHTML =
      '<svg class="swarm-arrow" viewBox="-17 -11 22 22" width="20" height="20" aria-hidden="true"><path d="M1 0-14-8-10 0-14 8 1 0Z"/></svg><svg class="swarm-crosshair" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 2v16M2 10h16"/></svg><svg class="swarm-ibeam" viewBox="0 0 16 24" width="16" height="24" aria-hidden="true"><path d="M4 3h8M8 3v18M4 21h8"/></svg>';
    const positions: Keyframe[] = [],
      rotations: Keyframe[] = [];
    let previousAngle = (phase * 180) / Math.PI;
    for (let step = 0; step <= 240; step++) {
      const time = (TOTAL * step) / 240;
      let point = pathAt(stops, time);
      if (index === 0 && time >= PANEL_START && time <= PANEL_START + PANEL_DRAW) {
        const amount = 0.02 + (0.98 * (time - PANEL_START)) / PANEL_DRAW;
        point = {
          x: h.left + h.width * amount,
          y: h.top + h.height * amount,
        };
      }
      const x = clamp(point.x, 10, width - 20),
        y = clamp(point.y, 10, height - 30);
      const next = pathAt(stops, Math.min(TOTAL, time + 16));
      let angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
      while (angle - previousAngle > 180) angle -= 360;
      while (angle - previousAngle < -180) angle += 360;
      previousAngle = angle;
      positions.push({
        offset: step / 240,
        transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`,
      });
      rotations.push({
        offset: step / 240,
        transform: `rotate(${angle.toFixed(2)}deg)`,
      });
    }
    animate(pointer, positions, 0, TOTAL, "linear");
    animate(pointer.querySelector(".swarm-arrow")!, rotations, 0, TOTAL, "linear");
    const toolStart = index === 0 ? PANEL_START : index === 5 ? 2400 : index === 6 ? 3400 : 0;
    const toolEnd = index === 0 ? PANEL_START + PANEL_DRAW : index === 5 ? 2900 : index === 6 ? 3800 : 0;
    const typeStart = index === 1 ? 2450 : index === 2 ? 4450 : index === 4 ? 1550 : 0;
    const typeEnd = index === 1 ? 3050 : index === 2 ? 5450 : index === 4 ? 2850 : 0;
    const opacity = (start: number, end: number, invert = false): Keyframe[] => {
      if (!end) return [{ opacity: invert ? 1 : 0 }, { opacity: invert ? 1 : 0 }];
      return [
        { opacity: invert ? 1 : 0, offset: 0 },
        {
          opacity: invert ? 1 : 0,
          offset: Math.max(0, start / TOTAL - 0.001),
        },
        { opacity: invert ? 0 : 1, offset: start / TOTAL },
        { opacity: invert ? 0 : 1, offset: end / TOTAL },
        { opacity: invert ? 1 : 0, offset: Math.min(1, end / TOTAL + 0.001) },
        { opacity: invert ? 1 : 0, offset: 1 },
      ];
    };
    animate(pointer.querySelector(".swarm-crosshair")!, opacity(toolStart, toolEnd), 0, TOTAL, "linear");
    animate(pointer.querySelector(".swarm-ibeam")!, opacity(typeStart, typeEnd), 0, TOTAL, "linear");
    animate(
      pointer.querySelector(".swarm-arrow")!,
      opacity(toolStart || typeStart, toolEnd || typeEnd, true),
      0,
      TOTAL,
      "linear",
    );
    const rowX = lineLeft + index * spacing;
    const exitFrames = departureFrames(
      stops,
      contentDuration,
      { x: rowX, y: lineY },
      width - lineLeft + 32,
      LINE_UP,
      LEAVE_SCREEN,
      { x: width, y: height },
    );
    animate(pointer, exitFrames, contentDuration, exitDuration, "linear", "forwards");
    const angleIndex = (contentDuration / TOTAL) * 240;
    const lower = Math.floor(angleIndex),
      fraction = angleIndex - lower;
    const fromAngle = parseFloat(String(rotations[lower].transform).slice(7));
    const toAngle = parseFloat(String(rotations[Math.min(240, lower + 1)].transform).slice(7));
    animate(
      pointer.querySelector(".swarm-arrow")!,
      [
        {
          transform: `rotate(${fromAngle + (toAngle - fromAngle) * fraction}deg)`,
        },
        { transform: "rotate(0deg)" },
      ],
      contentDuration,
      LINE_UP,
      easeOut,
      "forwards",
    );
    animate(
      pointer.querySelector(".swarm-arrow")!,
      [{ opacity: 1 }, { opacity: 1 }],
      contentDuration,
      exitDuration,
      "linear",
      "forwards",
    );
    [".swarm-crosshair", ".swarm-ibeam"].forEach((selector) =>
      animate(
        pointer.querySelector(selector)!,
        [{ opacity: 0 }, { opacity: 0 }],
        contentDuration,
        exitDuration,
        "linear",
        "forwards",
      ),
    );
    animate(
      pointer,
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.025 },
        { opacity: 1, offset: 1 },
      ],
      0,
      TOTAL,
      "linear",
    );
    fragment.append(pointer);
  }

  return { fragment, animations, jobs, contentDuration, duration: contentDuration + exitDuration, drawCurve };
}
