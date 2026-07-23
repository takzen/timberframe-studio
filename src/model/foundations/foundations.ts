import { findConcrete } from '../catalog';
import { memberLoad } from '../structural/loads';
import { solveLoadPath } from '../structural/loadPath';
import type { Status, StructuralSettings } from '../structural/types';
import type { Element, SlabDef, PrimitiveDef, Vec2 } from '../types';
import type { FoundationAnalysis, FoundationSettings, SlabResult, FootingResult } from './types';

const CONCRETE_WEIGHT = 24; // kN/m³
const round = (v: number, m = 100) => Math.round(v * m) / m;
const statusOf = (u: number): Status => (u > 1 ? 'over' : u > 0.9 ? 'warn' : 'ok');
/** Rounds the footing side up to 5 cm. */
const toModule = (a: number) => Math.ceil(a / 0.05) * 0.05;

/** Sizes a footing under a single post: side from the soil bearing. */
function sizeFooting(
  postId: string,
  point: Vec2,
  Nd: number,
  f: FoundationSettings,
  pricePerM3: number,
): FootingResult {
  const aRequired = Math.sqrt(Math.max(Nd, 0) / f.soilBearing); // A = N/q
  const side = Math.max(f.minFooting, toModule(aRequired));
  const pressure = Nd / (side * side); // kPa
  const volume = side * side * f.footingThickness;
  return {
    postId,
    point,
    side: round(side),
    thickness: f.footingThickness,
    Nd: round(Nd),
    pressure: round(pressure),
    utilisation: pressure / f.soilBearing,
    status: statusOf(pressure / f.soilBearing),
    volume: round(volume, 1000),
    cost: round(volume * pricePerM3),
  };
}

/** Footing block for visualisation — a square block under the post axis. */
function footingBlock(w: FootingResult, concreteId: string): Element {
  const [x, y] = w.point;
  return {
    id: `footing-${w.postId}`,
    fromPrimitive: w.postId, // selecting the post highlights its footing
    name: 'footing',
    group: 'foundations',
    category: 'foundation',
    from: [x, y, -w.thickness],
    to: [x, y, 0],
    section: [w.side, w.side],
    up: [1, 0, 0],
    concrete: concreteId,
  };
}

const inRect = (p: Vec2, pos: Vec2, size: Vec2) =>
  p[0] >= pos[0] && p[0] <= pos[0] + size[0] && p[1] >= pos[1] && p[1] <= pos[1] + size[1];

/** Checks a slab: pressure = (roof load above the slab + self-weight) / area. */
function checkSlab(
  def: SlabDef,
  elements: Element[],
  s: StructuralSettings,
  f: FoundationSettings,
  pricePerM3: number,
): SlabResult {
  const [dx, dy] = def.size;
  const area = dx * dy;
  const volume = area * def.thickness;

  // design roof load whose supports project onto the slab
  let Nd = 0;
  for (const el of elements) {
    const st = el.structural;
    if (!st?.supports || st.imposed) continue;
    const inside = st.supports.some((p) => inRect(p, def.position, def.size));
    if (!inside) continue;
    const o = memberLoad(el, s);
    if (o) Nd += 1.35 * o.gk * o.span + 1.5 * o.qk * o.span;
  }
  Nd += 1.35 * CONCRETE_WEIGHT * volume; // slab self-weight

  const pressure = Nd / area;
  return {
    primitiveId: def.id,
    area: round(area),
    thickness: def.thickness,
    volume: round(volume, 1000),
    pressure: round(pressure),
    utilisation: pressure / f.soilBearing,
    status: statusOf(pressure / f.soilBearing),
    cost: round(volume * pricePerM3),
  };
}

/** Full foundation design: post footings + slab checks. */
export function analyseFoundations(
  primitives: PrimitiveDef[],
  elements: Element[],
  structural: StructuralSettings,
  f: FoundationSettings,
): FoundationAnalysis {
  const concrete = findConcrete(f.concreteClass);
  const { posts } = solveLoadPath(elements, structural);

  // footings only under free-standing posts; wall studs bear on the sill/slab
  const footings = posts
    .filter((p) => p.name !== 'stud')
    .map((p) => sizeFooting(p.id, p.point, p.Nd, f, concrete.pricePerM3));
  const footingElements = footings.map((w) => footingBlock(w, concrete.id));

  const slabs = primitives
    .filter((p): p is SlabDef => p.type === 'slab')
    .map((p) => checkSlab(p, elements, structural, f, concrete.pricePerM3));

  const volume =
    footings.reduce((v, w) => v + w.volume, 0) + slabs.reduce((v, sl) => v + sl.volume, 0);
  const cost = footings.reduce((k, w) => k + w.cost, 0) + slabs.reduce((k, sl) => k + sl.cost, 0);

  return {
    footings,
    slabs,
    footingElements,
    concreteVolume: round(volume, 1000),
    cost: round(cost),
  };
}
