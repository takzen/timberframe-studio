// Load path: roof → beam → post. Distributes rafter reactions onto beams, beam
// reactions onto posts, and checks beams (bending) and posts (buckling).
//
// Simplifications (Phase 2): a multi-span beam is treated as a series of simply-
// supported spans between consecutive supports (not a continuous beam); rafter
// reactions are collected as a uniform load; a post is pinned at both ends (β=1).

import { findSpecies } from '../catalog';
import type { Element, Vec2 } from '../types';
import { buildResult, checkBending, checkCompression } from './checks';
import { memberLoad, selfWeightLine } from './loads';
import type { Check, MemberResult, StructuralSettings } from './types';
import { HOLD_DOWN_CAPACITY, roofUpliftPressure } from './wind';

const TOL = 0.25; // tolerance matching a support to a beam/post in plan [m]

const BEAM_NAMES = new Set(['beam', 'eavesBeam', 'canopyBeam', 'ledgerBeam', 'ridgeBeam']);
const isPostLike = (name: string) => name === 'post' || name === 'canopyPost' || name === 'stud';
// hold-down (base anchor uplift) is a discrete-post check; a wall stud is
// anchored through the sill plate as a system, not by its own base, so it is
// excluded — wall uplift anchorage is out of scope (see the disclaimer)
const isColumn = (name: string) => name === 'post' || name === 'canopyPost';

interface Reaction {
  point: Vec2;
  /** Reaction from permanent / variable load [kN]. */
  Rg: number;
  Rq: number;
  /** Upward reaction from wind uplift [kN]. */
  Rw: number;
}

const dist2 = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Distance of a point from a segment in plan, and the projection distance along it. */
function projectOnSegment(p: Vec2, a: Vec2, b: Vec2): { d: number; along: number; length: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  const L = Math.sqrt(L2);
  if (L2 < 1e-9) return { d: dist2(p, a), along: 0, length: 0 };
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const proj: Vec2 = [a[0] + t * dx, a[1] + t * dy];
  return { d: dist2(p, proj), along: t * L, length: L };
}

/**
 * Vertical reactions of every rafter at its supports. The total load (g·L, q·L)
 * splits evenly between the non-balanced supports — for a couple (gable) roof
 * everything flows to the eaves, for a mono-pitch roof it splits in half. The
 * wind uplift acts on the plan (horizontal) area, so it uses the horizontal run
 * L·cosα, and it splits the same way — an upward reaction at the same supports.
 */
function rafterReactions(elements: Element[], s: StructuralSettings): Reaction[] {
  const r: Reaction[] = [];
  for (const el of elements) {
    const st = el.structural;
    if (!st?.supports || st.imposed) continue; // roof members only (not joists)
    const o = memberLoad(el, s);
    if (!o) continue;
    const balanced = new Set(st.balanced ?? []);
    const active = st.supports.map((_, i) => i).filter((i) => !balanced.has(i));
    if (active.length === 0) continue;
    const cosA = Math.cos((st.pitch * Math.PI) / 180) || 1;
    const zRef = Math.max(el.from[2], el.to[2]);
    const wk = roofUpliftPressure(s, st.pitch, zRef); // net uplift [kN/m²]
    const Rg = (o.gk * o.span) / active.length;
    const Rq = (o.qk * o.span) / active.length;
    const Rw = (wk * st.tributaryWidth * o.span * cosA) / active.length;
    for (const i of active) r.push({ point: st.supports[i], Rg, Rq, Rw });
  }
  return r;
}

/** Checks a beam under the collected reactions and returns its support reactions. */
function checkBeam(
  beam: Element,
  reactions: Reaction[],
  postsAlong: number[],
  s: StructuralSettings,
): { result: MemberResult; supportReactions: Reaction[] } {
  const a: Vec2 = [beam.from[0], beam.from[1]];
  const b: Vec2 = [beam.to[0], beam.to[1]];
  const { length } = projectOnSegment(a, a, b);
  const span = length || dist2(a, b);
  const dir: Vec2 = [(b[0] - a[0]) / (span || 1), (b[1] - a[1]) / (span || 1)];
  const toPoint = (along: number): Vec2 => [a[0] + dir[0] * along, a[1] + dir[1] * along];

  const mech = findSpecies(beam.species).mech;
  const gSelf = selfWeightLine(beam);

  // beam supports: its ends + posts under it, sorted along the axis
  const supports = [0, span, ...postsAlong].sort((x, y) => x - y);
  const unique = supports.filter((t, i) => i === 0 || t - supports[i - 1] > TOL);

  const supportReactions: Reaction[] = unique.map((t) => ({ point: toPoint(t), Rg: 0, Rq: 0, Rw: 0 }));
  const worstChecks: Check[] = [];
  let maxU = -1;
  let govSpan = span;

  // each bay between consecutive supports as a simply-supported beam
  for (let i = 0; i < unique.length - 1; i++) {
    const tA = unique[i];
    const tB = unique[i + 1];
    const bay = tB - tA;
    if (bay < 0.05) continue;
    const inBay = reactions.filter((r) => {
      const along = projectOnSegment(r.point, a, b).along;
      return along >= tA - TOL && along < tB + TOL;
    });
    const sumRg = inBay.reduce((s2, r) => s2 + r.Rg, 0);
    const sumRq = inBay.reduce((s2, r) => s2 + r.Rq, 0);
    const sumRw = inBay.reduce((s2, r) => s2 + r.Rw, 0);
    const gk = sumRg / bay + gSelf; // equivalent uniform load [kN/m]
    const qk = sumRq / bay;

    const checks = checkBending({
      L: bay,
      gk,
      qk,
      b: beam.section[0],
      h: beam.section[1],
      mech,
      cls: s.serviceClass,
    });
    const m = Math.max(...checks.map((x) => x.utilisation));
    if (m > maxU) {
      maxU = m;
      worstChecks.length = 0;
      worstChecks.push(...checks);
      govSpan = bay;
    }
    // bay reactions to both supports (uniform load → half each)
    supportReactions[i].Rg += (gk * bay) / 2;
    supportReactions[i].Rq += (qk * bay) / 2;
    supportReactions[i].Rw += sumRw / 2;
    supportReactions[i + 1].Rg += (gk * bay) / 2;
    supportReactions[i + 1].Rq += (qk * bay) / 2;
    supportReactions[i + 1].Rw += sumRw / 2;
  }

  const result = buildResult(beam, worstChecks, govSpan, { kind: 'beam', grade: mech.grade });
  return { result, supportReactions };
}

