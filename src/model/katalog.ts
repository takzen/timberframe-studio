// Katalog materiałów: przekroje handlowe, gatunki drewna, poszycia i łączniki.
// Ceny orientacyjne, rynek PL, brutto. Do aktualizacji w jednym miejscu.

import type { Vec2 } from './typy';

export type ZastosowaniePrzekroju = 'tarcica' | 'slup' | 'deska';

export interface PrzekrojKatalogowy {
  id: string;
  /** [szerokość, wysokość] w metrach. */
  wymiar: Vec2;
  etykieta: string;
  zastosowanie: ZastosowaniePrzekroju;
}

const przekroj = (
  szerMm: number,
  wysMm: number,
  zastosowanie: ZastosowaniePrzekroju,
): PrzekrojKatalogowy => ({
  id: `${szerMm}x${wysMm}`,
  wymiar: [szerMm / 1000, wysMm / 1000],
  etykieta: `${szerMm}×${wysMm}`,
  zastosowanie,
});

export const PRZEKROJE: PrzekrojKatalogowy[] = [
  // tarcica konstrukcyjna — ściany, krokwie, legary, belki
  przekroj(45, 95, 'tarcica'),
  przekroj(45, 120, 'tarcica'),
  przekroj(45, 145, 'tarcica'),
  przekroj(45, 170, 'tarcica'),
  przekroj(45, 195, 'tarcica'),
  przekroj(45, 220, 'tarcica'),
  przekroj(50, 100, 'tarcica'),
  przekroj(50, 150, 'tarcica'),
  przekroj(50, 200, 'tarcica'),
  przekroj(60, 120, 'tarcica'),
  przekroj(60, 140, 'tarcica'),
  przekroj(60, 160, 'tarcica'),
  przekroj(60, 180, 'tarcica'),
  przekroj(60, 200, 'tarcica'),
  przekroj(70, 170, 'tarcica'),
  przekroj(80, 160, 'tarcica'),
  przekroj(80, 180, 'tarcica'),
  przekroj(80, 200, 'tarcica'),
  przekroj(100, 200, 'tarcica'),
  // słupy
  przekroj(90, 90, 'slup'),
  przekroj(100, 100, 'slup'),
  przekroj(120, 120, 'slup'),
  przekroj(140, 140, 'slup'),
  przekroj(160, 160, 'slup'),
  przekroj(180, 180, 'slup'),
  przekroj(200, 200, 'slup'),
  // deski
  przekroj(19, 95, 'deska'),
  przekroj(25, 140, 'deska'),
  przekroj(28, 145, 'deska'),
  przekroj(32, 145, 'deska'),
];

export interface Gatunek {
  id: string;
  nazwa: string;
  skrot: string;
  /** PLN za m³. */
  cenaM3: number;
  kolor: string;
  roughness: number;
}

export const GATUNKI: Gatunek[] = [
  {
    id: 'sosna-c24',
    nazwa: 'Sosna C24, sucha strugana',
    skrot: 'C24',
    cenaM3: 2400,
    kolor: '#c9a06a',
    roughness: 0.78,
  },
  {
    id: 'swierk-kvh',
    nazwa: 'Świerk KVH NSi C24',
    skrot: 'KVH',
    cenaM3: 2900,
    kolor: '#d8b989',
    roughness: 0.72,
  },
  {
    id: 'sosna-c30',
    nazwa: 'Sosna C30',
    skrot: 'C30',
    cenaM3: 2800,
    kolor: '#c69a5e',
    roughness: 0.78,
  },
  {
    id: 'bsh-gl24',
    nazwa: 'Drewno klejone BSH GL24h',
    skrot: 'BSH',
    cenaM3: 4100,
    kolor: '#dcc199',
    roughness: 0.6,
  },
  {
    id: 'impregnowana',
    nazwa: 'Sosna impregnowana ciśnieniowo',
    skrot: 'IMP',
    cenaM3: 2700,
    kolor: '#9aa86e',
    roughness: 0.85,
  },
  {
    id: 'modrzew',
    nazwa: 'Modrzew syberyjski',
    skrot: 'MOD',
    cenaM3: 5200,
    kolor: '#a9723f',
    roughness: 0.82,
  },
  {
    id: 'dab',
    nazwa: 'Dąb',
    skrot: 'DĄB',
    cenaM3: 8500,
    kolor: '#8a6234',
    roughness: 0.7,
  },
];

