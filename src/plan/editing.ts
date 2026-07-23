import type { PrimitiveDef, Vec2 } from '../model/types';
import { rectFromPoints } from './geometry';

export interface Handle {
  id: string;
  point: Vec2;
}

const rectCorners = (pos: Vec2, size: Vec2): Record<string, Vec2> => ({
  p00: [pos[0], pos[1]],
  p10: [pos[0] + size[0], pos[1]],
  p01: [pos[0], pos[1] + size[1]],
  p11: [pos[0] + size[0], pos[1] + size[1]],
});

const OPPOSITE: Record<string, string> = { p00: 'p11', p11: 'p00', p10: 'p01', p01: 'p10' };

const asRect = (def: PrimitiveDef) =>
  def.type === 'deck' || def.type === 'monoPitchRoof' || def.type === 'gableRoof' || def.type === 'slab'
    ? { position: def.position, size: def.size }
    : null;

/** Points you can grab to reshape the selected element. */
export function handles(def: PrimitiveDef): Handle[] {
  const r = asRect(def);
  if (r) return Object.entries(rectCorners(r.position, r.size)).map(([id, point]) => ({ id, point }));
  if (def.type === 'wall' || def.type === 'brace')
    return [
      { id: 'from', point: def.from },
      { id: 'to', point: def.to },
    ];
  if (def.type === 'beam')
    return [
      { id: 'from', point: [def.from[0], def.from[1]] },
      { id: 'to', point: [def.to[0], def.to[1]] },
    ];
  return [];
}

/** Anchor point of an element — snapped to the grid when moving. */
export function anchor(def: PrimitiveDef): Vec2 {
  const r = asRect(def);
  if (r) return r.position;
  if (def.type === 'wall' || def.type === 'brace') return def.from;
  if (def.type === 'beam') return [def.from[0], def.from[1]];
  return def.position;
}

/** Points worth snapping drawing and editing to (corners, ends, post axes). */
export function snapPoints(primitives: PrimitiveDef[], skipId?: string): Vec2[] {
  const points: Vec2[] = [];
  for (const def of primitives) {
    if (def.id === skipId) continue;
    points.push(...handles(def).map((h) => h.point));
    if (def.type === 'post') points.push(def.position);
  }
  return points;
}

/** Moves the whole element by a vector. */
export function moveBy(def: PrimitiveDef, dx: number, dy: number): Partial<PrimitiveDef> {
  switch (def.type) {
    case 'wall':
    case 'brace':
      return {
        from: [def.from[0] + dx, def.from[1] + dy],
        to: [def.to[0] + dx, def.to[1] + dy],
      };
    case 'beam':
      return {
        from: [def.from[0] + dx, def.from[1] + dy, def.from[2]],
        to: [def.to[0] + dx, def.to[1] + dy, def.to[2]],
      };
    case 'post':
      return { position: [def.position[0] + dx, def.position[1] + dy] };
    default:
      return { position: [def.position[0] + dx, def.position[1] + dy] };
  }
}

/** Moves a single handle to the given point. */
export function moveHandle(def: PrimitiveDef, handle: string, p: Vec2): Partial<PrimitiveDef> | null {
  const r = asRect(def);
  if (r) {
    const fixed = rectCorners(r.position, r.size)[OPPOSITE[handle]];
    if (!fixed) return null;
    const next = rectFromPoints(fixed, p);
    if (next.size[0] < 0.1 || next.size[1] < 0.1) return null;
    return next;
  }
  if (def.type === 'wall' || def.type === 'brace') return handle === 'from' ? { from: p } : { to: p };
  if (def.type === 'beam')
    return handle === 'from'
      ? { from: [p[0], p[1], def.from[2]] }
      : { to: [p[0], p[1], def.to[2]] };
  return null;
}

/**
 * Snapping: first to a nearby point of existing geometry (within `radiusPx`),
 * and when there is none — to the grid.
 */
export function smartSnap(
  p: Vec2,
  points: Vec2[],
  step: number,
  radiusPx: number,
  scale: number,
): { point: Vec2; snapped: boolean } {
  const radius = radiusPx / scale;
  let nearest: Vec2 | null = null;
  let best = radius;
  for (const q of points) {
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < best) {
      best = d;
      nearest = q;
    }
  }
  if (nearest) return { point: [...nearest], snapped: true };
  return {
    point: [Math.round(p[0] / step) * step, Math.round(p[1] / step) * step],
    snapped: false,
  };
}
