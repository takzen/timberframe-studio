import type { Vec2 } from '../model/types';

/** Plan view: centre in metres + scale px/m. */
export interface View {
  cx: number;
  cy: number;
  scale: number;
}

export interface Size {
  w: number;
  h: number;
}

export const toScreen = (p: Vec2, v: View, r: Size): Vec2 => [
  (p[0] - v.cx) * v.scale + r.w / 2,
  r.h / 2 - (p[1] - v.cy) * v.scale,
];

export const toWorld = (p: Vec2, v: View, r: Size): Vec2 => [
  (p[0] - r.w / 2) / v.scale + v.cx,
  v.cy - (p[1] - r.h / 2) / v.scale,
];

/** SVG group transform: world (Y up, metres) → screen (Y down, pixels). */
export const groupTransform = (v: View, r: Size) =>
  `translate(${r.w / 2} ${r.h / 2}) scale(${v.scale} ${-v.scale}) translate(${-v.cx} ${-v.cy})`;

export const snapToGrid = (p: Vec2, step: number): Vec2 => [
  Math.round(p[0] / step) * step,
  Math.round(p[1] / step) * step,
];

export const dist = (a: Vec2, b: Vec2) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Four corners of a rectangle with axis a→b and the given width (in metres). */
export function bandAlongAxis(a: Vec2, b: Vec2, width: number): Vec2[] {
  const L = dist(a, b) || 1;
  const nx = (-(b[1] - a[1]) / L) * (width / 2);
  const ny = ((b[0] - a[0]) / L) * (width / 2);
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
}

export const toPoints = (pts: Vec2[]) => pts.map((p) => `${p[0]},${p[1]}`).join(' ');

/** Rectangle from two opposite corners: min position + positive dimensions. */
export const rectFromPoints = (a: Vec2, b: Vec2) => ({
  position: [Math.min(a[0], b[0]), Math.min(a[1], b[1])] as Vec2,
  size: [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])] as Vec2,
});

/** Distance of a point from a segment — for hit-testing walls and beams. */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return dist(p, a);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}
