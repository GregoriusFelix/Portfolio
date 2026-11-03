export type Point = { x: number; y: number };
export type CursorTask = {
  start: number;
  duration: number;
  label: string;
  tool: "arrow" | "crosshair" | "ibeam";
  point: (progress: number) => Point;
};
