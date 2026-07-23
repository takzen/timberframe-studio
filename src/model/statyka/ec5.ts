// Współczynniki i nośności wg PN-EN 1995-1-1 (Eurokod 5).

import type { WlasciwosciMech } from '../katalog';
import type { CzasDzialania, KlasaUzytkowania } from './typy';

/**
 * k_mod — tablica 3.1, drewno lite i klejone warstwowe.
 * Wiersz = klasa użytkowania (1/2/3), kolumna = czas działania.
 */
const KMOD: Record<KlasaUzytkowania, Record<CzasDzialania, number>> = {
  1: { stale: 0.6, dlugotrwale: 0.7, srednie: 0.8, krotkie: 0.9, chwilowe: 1.1 },
  2: { stale: 0.6, dlugotrwale: 0.7, srednie: 0.8, krotkie: 0.9, chwilowe: 1.1 },
  3: { stale: 0.5, dlugotrwale: 0.55, srednie: 0.65, krotkie: 0.7, chwilowe: 0.9 },
};

/** k_def — tablica 3.2, drewno lite i klejone. */
const KDEF: Record<KlasaUzytkowania, number> = { 1: 0.6, 2: 0.8, 3: 2.0 };

export const kmod = (klasa: KlasaUzytkowania, czas: CzasDzialania): number => KMOD[klasa][czas];
export const kdef = (klasa: KlasaUzytkowania): number => KDEF[klasa];

/** Częściowy współczynnik materiałowy γ_M (2.4.1). */
export const gammaM = (mech: WlasciwosciMech): number => (mech.klejone ? 1.25 : 1.3);

/**
 * k_h — współczynnik wysokości elementu (3.2 / 3.3). Podnosi f_m,k i f_t
 * dla elementów niższych niż odniesienie (150 mm lite, 600 mm klejone).
 */
export function kh(mech: WlasciwosciMech, wysMm: number): number {
  if (mech.klejone) return Math.min((600 / wysMm) ** 0.1, 1.1);
  return Math.min((150 / wysMm) ** 0.2, 1.3);
}

/** k_cr — redukcja szerokości na ścinanie z powodu pęknięć (6.1.7 + NA). */
export const KCR = 0.67;

/**
 * ψ₂ — współczynnik kombinacji quasi-stałej (PN-EN 1990, załącznik krajowy).
 * Śnieg do 1000 m n.p.m. = 0; obciążenie użytkowe kat. A = 0,3.
 */
export const psi2 = (uzytkowe: boolean): number => (uzytkowe ? 0.3 : 0);
