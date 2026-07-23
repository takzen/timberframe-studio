// Sprawdzenie elementów zginanych wolnopodpartych wg PN-EN 1995-1-1.
// Etap 1: krokwie i legary jako belki jednoprzęsłowe, obciążenie równomierne.

import { znajdzGatunek } from '../katalog';
import type { WlasciwosciMech } from '../katalog';
import type { Element } from '../typy';
import { gammaM, kdef, kh, kmod, KCR, psi2 } from './ec5';
import { obciazenieElementu, type ObciazenieLiniowe } from './obciazenia';
import type { Status, Sprawdzenie, UstawieniaStatyki, WynikElementu } from './typy';

// granice ugięcia belki (zalecenia EC5 / praktyka PL)
const GRANICA_INST = 300; // w_inst ≤ L/300
const GRANICA_FIN = 250; // w_fin ≤ L/250

const status = (u: number): Status => (u > 1 ? 'przekroczone' : u > 0.9 ? 'uwaga' : 'ok');

export interface WejscieZginane {
  /** Rozpiętość przęsła [m]. */
  L: number;
  /** Obciążenie stałe g_k [kN/m]. */
  gk: number;
  /** Obciążenie zmienne q_k [kN/m]. */
  qk: number;
  /** Szerokość przekroju b [m]. */
  b: number;
  /** Wysokość przekroju h [m]. */
  h: number;
  mech: WlasciwosciMech;
  klasa: UstawieniaStatyki['klasaUzytkowania'];
}

/** Zwraca listę sprawdzeń (zginanie, ścinanie, ugięcia) dla belki wolnopodpartej. */
export function sprawdzZginany(w: WejscieZginane): Sprawdzenie[] {
  const { L, gk, qk, b, h, mech, klasa } = w;
  const hMm = h * 1000;

  // SGN — kombinacja 1,35·G + 1,5·Q; obciążenie zmienne = średniotrwałe (śnieg/użytkowe PL)
  const qd = 1.35 * gk + 1.5 * qk; // kN/m
  const Md = (qd * L * L) / 8; // kNm
  const Vd = (qd * L) / 2; // kN

  const W = (b * h * h) / 6; // m³
  const A = b * h; // m²
  const km = kmod(klasa, 'srednie');
  const gM = gammaM(mech);

  // naprężenia w kPa (kN/m²); wytrzymałości MPa → ×1000 kPa
  const sigmaM = Md / W;
  const fmD = kh(mech, hMm) * km * mech.fmk * 1000 / gM;
  const tauD = (1.5 * Vd) / (KCR * A);
  const fvD = (km * mech.fvk * 1000) / gM;

  // SGU — ugięcia; E w kN/m² (MPa × 1000)
  const I = (b * h * h * h) / 12; // m⁴
  const E = mech.E0mean * 1000;
  const wG = (5 * gk * L ** 4) / (384 * E * I);
  const wQ = (5 * qk * L ** 4) / (384 * E * I);
  const wInst = wG + wQ;
  const wFin = wG * (1 + kdef(klasa)) + wQ * (1 + psi2(false) * kdef(klasa));

  return [
    { nazwa: 'zginanie', wykorzystanie: sigmaM / fmD },
    { nazwa: 'ścinanie', wykorzystanie: tauD / fvD },
    { nazwa: 'ugięcie chwil.', wykorzystanie: wInst / (L / GRANICA_INST) },
    { nazwa: 'ugięcie końc.', wykorzystanie: wFin / (L / GRANICA_FIN) },
  ];
}

const mm = (m: number) => Math.round(m * 1000);
const kluczGrupy = (el: Element, o: ObciazenieLiniowe) =>
  `${el.nazwa}|${mm(el.przekroj[0])}×${mm(el.przekroj[1])}|${el.gatunek}|${o.rozpietosc.toFixed(2)}`;

/**
 * Analiza projektu: grupuje elementy nośne po typie/przekroju/rozpiętości
 * (w grupie obciążenie identyczne) i zwraca najgorsze wykorzystanie każdej grupy.
 */
export function analiza(elementy: Element[], u: UstawieniaStatyki): WynikElementu[] {
  const grupy = new Map<string, { el: Element; o: ObciazenieLiniowe; sztuk: number }>();

  for (const el of elementy) {
    if (!el.statyka) continue;
    const o = obciazenieElementu(el, u);
    if (!o) continue;
    const klucz = kluczGrupy(el, o);
    const istn = grupy.get(klucz);
    if (istn) istn.sztuk += 1;
    else grupy.set(klucz, { el, o, sztuk: 1 });
  }

  const wyniki: WynikElementu[] = [];
  for (const { el, o, sztuk } of grupy.values()) {
    const mech = znajdzGatunek(el.gatunek).mech;
    const sprawdzenia = sprawdzZginany({
      L: o.rozpietosc,
      gk: o.gk,
      qk: o.qk,
      b: el.przekroj[0],
      h: el.przekroj[1],
      mech,
      klasa: u.klasaUzytkowania,
    });
    const najgorsze = sprawdzenia.reduce((a, b) => (b.wykorzystanie > a.wykorzystanie ? b : a));
    const przekrojMm = `${mm(el.przekroj[0])}×${mm(el.przekroj[1])}`;
    wyniki.push({
      opis: `${el.nazwa} ${przekrojMm}`,
      nazwa: el.nazwa,
      przekrojMm,
      gatunek: mech.klasa,
      rozpietosc: o.rozpietosc,
      sztuk,
      sprawdzenia,
      maksWykorzystanie: najgorsze.wykorzystanie,
      miarodajne: najgorsze.nazwa,
      status: status(najgorsze.wykorzystanie),
      opisObciazenia: `${o.opis} · ${mech.klasa}`,
    });
  }

  wyniki.sort((a, b) => b.maksWykorzystanie - a.maksWykorzystanie);
  return wyniki;
}
