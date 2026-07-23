// Loads project JSON, migrating the pre-rename Polish format to the current one.
// Old files used keys like `prymitywy`, `typ:'slup'`, `pozycja`, `gatunek`, etc.

import type { PrimitiveDef } from './types';

const SPECIES: Record<string, string> = {
  'sosna-c24': 'pine-c24',
  'swierk-kvh': 'spruce-kvh',
  'sosna-c30': 'pine-c30',
  'bsh-gl24': 'glulam-gl24h',
  impregnowana: 'treated-pine',
  modrzew: 'larch',
  dab: 'oak',
};
const SHEATHING: Record<string, string> = {
  deskowanie24: 'boarding24',
  blacha: 'metal-tile',
  papa: 'felt',
};
const MEMBER: Record<string, string> = {
  'belka oczepowa': 'eavesBeam',
  'belka zadaszenia': 'canopyBeam',
  'belka przyścienna': 'ledgerBeam',
  'belka kalenicowa': 'ridgeBeam',
  'słup zadaszenia': 'canopyPost',
};

const species = (v?: string) => (v ? (SPECIES[v] ?? v) : v);
const sheathing = (v?: string) => (v ? (SHEATHING[v] ?? v) : v);
const member = (v?: string) => (v ? MEMBER[v] : undefined);

/* eslint-disable @typescript-eslint/no-explicit-any */
function migratePrimitive(o: any): PrimitiveDef | null {
  const base = { id: o.id, label: o.etykieta ?? o.label, species: species(o.gatunek ?? o.species) };
  switch (o.typ) {
    case 'slup':
      return { ...base, type: 'post', name: member(o.nazwa), position: o.pozycja, section: o.przekroj, height: o.wysokosc, z: o.z };
    case 'belka':
      return { ...base, type: 'beam', name: member(o.nazwa), from: o.od, to: o.do, section: o.przekroj };
    case 'zastrzal':
      return { ...base, type: 'brace', from: o.od, to: o.do, topLevel: o.zGora, verticalArm: o.ramiePionowe, section: o.przekroj, bothSides: o.obustronny };
    case 'podest':
      return {
        ...base,
        type: 'deck',
        position: o.pozycja,
        size: o.wymiar,
        level: o.wysokosc,
        joistDirection: o.kierunekLegarow,
        joistSpacing: o.rozstawLegarow,
        joistSection: o.przekrojLegara,
        board: o.deska ? { width: o.deska.szerokosc, thickness: o.deska.grubosc, gap: o.deska.szczelina } : undefined,
        boardSpecies: species(o.gatunekDeski),
      };
    case 'dachJednospadowy':
      return {
        ...base,
        type: 'monoPitchRoof',
        position: o.pozycja,
        size: o.wymiar,
        pitch: o.kat,
        slopeDirection: o.kierunekSpadku,
        z: o.z,
        eaves: o.okap,
        eavesHigh: o.okapGora,
        rafterSpacing: o.rozstawKrokwi,
        rafterSection: o.przekrojKrokwi,
        sheathing: sheathing(o.poszycie),
      };
    case 'dachDwuspadowy':
      return {
        ...base,
        type: 'gableRoof',
        position: o.pozycja,
        size: o.wymiar,
        pitch: o.kat,
        ridgeDirection: o.kierunekKalenicy,
        z: o.z,
        eaves: o.okap,
        rafterSpacing: o.rozstawKrokwi,
        rafterSection: o.przekrojKrokwi,
        ridgeSection: o.przekrojKalenicy,
        sheathing: sheathing(o.poszycie),
      };
    case 'sciana':
      return {
        ...base,
        type: 'wall',
        from: o.od,
        to: o.do,
        height: o.wysokosc,
        z: o.z,
        section: o.przekroj,
        studSpacing: o.rozstawSlupkow,
        sheathing: sheathing(o.poszycie),
        sheathingSide: o.stronaPoszycia,
        openings: (o.otwory ?? []).map((w: any) => ({
          type: w.typ === 'drzwi' ? 'door' : 'window',
          offset: w.odleglosc,
          width: w.szerokosc,
          height: w.wysokosc,
          sill: w.parapet,
        })),
      };
    case 'plyta':
      return { ...base, type: 'slab', position: o.pozycja, size: o.wymiar, thickness: o.grubosc, z: o.z, concreteClass: o.klasaBetonu };
    default:
      return null;
  }
}

/** Reads a project file in either the current or the legacy Polish format. */
export function readProject(data: any): { name: string; primitives: PrimitiveDef[] } | null {
  const rawPrimitives = data?.primitives ?? data?.prymitywy;
  if (!Array.isArray(rawPrimitives)) return null;
  const name = data.name ?? data.nazwa ?? '';
  // legacy items have `typ`; current items have `type`
  const primitives = rawPrimitives
    .map((o: any) => (o?.type ? (o as PrimitiveDef) : migratePrimitive(o)))
    .filter((p: PrimitiveDef | null): p is PrimitiveDef => p !== null);
  return { name, primitives };
}
