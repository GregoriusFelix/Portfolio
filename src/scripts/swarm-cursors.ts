import { bezier, clamp, swarmExit, SWARM_EXIT_DURATION } from "./swarm-paths";
import type { CursorTask, Point } from "./swarm-types";

export const AGENTS = 14;
export const TOTAL = 6200;

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
    const origin = { x: bounds.x / 2 + Math.cos(phase) * 40, y: bounds.y / 2 + Math.sin(phase) * 34 };
    const first = tasks[0];
    const arrival = first?.point(0) ?? { x: bounds.x * stations[index][0], y: bounds.y * stations[index][1] };
    const pointAt = (time: number): Point => {
      const entryEnd = first?.start ?? 940;
      if (time < entryEnd) {
        const amount = bezier(clamp(time / entryEnd), [0.77, 0, 0.175, 1]);
        return { x: origin.x + (arrival.x - origin.x) * amount, y: origin.y + (arrival.y - origin.y) * amount };
      }
      let from = { time: entryEnd, ...arrival };
      for (const task of tasks) {
        if (time < task.start) {
          const amount = bezier(clamp((time - from.time) / (task.start - from.time)), [0.77, 0, 0.175, 1]);
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
    pointer.innerHTML = `<svg class="swarm-arrow" viewBox="-17 -11 22 22" width="20" height="20" aria-hidden="true"><path transform="translate(-1 0)" d="M1 0-14-8-10 0-14 8 1 0Z"/></svg><svg class="swarm-crosshair" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M10 2v16M2 10h16"/></svg><svg class="swarm-ibeam" viewBox="0 0 16 24" width="16" height="24" aria-hidden="true"><path d="M4 3h8M8 3v18M4 21h8"/></svg><svg class="swarm-eyedropper" viewBox="-2 -22 24 24" width="24" height="24" aria-hidden="true"><path d="M0 0 3-7 13-17 17-13 7-3Z M11-19 19-11 21-13 13-21Z"/><path d="m3-7 4 4" fill="none"/></svg>`;
    const samples = new Set(Array.from({ length: Math.ceil(contentDuration / 8) + 1 }, (_, n) => Math.min(contentDuration, n * 8)));
    tasks.forEach(task => { samples.add(task.start); samples.add(task.start + task.duration); });
    animate(pointer, [...samples].sort((a, b) => a - b).map(time => {
      const point = pointAt(time);
      return { offset: time / contentDuration, transform: `translate3d(${point.x}px,${point.y}px,0)` };
    }), 0, contentDuration);
    for (const tool of ["arrow", "crosshair", "ibeam", "eyedropper"] as const) {
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
    for (const tool of ["arrow", "crosshair", "ibeam", "eyedropper"]) animate(pointer.querySelector(`.swarm-${tool}`)!, [{ opacity: tool === "arrow" ? 1 : 0 }, { opacity: tool === "arrow" ? 1 : 0 }], contentDuration, SWARM_EXIT_DURATION, "forwards");
    const duration = contentDuration + SWARM_EXIT_DURATION;
    const easeOut = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
    const lastTaskEnd = tasks.reduce((end, task) => Math.max(end, task.start + task.duration), 940);
    const fadeStart = Math.min(contentDuration, lastTaskEnd + 60);
    const fadeEnd = Math.min(contentDuration, fadeStart + 180);
    const visibility: Keyframe[] = [
      { offset: 0, opacity: 0, easing: easeOut },
      { offset: 120 / duration, opacity: 1 },
    ];
    if (contentDuration - fadeEnd >= 120) {
      visibility.push(
        { offset: fadeStart / duration, opacity: 1, easing: easeOut },
        { offset: fadeEnd / duration, opacity: 0 },
        { offset: contentDuration / duration, opacity: 0, easing: easeOut },
        { offset: (contentDuration + 120) / duration, opacity: 1 },
      );
    }
    visibility.push({ offset: 1, opacity: 1 });
    animate(pointer, visibility, 0, duration);
    fragment.append(pointer);
  });
  return { fragment, animations, duration: contentDuration + SWARM_EXIT_DURATION };
}
