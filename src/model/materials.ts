import { FASTENERS, findFastener, findSheathing, findSpecies } from './catalog';
import type { Category, Element } from './types';
import { cutLength, elementLength } from './generators/util';

export interface BillItem {
  category: Category;
  /** Member-name key. */
  name: string;
  /** e.g. "45×145". */
  sectionMm: string;
  /** Species id or sheathing id — translated for display. */
  materialId: string;
  /** true = priced by m² (panels, sheet, felt); false = by m³ of timber. */
  plate: boolean;
  pcs: number;
  totalM: number;
  /** Area — only for panels and boards. */
  totalM2: number | null;
  totalM3: number;
  cost: number;
  /** Length breakdown, e.g. "3× 2.20, 3× 2.74". */
  lengths: string;
}

export interface FastenerItem {
  id: string;
  pcs: number;
  pricePerPc: number;
  cost: number;
}

export interface Bill {
  items: BillItem[];
  fasteners: FastenerItem[];
  timberCost: number;
  sheathingCost: number;
  fastenerCost: number;
  totalCost: number;
  totalM: number;
  totalM2: number;
  totalM3: number;
}

const mm = (m: number): string => String(Math.round(m * 1000));

/** Commercial section: smaller dimension × larger, in mm. */
const sectionLabel = ([a, b]: [number, number]): string =>
  `${mm(Math.min(a, b))}×${mm(Math.max(a, b))}`;

const round = (v: number, digits = 2) => {
  const m = 10 ** digits;
  return Math.round(v * m) / m;
};

/** Panels and boards have one thin dimension — area uses the larger one. */
const coveringWidth = (el: Element) => Math.max(el.section[0], el.section[1]);
const isFlat = (el: Element) => Boolean(el.material) || el.category === 'sheathing';

/**
 * Fasteners needed for one element. Heuristic rules by joint type — they do not
 * replace a structural design, they give an order with a margin.
 */
function fastenersFor(el: Element): { id: string; count: number }[] {
  const len = elementLength(el);
  const every = (distance: number, min: number) => Math.max(min, Math.ceil(len / distance) + 1);

  switch (el.name) {
    case 'post':
    case 'canopyPost':
      return [
        { id: 'post-base', count: 1 },
        { id: 'anchor-m12', count: 2 },
        { id: 'angle-heavy', count: 2 },
        { id: 'screw-8x160', count: 6 },
      ];
    case 'beam':
    case 'eavesBeam':
    case 'canopyBeam':
    case 'ledgerBeam':
    case 'ridgeBeam':
      return [
        { id: 'angle-heavy', count: 2 },
        { id: 'screw-8x160', count: 4 },
      ];
    case 'brace':
      return [
        { id: 'angle-90', count: 2 },
        { id: 'screw-8x160', count: 4 },
      ];
    case 'rafter':
      return [
        { id: 'rafter-tie', count: 2 },
        { id: 'screw-5x90', count: 6 },
      ];
    case 'joist':
      return [
        { id: 'angle-90', count: 2 },
        { id: 'screw-5x90', count: 8 },
      ];
    case 'sillPlate':
      return [{ id: 'anchor-m12', count: every(1.5, 2) }];
    case 'topPlate':
      return [{ id: 'screw-8x160', count: every(0.6, 2) }];
    case 'stud':
      return [{ id: 'screw-5x90', count: 4 }];
    case 'header':
      return [{ id: 'screw-8x160', count: 4 }];
    case 'roughSill':
      return [{ id: 'screw-5x90', count: 4 }];
    case 'deckingBoard':
      return [{ id: 'screw-deck', count: 2 * every(0.5, 2) }];
    case 'wallSheathing':
    case 'roofSheathing':
      return [{ id: 'screw-5x90', count: Math.ceil(len * coveringWidth(el) * 10) }];
    default:
      return [];
  }
}

function materialInfo(el: Element): {
  id: string;
  plate: boolean;
  cost: (m3: number, m2: number) => number;
} {
  if (el.material) {
    const m = findSheathing(el.material);
    return { id: m.id, plate: true, cost: (_m3, m2) => m2 * m.pricePerM2 };
  }
  const s = findSpecies(el.species);
  return { id: s.id, plate: false, cost: (m3) => m3 * s.pricePerM3 };
}

