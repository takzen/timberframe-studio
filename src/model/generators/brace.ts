import type { BraceDef, Element } from '../types';

const DEG = 180 / Math.PI;

/**
 * Knee brace: from a point on the post (lower) diagonally to the underside of the
 * beam (higher). The ends are mitred so they seat flat: the bottom face vertical
 * against the post, the top face horizontal against the beam. At 45° both come
 * out at 45°. `bothSides` mirrors a second copy to the other side of the post.
 */
export function generateBrace(def: BraceDef): Element[] {
  const arm = def.verticalArm ?? 0.6;
  const section = def.section ?? [0.08, 0.12];
  const zBottom = def.topLevel - arm;
  const dx = def.to[0] - def.from[0];
  const dy = def.to[1] - def.from[1];

  const reach = Math.hypot(dx, dy);
  const alpha = Math.atan2(arm, reach); // slope of the axis above horizontal
  const startMiter = alpha * DEG; // vertical face — seats against the post
  const endMiter = (alpha - Math.PI / 2) * DEG; // horizontal face — seats against the beam

  return (def.bothSides ? [1, -1] : [1]).map((sign, i) => ({
    id: `${def.id}-${i}`,
    fromPrimitive: def.id,
    name: 'brace',
    group: 'beams' as const,
    category: 'frame' as const,
    from: [def.from[0], def.from[1], zBottom] as [number, number, number],
    to: [def.from[0] + dx * sign, def.from[1] + dy * sign, def.topLevel] as [number, number, number],
    section,
    species: def.species,
    startMiter,
    endMiter,
  }));
}
