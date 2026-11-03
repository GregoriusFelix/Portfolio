import { bezier, clamp, pathAt, swarmExit, SWARM_EXIT_DURATION } from "./swarm-paths";
import type { CursorTask, Point } from "./swarm-types";

export const AGENTS = 14;
export const TOTAL = 5400;

export const cursorColor = (index: number) => `var(--color-swarm-${["orange", "green", "purple", "cyan", "pink", "yellow", "blue"][index % 7]})`;

export function createCursors(tracks: CursorTask[][], bounds: Point, contentDuration: number) {
  const fragment = document.createDocumentFragment();
  const animations: Animation[] = [];
  const animate = (node: Element, frames: Keyframe[], delay: number, duration: number, fill: FillMode = "both") => {
    animations.push(node.animate(frames, { delay, duration, easing: "linear", fill }));
  };
  const stations = [[0.5, 0.34], [0.28, 0.51], [0.8, 0.81], [0.045, 0.37], [0.74, 0.41], [0.5, 0.6], [0.44, 0.37], [0.09, 0.09], [0.32, 0.33], [0.48, 0.37], [0.27, 0.56], [0.78, 0.37], [0.28, 0.58], [0.44, 0.7]];
  tracks.forEach((tasks, index) => {
    tasks.sort((a, b) => a.start - b.start);
    const phase = index * Math.PI * 2 / AGENTS;
    const gathering = [
      { time: 0, x: bounds.x * (index % 2 ? 0.43 : 0.57) + Math.cos(phase) * 40, y: bounds.y * (index % 2 ? 0.65 : 0.35) + Math.sin(phase) * 34 },
      { time: 350, x: bounds.x * (index % 2 ? 0.42 : 0.6) + Math.cos(phase + 0.6) * 32, y: bounds.y * (index % 2 ? 0.62 : 0.4) + Math.sin(phase + 0.6) * 32 },
      { time: 720, x: bounds.x * (index % 2 ? 0.46 : 0.55) + Math.cos(phase + 1.4) * 44, y: bounds.y * (index % 2 ? 0.56 : 0.48) + Math.sin(phase + 1.4) * 44 },
      { time: 940, x: bounds.x * stations[index][0], y: bounds.y * stations[index][1] },
    ];
    const pointAt = (time: number): Point => {
      if (time <= 940) return pathAt(gathering, time);
      let from = gathering.at(-1)!;
      for (const task of tasks) {
        if (time < task.start) {
          const departure = Math.max(from.time, task.start - 240);
          const amount = bezier(clamp((time - departure) / (task.start - departure)), [0.77, 0, 0.175, 1]);
          const to = task.point(0);
          return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount };
        }
        if (time <= task.start + task.duration) return task.point(clamp((time - task.start) / task.duration));
        from = { time: task.start + task.duration, ...task.point(1) };
      }
      return from;
    };
    const pointer = document.createElement("div");
    pointer.className = "swarm-pointer swarm-editor-pointer";
    pointer.dataset.agent = String(index);
    pointer.dataset.tasks = tasks.map(task => task.label).join(", ");
    pointer.style.color = cursorColor(index);
    pointer.innerHTML = `<svg class="swarm-arrow" viewBox="-17 -11 22 22" width="20" height="20" aria-hidden="true"><path transform="translate(-1 0)" d="M1 0-14-8-10 0-14 8 1 0Z"/></svg><svg class="swarm-crosshair" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 2v16M2 10h16"/></svg><svg class="swarm-ibeam" viewBox="0 0 16 24" width="16" height="24" aria-hidden="true"><path d="M4 3h8M8 3v18M4 21h8"/></svg>`;
    const samples = new Set(Array.from({ length: Math.ceil(contentDuration / 8) + 1 }, (_, n) => Math.min(contentDuration, n * 8)));
    tasks.forEach(task => { samples.add(task.start); samples.add(task.start + task.duration); });
    animate(pointer, [...samples].sort((a, b) => a - b).map(time => {
      const point = pointAt(time);
      return { offset: time / contentDuration, transform: `translate3d(${point.x}px,${point.y}px,0)` };
    }), 0, contentDuration);
    for (const tool of ["arrow", "crosshair", "ibeam"] as const) {
      const frames: Keyframe[] = [{ offset: 0, opacity: tool === "arrow" ? 1 : 0, easing: "steps(1,end)" }];
      tasks.forEach(task => {
        frames.push({ offset: task.start / contentDuration, opacity: task.tool === tool ? 1 : 0, easing: "steps(1,end)" });
        frames.push({ offset: (task.start + task.duration) / contentDuration, opacity: tool === "arrow" ? 1 : 0, easing: "steps(1,end)" });
      });
      frames.push({ offset: 1, opacity: tool === "arrow" ? 1 : 0 });
      animate(pointer.querySelector(`.swarm-${tool}`)!, frames, 0, contentDuration);
    }
    const exit = swarmExit(pointAt, contentDuration, index, AGENTS, bounds);
    animate(pointer, exit.positions, contentDuration, SWARM_EXIT_DURATION, "forwards");
    animate(pointer.querySelector(".swarm-arrow")!, exit.rotations, contentDuration, SWARM_EXIT_DURATION, "forwards");
    for (const tool of ["arrow", "crosshair", "ibeam"]) animate(pointer.querySelector(`.swarm-${tool}`)!, [{ opacity: tool === "arrow" ? 1 : 0 }, { opacity: tool === "arrow" ? 1 : 0 }], contentDuration, SWARM_EXIT_DURATION, "forwards");
    const windows = [
      { start: 0, end: 940 },
      ...tasks.map(task => ({ start: Math.max(940, task.start - 100), end: Math.min(contentDuration, task.start + task.duration + 60) })),
      { start: contentDuration - 100, end: contentDuration },
    ].sort((a, b) => a.start - b.start);
    const active: { start: number; end: number }[] = [];
    for (const window of windows) {
      const previous = active.at(-1);
      if (previous && window.start <= previous.end + 100) previous.end = Math.max(previous.end, window.end);
      else active.push({ ...window });
    }
    const visibility: Keyframe[] = [{ offset: 0, opacity: 0 }];
    for (const window of active) {
      if (window.start) visibility.push({ offset: window.start / contentDuration, opacity: 0 });
      visibility.push({ offset: (window.start + 60) / contentDuration, opacity: 1 });
      if (window.end < contentDuration) {
        visibility.push({ offset: (window.end - 60) / contentDuration, opacity: 1 });
        visibility.push({ offset: window.end / contentDuration, opacity: 0 });
      } else visibility.push({ offset: 1, opacity: 1 });
    }
    animate(pointer, visibility, 0, contentDuration);
    fragment.append(pointer);
  });
  return { fragment, animations, duration: contentDuration + SWARM_EXIT_DURATION };
}
