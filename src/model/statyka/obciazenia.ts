// Obciążenia wg PN-EN 1991 (ciężar własny, śnieg, użytkowe).

import type { Element } from '../typy';
import { znajdzGatunek, znajdzPoszycie } from '../katalog';
import type { UstawieniaStatyki } from './typy';

const G = 9.81; // przyspieszenie ziemskie [m/s²]

export interface StrefaSniegu {
  strefa: number;
  /** Charakterystyczne s_k [kN/m²]. Strefa 5 zależy od wysokości — wartość orientacyjna. */
  sk: number;
  etykieta: string;
}

/** Strefy śniegowe Polski wg PN-EN 1991-1-3, załącznik krajowy. */
export const STREFY_SNIEGU: StrefaSniegu[] = [
  { strefa: 1, sk: 0.7, etykieta: 'Strefa 1 — 0,70 kN/m²' },
  { strefa: 2, sk: 0.9, etykieta: 'Strefa 2 — 0,90 kN/m²' },
  { strefa: 3, sk: 1.2, etykieta: 'Strefa 3 — 1,20 kN/m²' },
  { strefa: 4, sk: 1.6, etykieta: 'Strefa 4 — 1,60 kN/m²' },
  { strefa: 5, sk: 2.0, etykieta: 'Strefa 5 — górska (podaj s_k)' },
];

export const znajdzStrefe = (n: number): StrefaSniegu =>
  STREFY_SNIEGU.find((s) => s.strefa === n) ?? STREFY_SNIEGU[0];

/**
 * Współczynnik kształtu dachu μ₁ (5.3.2), przypadek bez zasp:
 * 0,8 do 30°, liniowo do 0 przy 60°.
 */
export function mu1(katDeg: number): number {
  if (katDeg <= 30) return 0.8;
  if (katDeg >= 60) return 0;
  return 0.8 * ((60 - katDeg) / 30);
}

/** Obciążenie śniegiem dachu s = μ₁·Cₑ·Cₜ·sₖ [kN/m²] (Cₑ=Cₜ=1). */
export const sniegDachu = (sk: number, katDeg: number): number => mu1(katDeg) * sk;

/** Ciężar liniowy własny elementu drewnianego [kN/m] wzdłuż jego osi. */
export function ciezarWlasnyLiniowy(el: Element): number {
  const rho = znajdzGatunek(el.gatunek).mech.rhomean;
  const pole = el.przekroj[0] * el.przekroj[1]; // m²
  return (rho * G * pole) / 1000; // kg·m/s² → N → kN
}

/** Ciężar pokrycia na m² połaci [kN/m²]. */
export function ciezarPokrycia(idPoszycia?: string): number {
  if (!idPoszycia) return 0;
  return (znajdzPoszycie(idPoszycia).masa * G) / 1000;
}

export interface ObciazenieLiniowe {
  /** Stałe (ciężar własny + pokrycie) g_k [kN/m]. */
  gk: number;
  /** Zmienne (śnieg lub użytkowe) q_k [kN/m]. */
  qk: number;
  /** Rozpiętość przęsła [m] (dla krokwi — po połaci). */
  rozpietosc: number;
  /** true = obciążenie użytkowe (inny ψ₂). */
  uzytkowe: boolean;
  opis: string;
}

/**
 * Składa obciążenie liniowe działające na pojedynczy element zginany.
 *
 * Krokiew skośna: moment silnej osi ≈ (g+s)·a_h·L_h²/8, gdzie a_h to rozstaw
 * poziomy, a cosα skraca się między składową prostopadłą a długością połaci.
 * Ciężar własny krokwi działa po długości połaci, więc na metr poziomy /cosα.
 * Rozpiętość do ugięcia bierzemy po połaci (L_s = L_h, bo `rozpietosc` już jest
 * długością połaci z generatora).
 */
export function obciazenieElementu(el: Element, u: UstawieniaStatyki): ObciazenieLiniowe | null {
  const s = el.statyka;
  if (!s) return null;

  const cosA = Math.cos((s.kat * Math.PI) / 180) || 1;
  const a = s.szerokoscObciazenia; // szerokość tributarna [m]

  // ciężar własny: rozłożony po całej długości elementu
  const gWlasny = ciezarWlasnyLiniowy(el);
  // pokrycie / deski: na m² połaci, więc na metr elementu × szerokość tributarna
  const gPokrycie = ciezarPokrycia(s.pokrycie) * a;
  const gk = gWlasny + gPokrycie;

  let qk: number;
  let opis: string;
  if (s.uzytkowe) {
    // strop/podest poziomy: q_k na m² rzutu × szerokość tributarna
    qk = u.obciazenieUzytkowe * a;
    opis = `użytkowe ${u.obciazenieUzytkowe.toFixed(1)} kN/m²`;
  } else {
    // dach: śnieg na m² rzutu poziomego × rozstaw poziomy (a·cosα to rzut)
    const sDach = sniegDachu(u.sniegSk, s.kat);
    qk = sDach * a * cosA;
    opis = `śnieg strefa ${u.strefaSniegu}`;
  }

  return { gk, qk, rozpietosc: s.rozpietosc, uzytkowe: Boolean(s.uzytkowe), opis };
}
