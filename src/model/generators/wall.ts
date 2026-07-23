import { findSheathing } from '../catalog';
import type { Category, Element, Vec2, Vec3, WallDef } from '../types';

/**
 * Stud wall: sill plate, top plate, studs every N cm, openings (windows/doors)
 * with headers, rough sills and cripple studs. Optional sheet sheathing with
 * cut-outs at the openings.
 */
export function generateWall(def: WallDef): Element[] {
  const z = def.z ?? 0;
  const H = def.height;
  const [th, depth] = def.section ?? [0.06, 0.14];
  const spacing = def.studSpacing ?? 0.6;

  const ux = def.to[0] - def.from[0];
  const uy = def.to[1] - def.from[1];
  const L = Math.hypot(ux, uy);
  const u: Vec2 = [ux / L, uy / L];
  const n: Vec2 = [-u[1], u[0]];
  const pos = (t: number): Vec2 => [def.from[0] + u[0] * t, def.from[1] + u[1] * t];

  const el: Element[] = [];
  let seq = 0;
  const addElement = (
    name: string,
    category: Category,
    from: Vec3,
    to: Vec3,
    section: Vec2,
    extra: Partial<Element> = {},
  ) =>
    el.push({
      id: `${def.id}-${seq++}`,
      fromPrimitive: def.id,
      name,
      group: 'walls',
      category,
      from,
      to,
      section,
      species: def.species,
      ...extra,
    });

  const horizontal = (name: string, t0: number, t1: number, zAxis: number, h: number) =>
    addElement(name, 'frame', [...pos(t0), zAxis], [...pos(t1), zAxis], [depth, h]);
  const stud = (t: number, z0: number, z1: number) =>
    addElement('stud', 'frame', [...pos(t), z0], [...pos(t), z1], [th, depth], {
      up: [n[0], n[1], 0],
    });

  horizontal('sillPlate', 0, L, z + th / 2, th);
  horizontal('topPlate', 0, L, z + H - th / 2, th);

  const zBottom = z + th;
  const zTop = z + H - th;
  const openings = [...(def.openings ?? [])].sort((a, b) => a.offset - b.offset);
  const sillOf = (o: (typeof openings)[number]) => o.sill ?? (o.type === 'door' ? 0 : 0.9);

  // stud grid: end studs flush with the wall ends + intermediate studs every `spacing`
  const candidates: number[] = [th / 2];
  for (let t = spacing; t < L - th; t += spacing) candidates.push(t);
  candidates.push(L - th / 2);

  const inOpening = (t: number) =>
    openings.some((o) => t > o.offset - th && t < o.offset + o.width + th);
  const full = candidates.filter((t) => !inOpening(t));
  // jamb studs on both sides of each opening
  for (const o of openings) {
    for (const t of [o.offset - th / 2, o.offset + o.width + th / 2]) {
      if (t > th / 4 && t < L - th / 4) full.push(t);
    }
  }
  full.sort((a, b) => a - b);
  const fullStuds = full.filter((t, i) => i === 0 || t - full[i - 1] > th * 0.9);
  for (const t of fullStuds) stud(t, zBottom, zTop);

  for (const o of openings) {
    const a = o.offset;
    const b = a + o.width;
    const sill = sillOf(o);
    const zOpeningTop = z + sill + o.height;
    const hHeader = Math.min(0.14, Math.max(0, z + H - th - zOpeningTop));
    if (hHeader > 0.02) {
      horizontal('header', a, b, zOpeningTop + hHeader / 2, hHeader);
      if (zTop - (zOpeningTop + hHeader) > 0.08) {
        for (const t of candidates) {
          if (t > a + th && t < b - th) stud(t, zOpeningTop + hHeader, zTop);
        }
      }
    }
    if (sill > th + 0.05) {
      const zRail = z + sill - th / 2;
      horizontal('roughSill', a, b, zRail, th);
      if (z + sill - th - zBottom > 0.08) {
        for (const t of candidates) {
          if (t > a + th && t < b - th) stud(t, zBottom, z + sill - th);
        }
      }
    }
  }

  if (def.sheathing) {
    const material = findSheathing(def.sheathing);
    const tPanel = material.thickness;
    const side = def.sheathingSide ?? 1;
    const offset = (depth / 2 + tPanel / 2) * side;
    const shift = (t: number): Vec2 => {
      const [x, y] = pos(t);
      return [x + n[0] * offset, y + n[1] * offset];
    };
    const panel = (t0: number, t1: number, z0: number, z1: number) => {
      if (t1 - t0 < 0.01 || z1 - z0 < 0.01) return;
      const zc = z + (z0 + z1) / 2;
      addElement('wallSheathing', 'sheathing', [...shift(t0), zc], [...shift(t1), zc], [tPanel, z1 - z0], {
        species: undefined,
        material: material.id,
      });
    };
    let t = 0;
    for (const o of openings) {
      const a = o.offset;
      const b = a + o.width;
      const sill = sillOf(o);
      panel(t, a, 0, H);
      panel(a, b, sill + o.height, H);
      panel(a, b, 0, sill);
      t = b;
    }
    panel(t, L, 0, H);
  }

  return el;
}
