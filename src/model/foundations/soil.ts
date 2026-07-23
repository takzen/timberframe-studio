import type { Bilingual } from '../catalog';

export interface SoilType {
  id: string;
  name: Bilingual;
  /** Indicative allowable bearing (pressure) [kPa]. */
  bearing: number;
}

/** Indicative bearing of native soils (rough guidance, not from a survey). */
export const SOILS: SoilType[] = [
  { id: 'rock', name: { pl: 'Skała / grunt bardzo nośny', en: 'Rock / very strong soil' }, bearing: 400 },
  { id: 'gravel', name: { pl: 'Żwir, pospółka zagęszczona', en: 'Compacted gravel' }, bearing: 300 },
  { id: 'sand', name: { pl: 'Piasek średni/gruby, zagęszczony', en: 'Compacted medium/coarse sand' }, bearing: 200 },
  { id: 'stiff-clay', name: { pl: 'Glina twardoplastyczna', en: 'Stiff clay' }, bearing: 150 },
  { id: 'soft-clay', name: { pl: 'Glina plastyczna, grunt słaby', en: 'Soft clay, weak soil' }, bearing: 100 },
  { id: 'fill', name: { pl: 'Nasyp / grunt bardzo słaby', en: 'Fill / very weak soil' }, bearing: 75 },
];