/** A post with its computed axial force — for the check and for footing design. */
export interface LoadedPost {
  id: string;
  name: string;
  point: Vec2;
  section: [number, number];
  species?: string;
  length: number;
  /** Design axial force N_d [kN] (with the post self-weight). */
  Nd: number;
}

/**
 * Solves the load path: rafter reactions → beams → posts. Returns the beam and
 * post check results plus the axial forces on posts (for the foundations).
 */
export function solveLoadPath(
  elements: Element[],
  s: StructuralSettings,
): { results: MemberResult[]; posts: LoadedPost[] } {
  const beams = elements.filter((e) => BEAM_NAMES.has(e.name));
  const posts = elements.filter((e) => isPostLike(e.name));
  const postPoint = (p: Element): Vec2 => [p.from[0], p.from[1]];

  const rafters = rafterReactions(elements, s);

  // accumulator of post axial load (Ng/Nq downward, Nw upward wind uplift)
  const postAxial = new Map<string, { Ng: number; Nq: number; Nw: number }>();
  for (const p of posts) postAxial.set(p.id, { Ng: 0, Nq: 0, Nw: 0 });
  const addToPost = (point: Vec2, Rg: number, Rq: number, Rw: number): boolean => {
    let nearest: Element | null = null;
    let nd = TOL;
    for (const p of posts) {
      const d = dist2(point, postPoint(p));
      if (d < nd) {
        nd = d;
        nearest = p;
      }
    }
    if (nearest) {
      const acc = postAxial.get(nearest.id)!;
      acc.Ng += Rg;
      acc.Nq += Rq;
      acc.Nw += Rw;
      return true;
    }
    return false;
  };

  // 1) rafter reactions → beams (nearest within reach), the rest → posts directly
  const onBeam = new Map<string, Reaction[]>();
  for (const beam of beams) onBeam.set(beam.id, []);
  for (const r of rafters) {
    let nearest: Element | null = null;
    let nd = TOL;
    for (const beam of beams) {
      const d = projectOnSegment(r.point, [beam.from[0], beam.from[1]], [beam.to[0], beam.to[1]]).d;
      if (d < nd) {
        nd = d;
        nearest = beam;
      }
    }
    if (nearest) onBeam.get(nearest.id)!.push(r);
    else addToPost(r.point, r.Rg, r.Rq, r.Rw); // rafter straight onto a post
  }

  // 2) check beams, pass their reactions onto posts
  const results: MemberResult[] = [];
  for (const beam of beams) {
    const a: Vec2 = [beam.from[0], beam.from[1]];
    const b: Vec2 = [beam.to[0], beam.to[1]];
    const postsAlong = posts
      .map((p) => projectOnSegment(postPoint(p), a, b))
      .filter((r) => r.d < TOL)
      .map((r) => r.along);
    const { result, supportReactions } = checkBeam(beam, onBeam.get(beam.id)!, postsAlong, s);
    results.push(result);
    for (const sr of supportReactions) addToPost(sr.point, sr.Rg, sr.Rq, sr.Rw);
  }

  // 3) check posts in buckling and collect their axial loads
  const loadedPosts: LoadedPost[] = [];
  for (const p of posts) {
    const { Ng, Nq, Nw } = postAxial.get(p.id)!;
    const length = Math.abs(p.to[2] - p.from[2]) || 2.4;
    const mech = findSpecies(p.species).mech;
    const gSelf = selfWeightLine(p) * length;
    const gPerm = Ng + gSelf;
    const checks = checkCompression({
      Ng: gPerm,
      Nq,
      b: p.section[0],
      h: p.section[1],
      L: length,
      mech,
      cls: s.serviceClass,
    });
    // hold-down: net tension at the base under wind uplift, permanent load
    // favourable (γ_G = 1.0), wind leading (γ_Q = 1.5). Snow omitted — favourable.
    const Td = isColumn(p.name) ? 1.5 * Nw - 1.0 * gPerm : 0;
    if (Td > 0) {
      checks.push({ nameKey: 'check.holdDown', utilisation: Td / HOLD_DOWN_CAPACITY });
    }
    const Nd = 1.35 * gPerm + 1.5 * Nq;
    const note = { kind: 'axial' as const, Nd, grade: mech.grade, ...(Td > 0 ? { Td } : {}) };
    // buildResult picks the worst of buckling and hold-down for the status
    results.push(buildResult(p, checks, length, note));
    loadedPosts.push({
      id: p.id,
      name: p.name,
      point: postPoint(p),
      section: [p.section[0], p.section[1]],
      species: p.species,
      length,
      Nd,
    });
  }

  return { results, posts: loadedPosts };
}

/** Beam and post check results (without loads — for the panel table). */
export function loadPathResults(elements: Element[], s: StructuralSettings): MemberResult[] {
  return solveLoadPath(elements, s).results;
}
