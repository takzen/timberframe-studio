// Material catalog: commercial sections, timber species, sheathing, concrete
// and fasteners with prices. Display names are bilingual {pl, en}; update here.

import type { Language } from '../i18n';
import type { Vec2 } from './types';

export type Bilingual = { pl: string; en: string };
export const name = (b: Bilingual, lang: Language) => b[lang];

export type SectionUsage = 'lumber' | 'post' | 'board';

export interface CatalogSection {
  id: string;
  /** [width, height] in metres. */
  size: Vec2;
  label: string;
  usage: SectionUsage;
}

const section = (wMm: number, hMm: number, usage: SectionUsage): CatalogSection => ({
  id: `${wMm}x${hMm}`,
  size: [wMm / 1000, hMm / 1000],
  label: `${wMm}×${hMm}`,
  usage,
});

export const SECTIONS: CatalogSection[] = [
  section(45, 95, 'lumber'),
  section(45, 120, 'lumber'),
  section(45, 145, 'lumber'),
  section(45, 170, 'lumber'),
  section(45, 195, 'lumber'),
  section(45, 220, 'lumber'),
  section(50, 100, 'lumber'),
  section(50, 150, 'lumber'),
  section(50, 200, 'lumber'),
  section(60, 120, 'lumber'),
  section(60, 140, 'lumber'),
  section(60, 160, 'lumber'),
  section(60, 180, 'lumber'),
  section(60, 200, 'lumber'),
  section(70, 170, 'lumber'),
  section(80, 160, 'lumber'),
  section(80, 180, 'lumber'),
  section(80, 200, 'lumber'),
  section(100, 200, 'lumber'),
  section(90, 90, 'post'),
  section(100, 100, 'post'),
  section(120, 120, 'post'),
  section(140, 140, 'post'),
  section(160, 160, 'post'),
  section(180, 180, 'post'),
  section(200, 200, 'post'),
  section(19, 95, 'board'),
  section(25, 140, 'board'),
  section(28, 145, 'board'),
  section(32, 145, 'board'),
];

/**
 * Mechanical properties per EN 338 (solid) / EN 14080 (glulam), characteristic
 * values. Strengths and moduli in MPa (N/mm²), density in kg/m³.
 */
export interface MechProps {
  /** Strength class, e.g. "C24", "GL24h". */
  grade: string;
  /** Bending strength f_m,k [MPa]. */
  fmk: number;
  /** Shear strength f_v,k [MPa]. */
  fvk: number;
  /** Compression strength along the grain f_c,0,k [MPa]. */
  fc0k: number;
  /** Mean modulus of elasticity E_0,mean [MPa]. */
  E0mean: number;
  /** 5-percentile modulus E_0,05 [MPa] — for buckling. */
  E005: number;
  /** Mean density [kg/m³] — for self-weight. */
  densityMean: number;
  /** Glued laminated timber (different γ_M, k_h). */
  glulam: boolean;
}

export interface Species {
  id: string;
  name: Bilingual;
  short: string;
  /** PLN per m³. */
  pricePerM3: number;
  color: string;
  roughness: number;
  mech: MechProps;
}

// characteristic values per EN 338 / EN 14080
const C24: MechProps = {
  grade: 'C24',
  fmk: 24,
  fvk: 4.0,
  fc0k: 21,
  E0mean: 11000,
  E005: 7400,
  densityMean: 420,
  glulam: false,
};
const C30: MechProps = {
  grade: 'C30',
  fmk: 30,
  fvk: 4.0,
  fc0k: 23,
  E0mean: 12000,
  E005: 8000,
  densityMean: 460,
  glulam: false,
};
const GL24h: MechProps = {
  grade: 'GL24h',
  fmk: 24,
  fvk: 3.5,
  fc0k: 24,
  E0mean: 11500,
  E005: 9600,
  densityMean: 420,
  glulam: true,
};
const LARCH: MechProps = { ...C24, grade: 'C24 (larch)', densityMean: 590 };
const D30: MechProps = {
  grade: 'D30',
  fmk: 30,
  fvk: 3.9,
  fc0k: 23,
  E0mean: 10000,
  E005: 8000,
  densityMean: 640,
  glulam: false,
};

