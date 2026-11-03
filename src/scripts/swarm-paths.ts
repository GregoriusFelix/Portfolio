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

export function departureFrames(
  stops: Stop[],
  startTime: number,
  row: Point,
  distance: number,
  formation: number,
  exit: number,
  bounds: Point,
): Keyframe[] {
  const bounded = (time: number) => {
    const point = pathAt(stops, time);
    return {
      x: clamp(point.x, 10, bounds.x - 20),
      y: clamp(point.y, 10, bounds.y - 30),
    };
  };
  const start = bounded(startTime),
    before = bounded(startTime - 8),
    after = bounded(startTime + 8);
  const incoming = {
    x: (after.x - before.x) / 16,
    y: (after.y - before.y) / 16,
  };
  const flow = { x: distance / exit, y: 0 };
  const duration = formation + exit;
  const samples = Array.from({ length: 61 }, (_, index) => (duration * index) / 60);
  samples.push(formation);
  return samples
    .sort((a, b) => a - b)
    .map((time) => {
      const point =
        time <= formation
          ? hermite(start, row, incoming, flow, time, formation)
          : { x: row.x + flow.x * (time - formation), y: row.y };
      return {
        offset: time / duration,
        transform: `translate3d(${point.x}px,${point.y}px,0)`,
      };
    });
}
