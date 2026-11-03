export type Point = { x: number; y: number };
export type Stop = Point & { time: number };

export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));

function hermite(
  start: Point,
  end: Point,
  velocityIn: Point,
  velocityOut: Point,
  time: number,
  duration: number,
): Point {
  const t = clamp(time / duration),
    t2 = t * t,
    t3 = t2 * t;
  const axis = (key: keyof Point) =>
    (2 * t3 - 3 * t2 + 1) * start[key] +
    (t3 - 2 * t2 + t) * velocityIn[key] * duration +
    (-2 * t3 + 3 * t2) * end[key] +
    (t3 - t2) * velocityOut[key] * duration;
  return { x: axis("x"), y: axis("y") };
}

export function pathAt(stops: Stop[], time: number): Point {
  let index = 0;
  while (index < stops.length - 2 && time > stops[index + 1].time) index++;
  const start = stops[index],
    end = stops[index + 1];
  const before = stops[Math.max(0, index - 1)],
    after = stops[Math.min(stops.length - 1, index + 2)];
  const velocity = (a: Stop, b: Stop) => ({
    x: (b.x - a.x) / Math.max(1, b.time - a.time),
    y: (b.y - a.y) / Math.max(1, b.time - a.time),
  });
  return hermite(start, end, velocity(before, end), velocity(start, after), time - start.time, end.time - start.time);
}

export function bezier(t: number, points: number[]): number {
  const [x1, y1, x2, y2] = points;
  const curve = (v: number, a: number, b: number) =>
    3 * (1 - v) * (1 - v) * v * a + 3 * (1 - v) * v * v * b + v * v * v;
  let low = 0,
    high = 1;
  for (let i = 0; i < 12; i++) {
    const middle = (low + high) / 2;
    if (curve(middle, x1, x2) < t) low = middle;
    else high = middle;
  }
  return curve((low + high) / 2, y1, y2);
}

export const SWARM_EXIT_DURATION = 1740;

export function swarmExit(
  workPoint: (time: number) => Point,
  startTime: number,
  index: number,
  count: number,
  bounds: Point,
) {
  const gather = 420, orbit = 720, scatter = 600;
  const center = { x: bounds.x / 2, y: bounds.y / 2 };
  const radius = Math.min(88, Math.max(38, Math.min(bounds.x, bounds.y) * 0.13));
  const phase = index * Math.PI * 2 / count;
  const angularSpeed = Math.PI * 2 / orbit;
  const circle = (angle: number) => ({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
  const tangent = (angle: number) => ({ x: -Math.sin(angle) * radius * angularSpeed, y: Math.cos(angle) * radius * angularSpeed });
  const start = workPoint(startTime), before = workPoint(startTime - 8);
  const incoming = { x: (start.x - before.x) / 8, y: (start.y - before.y) / 8 };
  const ring = circle(phase), velocity = tangent(phase);
  const distance = Math.hypot(bounds.x, bounds.y) / 2 + 120;
  const destination = { x: center.x + Math.cos(phase) * distance, y: center.y + Math.sin(phase) * distance };
  const outward = { x: Math.cos(phase) * distance * 2 / scatter, y: Math.sin(phase) * distance * 2 / scatter };
  const pointAt = (time: number): Point => {
    if (time <= gather) return hermite(start, ring, incoming, velocity, time, gather);
    if (time <= gather + orbit) return circle(phase + (time - gather) * angularSpeed);
    return hermite(ring, destination, velocity, outward, time - gather - orbit, scatter);
  };
  const times = Array.from(new Set([...Array.from({ length: 219 }, (_, n) => Math.min(SWARM_EXIT_DURATION, n * 8)), gather, gather + orbit, SWARM_EXIT_DURATION])).sort((a, b) => a - b);
  const positions: Keyframe[] = [], rotations: Keyframe[] = [];
  let previous = -135;
  for (const time of times) {
    const point = pointAt(time);
    const before = pointAt(Math.max(0, time - 1)), after = pointAt(Math.min(SWARM_EXIT_DURATION, time + 1));
    let angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    while (angle - previous > 180) angle -= 360;
    while (angle - previous < -180) angle += 360;
    if (time < 100) angle = -135 + (angle + 135) * bezier(time / 100, [0.23, 1, 0.32, 1]);
    previous = angle;
    positions.push({ offset: time / SWARM_EXIT_DURATION, transform: `translate3d(${point.x}px,${point.y}px,0)` });
    rotations.push({ offset: time / SWARM_EXIT_DURATION, transform: `rotate(${angle}deg)` });
  }
  return { positions, rotations };
}
