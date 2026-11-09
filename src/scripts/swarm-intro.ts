import { bezier, clamp } from "./swarm-paths";
import { createSwarmScene, TOTAL, AGENTS, type Job } from "./swarm-scene";

export function initSwarmIntro() {
  const overlay = document.querySelector<HTMLElement>("#swarm-intro");
  const scene = document.querySelector<HTMLElement>("#swarm-scene");
  const skip = document.querySelector<HTMLButtonElement>("#skip-intro");
  const replay = document.querySelector<HTMLButtonElement>("#replay-intro");
  const pause = document.querySelector<HTMLButtonElement>("#pause-intro");
  const speed = document.querySelector<HTMLButtonElement>("#speed-intro");
  const status = document.querySelector<HTMLElement>("#intro-status");
  const layers = document.querySelector<HTMLElement>("#intro-layers");
  const progress = document.querySelector<HTMLElement>("#intro-progress");
  const progressFill = document.querySelector<HTMLElement>("#intro-progress-fill");
  const motionNote = document.querySelector<HTMLElement>("#intro-motion-note");
  if (!overlay || !scene || !skip || !replay || !pause || !speed || !status || !layers || !progress || !progressFill)
    return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const app = Array.from(
    document.querySelectorAll<HTMLElement>("body > header,body > main,body > footer,body > .skip-link"),
  );
  const key = "felix-portfolio:intro-v1";
  let active = false,
    preparing = false,
    paused = false;
  let rate = 1,
    generation = 0,
    monitorFrame = 0,
    buildDuration = TOTAL,
    contentDuration = TOTAL,
    scanDuration = 900;
  let animations: Animation[] = [],
    jobs: Job[] = [];
  let master: Animation | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let previousFocus: HTMLElement | null = null;
  let inertBefore: boolean[] = [];
  let savedOverflow = "";
  let drawCurve = [0.77, 0, 0.175, 1];

  function remember() {
    try {
      sessionStorage.setItem(key, "seen");
    } catch {}
  }
  function clearTimeline() {
    cancelAnimationFrame(monitorFrame);
    clearTimeout(deadline);
    animations.forEach((a) => a.cancel());
    animations = [];
    jobs = [];
    master = undefined;
  }
  function hide() {
    overlay!.hidden = true;
    scene!.replaceChildren();
    app.forEach((node, index) => {
      node.inert = inertBefore[index] ?? false;
    });
    document.documentElement.style.overflowY = savedOverflow;
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
  }
  function finish() {
    if (!active) return;
    active = false;
    generation++;
    remember();
    clearTimeline();
    hide();
  }
  function armDeadline() {
    clearTimeout(deadline);
    if (!paused && master)
      deadline = setTimeout(finish, Math.max(0, buildDuration - Number(master.currentTime ?? 0)) / rate + 3000);
  }
  function monitor() {
    if (!active || !master || paused) return;
    const time = Number(master.currentTime ?? 0);
    const done = jobs.filter((job) => time >= job.start + job.duration).length;
    const message = time < scanDuration ? "Scanning page…" : time >= contentDuration ? "Entering site…" : `${AGENTS} agents`;
    if (status!.textContent !== message) status!.textContent = message;
    const count = time < scanDuration ? "" : `${done} / ${jobs.length} layers`;
    if (layers!.textContent !== count) {
      layers!.textContent = count;
      progressFill!.style.transform = `scaleX(${done / Math.max(1, jobs.length)})`;
      progress!.setAttribute("aria-valuenow", String(Math.round((done / Math.max(1, jobs.length)) * 100)));
    }
    jobs.forEach((job) => {
      if (!job.drawing || time < job.start || time > job.start + job.duration) return;
      const progress = clamp((time - job.start) / job.duration);
      const initial = job.scaleFrom ?? 0.02;
      const amount = initial + (1 - initial) * (job.linear ? progress : bezier(progress, drawCurve));
      const label = job.measurement ? `${Math.round((job.measurement === "x" ? job.rect.width : job.rect.height) * amount)} px` : `${Math.round(job.rect.width * amount)} \u00d7 ${Math.round(job.rect.height * amount)}`;
      if (job.badge.textContent !== label) job.badge.textContent = label;
    });
    monitorFrame = requestAnimationFrame(monitor);
  }

  async function play() {
    if (active || preparing || reduced.matches || document.hidden) return;
    preparing = true;
    const request = generation;
    await document.fonts.ready;
    preparing = false;
    if (request !== generation || active || reduced.matches || document.hidden) return;
    previousFocus = document.activeElement as HTMLElement;
    window.scrollTo({ top: 0, behavior: "instant" });
    savedOverflow = document.documentElement.style.overflowY;
    document.documentElement.style.overflowY = "hidden";
    inertBefore = app.map((node) => node.inert);
    active = true;
    paused = false;
    rate = 1;
    jobs = [];
    pause!.textContent = "Pause";
    pause!.setAttribute("aria-pressed", "false");
    speed!.textContent = "1×";

    const built = createSwarmScene();
    animations = built.animations;
    jobs = built.jobs;
    contentDuration = built.contentDuration;
    scanDuration = built.scanDuration;
    drawCurve = built.drawCurve;
    scene!.replaceChildren(built.fragment);
    app.forEach((node) => {
      node.inert = true;
    });
    overlay!.setAttribute("role", "dialog");
    overlay!.setAttribute("aria-modal", "true");
    overlay!.setAttribute("aria-label", "Animated portfolio introduction");
    overlay!.hidden = false;
    skip!.focus({ preventScroll: true });
    status!.textContent = "Scanning page…";
    layers!.textContent = "";
    progressFill!.style.transform = "scaleX(0)";
    buildDuration = built.duration;
    master = scene!.animate([{ opacity: 1 }, { opacity: 1 }], {
      duration: buildDuration,
      easing: "linear",
      fill: "both",
    });
    animations.push(master);
    const epoch = Number(document.timeline.currentTime ?? 0) + 32;
    animations.forEach((a) => {
      a.startTime = epoch;
    });
    master.finished.then(finish).catch(() => {});
    armDeadline();
    monitor();
  }

  const safePlay = () => {
    void play().catch(() => {
      preparing = false;
      finish();
    });
  };
  skip.addEventListener("click", finish);
  replay.addEventListener("click", safePlay);
  pause.addEventListener("click", () => {
    if (!active || !master) return;
    const time = Number(master.currentTime ?? 0);
    paused = !paused;
    if (paused)
      animations.forEach((a) => {
        a.pause();
        a.currentTime = time;
      });
    else {
      const epoch = Number(document.timeline.currentTime ?? 0);
      animations.forEach((a) => {
        a.playbackRate = rate;
        a.play();
        a.startTime = epoch - time / rate;
      });
    }
    pause.textContent = paused ? "Resume" : "Pause";
    pause.setAttribute("aria-pressed", String(paused));
    cancelAnimationFrame(monitorFrame);
    armDeadline();
    if (!paused) monitor();
  });
  speed.addEventListener("click", () => {
    if (!active) return;
    rate = rate === 3 ? 1 : rate + 1;
    animations.forEach((a) => a.updatePlaybackRate(rate));
    speed.textContent = `${rate}×`;
    armDeadline();
  });
  document.addEventListener("keydown", (event) => {
    if (!active) return;
    if (event.key === "Escape") finish();
    if (event.key === "Tab") {
      const controls = Array.from(
        overlay.querySelectorAll<HTMLButtonElement>(".intro-toolbar button:not([hidden]):not([disabled])"),
      );
      const index = controls.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();
      controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
    }
  });
  window.addEventListener("resize", finish, { passive: true });
  window.addEventListener("pagehide", () => {
    generation++;
    finish();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      generation++;
      finish();
    }
  });
  const syncMotionPreference = () => {
    replay.hidden = reduced.matches;
    if (motionNote) motionNote.hidden = !reduced.matches;
    if (reduced.matches) {
      generation++;
      finish();
    }
  };
  reduced.addEventListener("change", syncMotionPreference);
  syncMotionPreference();
  let seen = false;
  try {
    seen = sessionStorage.getItem(key) === "seen";
  } catch {}
  const forceIntro = new URLSearchParams(location.search).get("intro") === "1";
  if (!reduced.matches && (forceIntro || (!seen && !location.hash && window.scrollY < 20))) safePlay();
}