export interface MaterialPoszycia {
  id: string;
  nazwa: string;
  /** Grubość w metrach. */
  grubosc: number;
  /** PLN za m². */
  cenaM2: number;
  kolor: string;
  roughness: number;
}

export const POSZYCIA: MaterialPoszycia[] = [
  { id: 'osb12', nazwa: 'OSB/3 12 mm', grubosc: 0.012, cenaM2: 38, kolor: '#cbb68f', roughness: 0.95 },
  { id: 'osb15', nazwa: 'OSB/3 15 mm', grubosc: 0.015, cenaM2: 46, kolor: '#cbb68f', roughness: 0.95 },
  { id: 'osb18', nazwa: 'OSB/3 18 mm', grubosc: 0.018, cenaM2: 55, kolor: '#cbb68f', roughness: 0.95 },
  { id: 'osb22', nazwa: 'OSB/3 22 mm', grubosc: 0.022, cenaM2: 68, kolor: '#c3ad85', roughness: 0.95 },
  { id: 'mfp12', nazwa: 'Płyta MFP 12 mm', grubosc: 0.012, cenaM2: 42, kolor: '#c8bfa4', roughness: 0.95 },
  {
    id: 'deskowanie24',
    nazwa: 'Deskowanie pełne 24 mm',
    grubosc: 0.024,
    cenaM2: 62,
    kolor: '#c0996a',
    roughness: 0.9,
  },
  { id: 'blacha', nazwa: 'Blachodachówka', grubosc: 0.006, cenaM2: 79, kolor: '#5c5f63', roughness: 0.45 },
  { id: 'papa', nazwa: 'Papa termozgrzewalna', grubosc: 0.005, cenaM2: 34, kolor: '#4a4744', roughness: 0.9 },
];

export interface Lacznik {
  id: string;
  nazwa: string;
  /** PLN za sztukę. */
  cenaSzt: number;
}

export const LACZNIKI: Lacznik[] = [
  { id: 'stopa-slupa', nazwa: 'Stopa słupa regulowana', cenaSzt: 42 },
  { id: 'kotwa-m12', nazwa: 'Kotwa do betonu M12×120', cenaSzt: 7.5 },
  { id: 'katownik-90', nazwa: 'Kątownik ciesielski 90×90×65×2,5', cenaSzt: 3.9 },
  { id: 'katownik-wzm', nazwa: 'Kątownik wzmocniony 105×105×90×3,0', cenaSzt: 9.8 },
  { id: 'lacznik-krokwiowy', nazwa: 'Łącznik krokwiowy 170×35×2,0', cenaSzt: 5.2 },
  { id: 'wkret-8x160', nazwa: 'Wkręt ciesielski 8×160 mm', cenaSzt: 2.3 },
  { id: 'wkret-5x90', nazwa: 'Wkręt konstrukcyjny 5×90 mm', cenaSzt: 0.55 },
  { id: 'wkret-tarasowy', nazwa: 'Wkręt tarasowy A2 5×60 mm', cenaSzt: 0.85 },
];

export const znajdzPrzekroj = (id: string) => PRZEKROJE.find((p) => p.id === id);
export const znajdzGatunek = (id?: string) =>
  GATUNKI.find((g) => g.id === id) ?? GATUNKI[0];
export const znajdzPoszycie = (id?: string) =>
  POSZYCIA.find((p) => p.id === id) ?? POSZYCIA[0];
export const znajdzLacznik = (id: string) => LACZNIKI.find((l) => l.id === id);

/** Przekrój katalogowy najbliższy podanym wymiarom — do opisania istniejącej geometrii. */
export function dopasujPrzekroj(wymiar: Vec2): PrzekrojKatalogowy | undefined {
  const [a, b] = [Math.min(...wymiar), Math.max(...wymiar)];
  let najlepszy: PrzekrojKatalogowy | undefined;
  let najlepszaRoznica = Infinity;
  for (const p of PRZEKROJE) {
    const [pa, pb] = [Math.min(...p.wymiar), Math.max(...p.wymiar)];
    const roznica = Math.abs(pa - a) + Math.abs(pb - b);
    if (roznica < najlepszaRoznica) {
      najlepszaRoznica = roznica;
      najlepszy = p;
    }
  }
  return najlepszaRoznica < 0.03 ? najlepszy : undefined;
}
