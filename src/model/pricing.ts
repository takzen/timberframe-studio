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

// CSV round-trip for the whole price list. Separator ';' with comma decimals —
// the Polish-Excel convention the rest of the app's CSV already uses — so a
// sawmill's numbers can be filled in a spreadsheet and imported in one go. Keyed
// by catalog id, never by name, so a translated or reworded label never matters.

const num = (v: number) => (Number.isInteger(v) ? String(v) : String(v).replace('.', ','));

/** Builds the price-list CSV. `effective` gives the current price for an id. */
export function pricesToCSV(effective: (id: string) => number, label: (i: PriceItem) => string): string {
  const rows = ['id;nazwa;jednostka;cena'];
  for (const i of PRICE_ITEMS) rows.push(`${i.id};${label(i)};${i.unit};${num(effective(i.id))}`);
  return rows.join('\r\n');
}

export interface ParsedPrices {
  /** Recognised catalog id → price. */
  prices: PriceOverrides;
  /** Rows skipped (unknown id or bad number), excluding the header and blanks. */
  skipped: number;
}

/**
 * Parses a price-list CSV back to overrides. Only rows whose first field is a
 * known catalog id and whose price parses to a finite non-negative number are
 * taken; the header, blank lines and unknown ids are skipped. Tolerates ',' or
 * '.' decimals, a UTF-8 BOM and quoted fields.
 */
export function parsePricesCSV(text: string): ParsedPrices {
  const prices: PriceOverrides = {};
  let skipped = 0;
  const clean = (s: string) => s.replace(/^﻿/, '').replace(/^"(.*)"$/, '$1').trim();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const fields = raw.split(';');
    const id = clean(fields[0] ?? '');
    if (!BASE.has(id)) {
      skipped++;
      continue;
    }
    const price = Number(clean(fields[fields.length - 1] ?? '').replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) {
      skipped++;
      continue;
    }
    prices[id] = price;
  }
  return { prices, skipped };
}

/** Default price for a catalog id (for deciding whether an import is an override). */
export const basePrice = (id: string): number => BASE.get(id) ?? 0;
