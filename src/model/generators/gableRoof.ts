import { findSheathing } from '../catalog';
import type { Element, GableRoofDef, Vec3 } from '../types';
import { distribute, offsetAboveAxis } from './util';

/**
 * Gable roof: ridge beam + pairs of rafters every N cm + sheathing on two slopes.
 * `z` = level of the rafter underside at the eave edges of the outline.
 */
export function generateGableRoof(def: GableRoofDef): Element[] {
  const [x0, y0] = def.position;
  const [dx, dy] = def.size;
  const eaves = def.eaves ?? 0.4;
  const spacing = def.rafterSpacing ?? 0.6;
  const [rw, rh] = def.rafterSection ?? [0.06, 0.18];
  const sheathing = findSheathing(def.sheathing ?? 'osb22');
  const tSheathing = sheathing.thickness;
  const [bw, bh] = def.ridgeSection ?? [0.08, 0.18];
  const tg = Math.tan((def.pitch * Math.PI) / 180);

  // `k` — coordinate along the ridge, `s` — across it (slope direction)
  const ridge = def.ridgeDirection;
  const [k0, k1] = ridge === 'x' ? [x0, x0 + dx] : [y0, y0 + dy];
  const [s0, s1] = ridge === 'x' ? [y0, y0 + dy] : [x0, x0 + dx];
  const sMid = (s0 + s1) / 2;
  const zUnder = (s: number) => def.z + ((s1 - s0) / 2 - Math.abs(s - sMid)) * tg;
  const zRidge = zUnder(sMid);
  const pt = (k: number, s: number, z: number): Vec3 =>
    ridge === 'x' ? [k, s, z] : [s, k, z];

  const el: Element[] = [];

  el.push({
    id: `${def.id}-ridge`,
    fromPrimitive: def.id,
    name: 'ridgeBeam',
    group: 'roofs',
    category: 'frame',
    from: pt(k0 - eaves, sMid, zRidge - bh / 2),
    to: pt(k1 + eaves, sMid, zRidge - bh / 2),
    section: [bw, bh],
    species: def.species,
  });

  const rafterPositions = distribute(k0 + rw / 2, k1 - rw / 2, spacing);
  const kMid = (k0 + k1) / 2;

  // structural: rafter span = from the eave (outline edge) to the ridge, along the slope
  const cosA = Math.cos((def.pitch * Math.PI) / 180) || 1;
  const rafterSpan = (s1 - s0) / 2 / cosA;
  const planPt = (k: number, s: number): [number, number] =>
    ridge === 'x' ? [k, s] : [s, k];
  const eaveOf = [s0, s1]; // eave edge (support) of each slope

  // two slopes: from eaves to ridge (rafters bear on the ridge beam)
  const slopes = [
    { sEave: s0 - eaves, sRidge: sMid - bw / 2 },
    { sEave: s1 + eaves, sRidge: sMid + bw / 2 },
  ];
  slopes.forEach(({ sEave, sRidge }, slope) => {
    rafterPositions.forEach((k, i) => {
      const [from, to] = offsetAboveAxis(
        pt(k, sEave, zUnder(sEave)),
        pt(k, sRidge, zUnder(sRidge)),
        rh / 2,
      );
      el.push({
        id: `${def.id}-rafter-${slope}-${i}`,
        fromPrimitive: def.id,
        name: 'rafter',
        group: 'roofs',
        category: 'frame',
        from,
        to,
        section: [rw, rh],
        species: def.species,
        structural: {
          span: rafterSpan,
          tributaryWidth: spacing,
          pitch: def.pitch,
          covering: sheathing.id,
          // supports: this slope's eave edge and the ridge; the ridge (index 1) is
          // a couple roof — its reaction flows to the eave, not to the ridge beam
          supports: [planPt(k, eaveOf[slope]), planPt(k, sMid)],
          balanced: [1],
        },
      });
    });

    const [from, to] = offsetAboveAxis(
      pt(kMid, sEave, zUnder(sEave)),
      pt(kMid, sMid, zRidge),
      rh + tSheathing / 2,
    );
    el.push({
      id: `${def.id}-sheathing-${slope}`,
      fromPrimitive: def.id,
      name: 'roofSheathing',
      group: 'roofs',
      category: 'sheathing',
      from,
      to,
      section: [k1 - k0 + 2 * eaves, tSheathing],
      material: sheathing.id,
    });
  });

  return el;
}
