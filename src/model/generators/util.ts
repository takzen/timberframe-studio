import type { Vec3 } from '../types';

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const vecLength = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const elementLength = (el: { from: Vec3; to: Vec3 }): number =>
  vecLength(sub(el.to, el.from));

/**
 * Stock length needed for a member. With mitred ends the longer edge sticks out
 * beyond the axis distance — that is what gets ordered and cut.
 */
export function cutLength(el: {
  from: Vec3;
  to: Vec3;
  section: [number, number];
  startMiter?: number;
  endMiter?: number;
}): number {
  const rad = Math.PI / 180;
  const a = Math.tan((el.startMiter ?? 0) * rad);
  const b = Math.tan((el.endMiter ?? 0) * rad);
  return elementLength(el) + (el.section[1] / 2) * Math.abs(a - b);
}

/** Unit vector perpendicular to the from→to axis, as close to vertical as possible (Gram-Schmidt). */
export function upNormal(from: Vec3, to: Vec3): Vec3 {
  const diff = sub(to, from);
  const a = scale(diff, 1 / vecLength(diff));
  const n: Vec3 = [-a[2] * a[0], -a[2] * a[1], 1 - a[2] * a[2]];
  const d = vecLength(n);
  return d < 1e-6 ? [1, 0, 0] : scale(n, 1 / d);
}

/** Shifts the from→to axis by `o` along the up-normal (perpendicular to axis, upwards). */
export function offsetAboveAxis(from: Vec3, to: Vec3, o: number): [Vec3, Vec3] {
  const n = upNormal(from, to);
  return [add(from, scale(n, o)), add(to, scale(n, o))];
}

/**
 * Even positions from `from` to `to` (inclusive of the edges), with actual
 * spacing no greater than the nominal.
 */
export function distribute(from: number, to: number, spacing: number): number[] {
  const len = to - from;
  if (len <= 0) return [(from + to) / 2];
  const bays = Math.max(1, Math.ceil(len / spacing - 1e-9));
  return Array.from({ length: bays + 1 }, (_, i) => from + (len * i) / bays);
}
