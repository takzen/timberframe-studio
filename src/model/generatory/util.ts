import type { Vec3 } from '../typy';

export const dodaj = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const odejmij = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const skaluj = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dlugoscWektora = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const dlugoscElementu = (el: { od: Vec3; do: Vec3 }): number =>
  dlugoscWektora(odejmij(el.do, el.od));

/**
 * Długość materiału potrzebnego na element. Przy ściętych czołach dłuższa
 * krawędź wystaje poza odległość między punktami osi — to ją się zamawia i tnie.
 */
export function dlugoscDoCiecia(el: {
  od: Vec3;
  do: Vec3;
  przekroj: [number, number];
  scieciePoczatku?: number;
  sciecieKonca?: number;
}): number {
  const rad = Math.PI / 180;
  const a = Math.tan((el.scieciePoczatku ?? 0) * rad);
  const b = Math.tan((el.sciecieKonca ?? 0) * rad);
  return dlugoscElementu(el) + (el.przekroj[1] / 2) * Math.abs(a - b);
}

/** Jednostkowy wektor prostopadły do osi od→do, możliwie bliski pionu (Gram-Schmidt). */
export function normalGorna(od: Vec3, do_: Vec3): Vec3 {
  const roznica = odejmij(do_, od);
  const a = skaluj(roznica, 1 / dlugoscWektora(roznica));
  const n: Vec3 = [-a[2] * a[0], -a[2] * a[1], 1 - a[2] * a[2]];
  const d = dlugoscWektora(n);
  return d < 1e-6 ? [1, 0, 0] : skaluj(n, 1 / d);
}

/** Przesuwa oś od→do o `o` wzdłuż normalnej górnej (prostopadle do osi, ku górze). */
export function przesunNadOs(od: Vec3, do_: Vec3, o: number): [Vec3, Vec3] {
  const n = normalGorna(od, do_);
  return [dodaj(od, skaluj(n, o)), dodaj(do_, skaluj(n, o))];
}

/**
 * Równomierne pozycje od `od` do `do_` (włącznie z krawędziami),
 * z rzeczywistym rozstawem nie większym niż nominalny.
 */
export function rozmiesc(od: number, do_: number, rozstaw: number): number[] {
  const dl = do_ - od;
  if (dl <= 0) return [(od + do_) / 2];
  const przesla = Math.max(1, Math.ceil(dl / rozstaw - 1e-9));
  return Array.from({ length: przesla + 1 }, (_, i) => od + (dl * i) / przesla);
}
