import { findSheathing } from '../catalog';
import type { Element, MonoPitchRoofDef, Vec3 } from '../types';
import { distribute, offsetAboveAxis } from './util';

/**
 * Mono-pitch roof: rafters every N cm along the slope + a sheathing panel on the
 * rafters. `z` = level of the rafter underside at the low edge of the outline;
 * eaves lengthen the rafters at both ends, the sheathing extends sideways too.
 */
export function generateMonoPitchRoof(def: MonoPitchRoofDef): Element[] {
  const [x0, y0] = def.position;
  const [dx, dy] = def.size;
  const eaves = def.eaves ?? 0.3;
  const spacing = def.rafterSpacing ?? 0.6;
  const [rw, rh] = def.rafterSection ?? [0.06, 0.16];
  const sheathing = findSheathing(def.sheathing ?? 'osb22');
  const tSheathing = sheathing.thickness;
  const tg = Math.tan((def.pitch * Math.PI) / 180);

  // `s` — coordinate along the slope, `p` — along the horizontal edge
  const slopeAxis = def.slopeDirection.endsWith('x') ? 'x' : 'y';
  const [s0, s1] = slopeAxis === 'x' ? [x0, x0 + dx] : [y0, y0 + dy];
  const [p0, p1] = slopeAxis === 'x' ? [y0, y0 + dy] : [x0, x0 + dx];
  const sLow = def.slopeDirection.startsWith('-') ? s0 : s1;
  const zUnder = (s: number) => def.z + (sLow === s0 ? s - s0 : s1 - s) * tg;
  const pt = (s: number, p: number, z: number): Vec3 =>
    slopeAxis === 'x' ? [s, p, z] : [p, s, z];

  const eavesHigh = def.eavesHigh ?? eaves;
  const [eavesAtS0, eavesAtS1] = sLow === s0 ? [eaves, eavesHigh] : [eavesHigh, eaves];
  const sA = s0 - eavesAtS0;
  const sB = s1 + eavesAtS1;
  const el: Element[] = [];

  // structural: span between supports (outline edges, no eaves) along the slope
  const cosA = Math.cos((def.pitch * Math.PI) / 180) || 1;
  const span = (s1 - s0) / cosA;
  const planPt = (s: number, p: number): [number, number] =>
    slopeAxis === 'x' ? [s, p] : [p, s];

  distribute(p0 + rw / 2, p1 - rw / 2, spacing).forEach((p, i) => {
    const [from, to] = offsetAboveAxis(pt(sA, p, zUnder(sA)), pt(sB, p, zUnder(sB)), rh / 2);
    el.push({
      id: `${def.id}-rafter-${i}`,
      fromPrimitive: def.id,
      name: 'rafter',
      group: 'roofs',
      category: 'frame',
      from,
      to,
      section: [rw, rh],
      species: def.species,
      structural: {
        span,
        tributaryWidth: spacing,
        pitch: def.pitch,
        covering: sheathing.id,
        supports: [planPt(s0, p), planPt(s1, p)],
      },
    });
  });

  const pc = (p0 + p1) / 2;
  const [from, to] = offsetAboveAxis(pt(sA, pc, zUnder(sA)), pt(sB, pc, zUnder(sB)), rh + tSheathing / 2);
  el.push({
    id: `${def.id}-sheathing`,
    fromPrimitive: def.id,
    name: 'roofSheathing',
    group: 'roofs',
    category: 'sheathing',
    from,
    to,
    section: [p1 - p0 + 2 * eaves, tSheathing],
    material: sheathing.id,
  });

  return el;
}
