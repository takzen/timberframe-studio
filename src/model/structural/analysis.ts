// Analysis orchestration: bending members (rafters, joists) + load path (beams,
// posts). Separate file to avoid a cyclic import between checks and loadPath.

import { findSpecies } from '../catalog';
import type { Element } from '../types';
import { buildResult, checkBending } from './checks';
import { memberLoad } from './loads';
import { loadPathResults } from './loadPath';
import type { MemberResult, Status, StructuralSettings } from './types';

const key = (r: MemberResult) => `${r.name}|${r.sectionMm}|${r.span.toFixed(2)}`;

/** Merges identical members (type+section+span): the worst represents the group. */
function group(raw: MemberResult[]): MemberResult[] {
  const groups = new Map<string, MemberResult>();
  for (const r of raw) {
    const existing = groups.get(key(r));
    if (!existing) {
      groups.set(key(r), { ...r });
    } else {
      existing.pcs += r.pcs;
      if (r.maxUtilisation > existing.maxUtilisation) {
        existing.maxUtilisation = r.maxUtilisation;
        existing.checks = r.checks;
        existing.governing = r.governing;
        existing.status = r.status;
        existing.load = r.load;
      }
    }
  }
  return [...groups.values()];
}

/** Per-element results (before grouping) — keeps the id, for colouring. */
export function analyseRaw(elements: Element[], s: StructuralSettings): MemberResult[] {
  const raw: MemberResult[] = [];

  for (const el of elements) {
    if (!el.structural) continue;
    const o = memberLoad(el, s);
    if (!o) continue;
    const mech = findSpecies(el.species).mech;
    const checks = checkBending({
      L: o.span,
      gk: o.gk,
      qk: o.qk,
      b: el.section[0],
      h: el.section[1],
      mech,
      cls: s.serviceClass,
    });
    raw.push(buildResult(el, checks, o.span, o.note));
  }

  raw.push(...loadPathResults(elements, s));
  return raw;
}

/** Groups and sorts raw results for the panel table. */
export function grouped(raw: MemberResult[]): MemberResult[] {
  const merged = group(raw);
  merged.sort((a, b) => b.maxUtilisation - a.maxUtilisation);
  return merged;
}

/** Full project analysis — grouped results sorted most-utilised first. */
export function analyse(elements: Element[], s: StructuralSettings): MemberResult[] {
  return grouped(analyseRaw(elements, s));
}

const RANK: Record<Status, number> = { ok: 0, warn: 1, over: 2 };

/** Utilisation status per element (key = element id). */
export function elementStatuses(raw: MemberResult[]): Map<string, Status> {
  const m = new Map<string, Status>();
  for (const r of raw) if (r.id) m.set(r.id, r.status);
  return m;
}

/** Worst utilisation status per primitive (key = fromPrimitive). */
export function primitiveStatuses(
  elements: Element[],
  byElement: Map<string, Status>,
): Map<string, Status> {
  const m = new Map<string, Status>();
  for (const el of elements) {
    const s = byElement.get(el.id);
    if (!s) continue;
    const cur = m.get(el.fromPrimitive);
    if (!cur || RANK[s] > RANK[cur]) m.set(el.fromPrimitive, s);
  }
  return m;
}