export function bill(elements: Element[]): Bill {
  const groups = new Map<string, { item: BillItem; lens: Map<number, number> }>();
  const pcs = new Map<string, number>();

  for (const el of elements) {
    if (el.concrete) continue; // concrete priced separately in the foundations module
    const sectionMm = sectionLabel(el.section);
    const { id, plate, cost } = materialInfo(el);
    const key = `${el.category}|${el.name}|${sectionMm}|${id}`;
    // order and cut the longer edge, not the axis — with miters that is a difference
    const len = round(cutLength(el));
    const m3 = len * el.section[0] * el.section[1];
    const m2 = len * coveringWidth(el);

    let g = groups.get(key);
    if (!g) {
      g = {
        item: {
          category: el.category,
          name: el.name,
          sectionMm,
          materialId: id,
          plate,
          pcs: 0,
          totalM: 0,
          totalM2: isFlat(el) ? 0 : null,
          totalM3: 0,
          cost: 0,
          lengths: '',
        },
        lens: new Map(),
      };
      groups.set(key, g);
    }
    g.item.pcs += 1;
    g.item.totalM += len;
    g.item.totalM3 += m3;
    g.item.cost += cost(m3, m2);
    if (g.item.totalM2 !== null) g.item.totalM2 += m2;
    g.lens.set(len, (g.lens.get(len) ?? 0) + 1);

    for (const fx of fastenersFor(el)) pcs.set(fx.id, (pcs.get(fx.id) ?? 0) + fx.count);
  }

  const items = [...groups.values()].map(({ item, lens }) => ({
    ...item,
    totalM: round(item.totalM),
    totalM2: item.totalM2 === null ? null : round(item.totalM2),
    totalM3: round(item.totalM3, 3),
    cost: round(item.cost),
    lengths: [...lens.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([d, n]) => `${n}× ${d.toFixed(2)}`)
      .join(', '),
  }));
  items.sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.name.localeCompare(b.name) ||
      a.sectionMm.localeCompare(b.sectionMm),
  );

  const fasteners: FastenerItem[] = FASTENERS.filter((f) => pcs.has(f.id)).map((f) => {
    const count = pcs.get(f.id) ?? 0;
    return { id: f.id, pcs: count, pricePerPc: f.pricePerPc, cost: round(count * f.pricePerPc) };
  });

  const sum = (f: (i: BillItem) => number) => round(items.reduce((s, i) => s + f(i), 0));
  const timberCost = sum((i) => (i.plate ? 0 : i.cost));
  const sheathingCost = sum((i) => (i.plate ? i.cost : 0));
  const fastenerCost = round(fasteners.reduce((s, f) => s + f.cost, 0));

  return {
    items,
    fasteners,
    timberCost,
    sheathingCost,
    fastenerCost,
    totalCost: round(timberCost + sheathingCost + fastenerCost),
    totalM: sum((i) => i.totalM),
    totalM2: sum((i) => i.totalM2 ?? 0),
    totalM3: round(items.reduce((s, i) => s + i.totalM3, 0), 3),
  };
}

/** Bill of materials as CSV (fastener/member names in the given language column is left as ids). */
export function toCSV(b: Bill, fastenerName: (id: string) => string, memberName: (k: string) => string): string {
  const w = ['category;name;section_mm;material;pcs;lengths_m;total_m;total_m2;total_m3;cost_pln'];
  for (const i of b.items) {
    w.push(
      [
        i.category,
        memberName(i.name),
        i.sectionMm,
        i.materialId,
        i.pcs,
        `"${i.lengths}"`,
        i.totalM,
        i.totalM2 ?? '',
        i.totalM3,
        i.cost,
      ].join(';'),
    );
  }
  w.push('');
  w.push('fasteners;name;pcs;price_pc;cost_pln');
  for (const f of b.fasteners) w.push(['', fastenerName(f.id), f.pcs, f.pricePerPc, f.cost].join(';'));
  w.push('');
  w.push(`;TOTAL timber;;;;;;;;${b.timberCost}`);
  w.push(`;TOTAL sheathing;;;;;;;;${b.sheathingCost}`);
  w.push(`;TOTAL fasteners;;;;;;;;${b.fastenerCost}`);
  w.push(`;TOTAL project;;;;;;;;${b.totalCost}`);
  return w.join('\n');
}

export function exportCSV(csv: string, fileName: string): void {
  console.log(csv);
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export { findFastener };