export const SPECIES: Species[] = [
  {
    id: 'pine-c24',
    name: { pl: 'Sosna C24, sucha strugana', en: 'Pine C24, kiln-dried planed' },
    short: 'C24',
    pricePerM3: 2400,
    color: '#c9a06a',
    roughness: 0.78,
    mech: C24,
  },
  {
    id: 'spruce-kvh',
    name: { pl: 'Świerk KVH NSi C24', en: 'Spruce KVH NSi C24' },
    short: 'KVH',
    pricePerM3: 2900,
    color: '#d8b989',
    roughness: 0.72,
    mech: C24,
  },
  {
    id: 'pine-c30',
    name: { pl: 'Sosna C30', en: 'Pine C30' },
    short: 'C30',
    pricePerM3: 2800,
    color: '#c69a5e',
    roughness: 0.78,
    mech: C30,
  },
  {
    id: 'glulam-gl24h',
    name: { pl: 'Drewno klejone BSH GL24h', en: 'Glulam GL24h' },
    short: 'GL24h',
    pricePerM3: 4100,
    color: '#dcc199',
    roughness: 0.6,
    mech: GL24h,
  },
  {
    id: 'treated-pine',
    name: { pl: 'Sosna impregnowana ciśnieniowo', en: 'Pressure-treated pine' },
    short: 'IMP',
    pricePerM3: 2700,
    color: '#9aa86e',
    roughness: 0.85,
    mech: { ...C24, densityMean: 450 },
  },
  {
    id: 'larch',
    name: { pl: 'Modrzew syberyjski', en: 'Siberian larch' },
    short: 'LAR',
    pricePerM3: 5200,
    color: '#a9723f',
    roughness: 0.82,
    mech: LARCH,
  },
  {
    id: 'oak',
    name: { pl: 'Dąb', en: 'Oak' },
    short: 'OAK',
    pricePerM3: 8500,
    color: '#8a6234',
    roughness: 0.7,
    mech: D30,
  },
];

export interface SheathingMaterial {
  id: string;
  name: Bilingual;
  /** Thickness in metres. */
  thickness: number;
  /** PLN per m². */
  pricePerM2: number;
  /** Weight [kg/m²] — for dead load. */
  weight: number;
  color: string;
  roughness: number;
}

// weights: OSB/MFP ~600 kg/m³ × thickness; solid boarding pine ~500; coverings with wear layer
export const SHEATHING: SheathingMaterial[] = [
  { id: 'osb12', name: { pl: 'OSB/3 12 mm', en: 'OSB/3 12 mm' }, thickness: 0.012, pricePerM2: 38, weight: 7.2, color: '#cbb68f', roughness: 0.95 },
  { id: 'osb15', name: { pl: 'OSB/3 15 mm', en: 'OSB/3 15 mm' }, thickness: 0.015, pricePerM2: 46, weight: 9, color: '#cbb68f', roughness: 0.95 },
  { id: 'osb18', name: { pl: 'OSB/3 18 mm', en: 'OSB/3 18 mm' }, thickness: 0.018, pricePerM2: 55, weight: 10.8, color: '#cbb68f', roughness: 0.95 },
  { id: 'osb22', name: { pl: 'OSB/3 22 mm', en: 'OSB/3 22 mm' }, thickness: 0.022, pricePerM2: 68, weight: 13.2, color: '#c3ad85', roughness: 0.95 },
  { id: 'mfp12', name: { pl: 'Płyta MFP 12 mm', en: 'MFP board 12 mm' }, thickness: 0.012, pricePerM2: 42, weight: 7.5, color: '#c8bfa4', roughness: 0.95 },
  { id: 'boarding24', name: { pl: 'Deskowanie pełne 24 mm', en: 'Solid boarding 24 mm' }, thickness: 0.024, pricePerM2: 62, weight: 12, color: '#c0996a', roughness: 0.9 },
  { id: 'metal-tile', name: { pl: 'Blachodachówka', en: 'Metal roof tile' }, thickness: 0.006, pricePerM2: 79, weight: 5, color: '#5c5f63', roughness: 0.45 },
  { id: 'felt', name: { pl: 'Papa termozgrzewalna', en: 'Torch-on felt' }, thickness: 0.005, pricePerM2: 34, weight: 5, color: '#4a4744', roughness: 0.9 },
];

