// Editable price list. The catalog carries indicative default prices; the user
// can override any of them (e.g. from a local sawmill's quote) and the overrides
// persist and feed every cost. Overrides are sparse — only changed items — so the
// catalog stays the single source of the defaults.

import { CONCRETE, FASTENERS, SHEATHING, SPECIES } from './catalog';
import type { Bilingual } from './catalog';

/** id → unit price. Absent = use the catalog default. */
export type PriceOverrides = Record<string, number>;

export type PriceKind = 'species' | 'sheathing' | 'concrete' | 'fastener';
export type PriceUnit = 'm3' | 'm2' | 'pc';

export interface PriceItem {
  id: string;
  kind: PriceKind;
  name: Bilingual;
  unit: PriceUnit;
  /** Catalog default price. */
  base: number;
}

/** Every priced catalog item, grouped by kind, in catalog order. */
export const PRICE_ITEMS: PriceItem[] = [
  ...SPECIES.map((s): PriceItem => ({ id: s.id, kind: 'species', name: s.name, unit: 'm3', base: s.pricePerM3 })),
  ...SHEATHING.map((s): PriceItem => ({ id: s.id, kind: 'sheathing', name: s.name, unit: 'm2', base: s.pricePerM2 })),
  ...CONCRETE.map((c): PriceItem => ({ id: c.id, kind: 'concrete', name: c.name, unit: 'm3', base: c.pricePerM3 })),
  ...FASTENERS.map((f): PriceItem => ({ id: f.id, kind: 'fastener', name: f.name, unit: 'pc', base: f.pricePerPc })),
];

const BASE = new Map(PRICE_ITEMS.map((i) => [i.id, i.base]));

/** Effective price for a catalog id: the override if set, otherwise the default. */
export function priceOf(id: string, ov: PriceOverrides | undefined, fallback?: number): number {
  const o = ov?.[id];
  if (o !== undefined) return o;
  return BASE.get(id) ?? fallback ?? 0;
}
