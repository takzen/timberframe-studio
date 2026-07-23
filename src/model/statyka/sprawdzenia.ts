// Sprawdzenie elementów zginanych wolnopodpartych wg PN-EN 1995-1-1.
// Etap 1: krokwie i legary jako belki jednoprzęsłowe, obciążenie równomierne.

import { znajdzGatunek } from '../katalog';
import type { WlasciwosciMech } from '../katalog';
import type { Element } from '../typy';
import { gammaM, kdef, kh, kmod, KCR, psi2 } from './ec5';
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

export const statusWykorzystania = status;

export interface WejscieSciskane {
  /** Osiowa siła stała N_g [kN] i zmienna N_q [kN]. */
  Ng: number;
  Nq: number;
  /** Wymiary przekroju [m]. */
  b: number;
  h: number;
  /** Długość wyboczeniowa [m] (przyjęto β=1 — słup trzymany na górze przez dach). */
  L: number;
  mech: WlasciwosciMech;
  klasa: UstawieniaStatyki['klasaUzytkowania'];
}

/**
 * Ściskanie osiowe z wyboczeniem wg PN-EN 1995-1-1 §6.3.2. Miarodajna jest
 * mniejsza bezwładność (mniejszy wymiar przekroju). β=1 — słup przegubowy na
 * obu końcach (u góry trzymany przez konstrukcję dachu).
 */
export function sprawdzSciskany(w: WejscieSciskane): Sprawdzenie[] {
  const { Ng, Nq, b, h, L, mech, klasa } = w;
  const Nd = 1.35 * Ng + 1.5 * Nq; // kN
  const A = b * h; // m²
  const iMin = Math.min(b, h) / Math.sqrt(12); // promień bezwładności [m]
  const lambda = L / iMin;
  const lambdaRel = (lambda / Math.PI) * Math.sqrt((mech.fc0k * 1000) / (mech.E005 * 1000));

  const betaC = mech.klejone ? 0.1 : 0.2;
  let kc = 1;
  if (lambdaRel > 0.3) {
    const k = 0.5 * (1 + betaC * (lambdaRel - 0.3) + lambdaRel * lambdaRel);
    kc = 1 / (k + Math.sqrt(k * k - lambdaRel * lambdaRel));
  }

  const sigmaC = Nd / A; // kPa
  const fcD = (kmod(klasa, 'srednie') * mech.fc0k * 1000) / gammaM(mech);
  return [{ nazwa: 'wyboczenie', wykorzystanie: sigmaC / (kc * fcD) }];
}

const mm = (m: number) => Math.round(m * 1000);

/** Buduje wynik pojedynczego elementu (sztuk = 1) z listy sprawdzeń. */
export function zbudujWynik(
  el: Element,
  sprawdzenia: Sprawdzenie[],
  rozpietosc: number,
  opisObciazenia: string,
): WynikElementu {
  const najgorsze = sprawdzenia.length
    ? sprawdzenia.reduce((a, b) => (b.wykorzystanie > a.wykorzystanie ? b : a))
    : { nazwa: '—', wykorzystanie: 0 };
  const przekrojMm = `${mm(el.przekroj[0])}×${mm(el.przekroj[1])}`;
  return {
    id: el.id,
    opis: `${el.nazwa} ${przekrojMm}`,
    nazwa: el.nazwa,
    przekrojMm,
    gatunek: znajdzGatunek(el.gatunek).mech.klasa,
    rozpietosc,
    sztuk: 1,
    sprawdzenia,
    maksWykorzystanie: najgorsze.wykorzystanie,
    miarodajne: najgorsze.nazwa,
    status: status(najgorsze.wykorzystanie),
    opisObciazenia,
  };
}