export interface ConcreteClass {
  id: string;
  name: Bilingual;
  /** Characteristic compressive strength f_ck [MPa]. */
  fck: number;
  /** PLN per m³ (ready-mix with pump, indicative). */
  pricePerM3: number;
  color: string;
}

export const CONCRETE: ConcreteClass[] = [
  { id: 'c8-10', name: { pl: 'C8/10 (chudy, podkład)', en: 'C8/10 (lean, blinding)' }, fck: 8, pricePerM3: 270, color: '#a8a8a2' },
  { id: 'c12-15', name: { pl: 'C12/15', en: 'C12/15' }, fck: 12, pricePerM3: 300, color: '#a2a2a0' },
  { id: 'c16-20', name: { pl: 'C16/20', en: 'C16/20' }, fck: 16, pricePerM3: 330, color: '#9c9c9a' },
  { id: 'c20-25', name: { pl: 'C20/25', en: 'C20/25' }, fck: 20, pricePerM3: 360, color: '#969694' },
  { id: 'c25-30', name: { pl: 'C25/30', en: 'C25/30' }, fck: 25, pricePerM3: 400, color: '#909090' },
  { id: 'c30-37', name: { pl: 'C30/37', en: 'C30/37' }, fck: 30, pricePerM3: 440, color: '#8a8a8a' },
];

export interface Fastener {
  id: string;
  name: Bilingual;
  /** PLN per piece. */
  pricePerPc: number;
}

export const FASTENERS: Fastener[] = [
  { id: 'post-base', name: { pl: 'Stopa słupa regulowana', en: 'Adjustable post base' }, pricePerPc: 42 },
  { id: 'anchor-m12', name: { pl: 'Kotwa do betonu M12×120', en: 'Concrete anchor M12×120' }, pricePerPc: 7.5 },
  { id: 'angle-90', name: { pl: 'Kątownik ciesielski 90×90×65×2,5', en: 'Framing angle 90×90×65×2.5' }, pricePerPc: 3.9 },
  { id: 'angle-heavy', name: { pl: 'Kątownik wzmocniony 105×105×90×3,0', en: 'Heavy angle 105×105×90×3.0' }, pricePerPc: 9.8 },
  { id: 'rafter-tie', name: { pl: 'Łącznik krokwiowy 170×35×2,0', en: 'Rafter tie 170×35×2.0' }, pricePerPc: 5.2 },
  { id: 'screw-8x160', name: { pl: 'Wkręt ciesielski 8×160 mm', en: 'Structural screw 8×160 mm' }, pricePerPc: 2.3 },
  { id: 'screw-5x90', name: { pl: 'Wkręt konstrukcyjny 5×90 mm', en: 'Structural screw 5×90 mm' }, pricePerPc: 0.55 },
  { id: 'screw-deck', name: { pl: 'Wkręt tarasowy A2 5×60 mm', en: 'Decking screw A2 5×60 mm' }, pricePerPc: 0.85 },
];

export const findSection = (id: string) => SECTIONS.find((s) => s.id === id);
export const findSpecies = (id?: string) => SPECIES.find((s) => s.id === id) ?? SPECIES[0];
export const findSheathing = (id?: string) => SHEATHING.find((s) => s.id === id) ?? SHEATHING[0];
export const findConcrete = (id?: string) => CONCRETE.find((c) => c.id === id) ?? CONCRETE[2];
export const findFastener = (id: string) => FASTENERS.find((f) => f.id === id);

/** Catalog section closest to the given size — to label existing geometry. */
export function matchSection(size: Vec2): CatalogSection | undefined {
  const [a, b] = [Math.min(...size), Math.max(...size)];
  let best: CatalogSection | undefined;
  let bestDiff = Infinity;
  for (const s of SECTIONS) {
    const [sa, sb] = [Math.min(...s.size), Math.max(...s.size)];
    const diff = Math.abs(sa - a) + Math.abs(sb - b);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }
  return bestDiff < 0.03 ? best : undefined;
}
