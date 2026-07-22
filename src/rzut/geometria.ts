import type { Vec2 } from '../model/typy';

/** Widok rzutu: środek w metrach + skala px/m. */
export interface Widok {
  cx: number;
  cy: number;
  skala: number;
}

export interface Rozmiar {
  w: number;
  h: number;
}

export const naEkran = (p: Vec2, v: Widok, r: Rozmiar): Vec2 => [
  (p[0] - v.cx) * v.skala + r.w / 2,
  r.h / 2 - (p[1] - v.cy) * v.skala,
];

export const naSwiat = (p: Vec2, v: Widok, r: Rozmiar): Vec2 => [
  (p[0] - r.w / 2) / v.skala + v.cx,
  v.cy - (p[1] - r.h / 2) / v.skala,
];

/** Transform grupy SVG: świat (Y w górę, metry) → ekran (Y w dół, piksele). */
export const transformGrupy = (v: Widok, r: Rozmiar) =>
  `translate(${r.w / 2} ${r.h / 2}) scale(${v.skala} ${-v.skala}) translate(${-v.cx} ${-v.cy})`;

export const przyciagnij = (p: Vec2, skok: number): Vec2 => [
  Math.round(p[0] / skok) * skok,
  Math.round(p[1] / skok) * skok,
];

export const dlugosc = (a: Vec2, b: Vec2) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Cztery narożniki prostokąta o osi a→b i podanej szerokości (w metrach). */
export function pasWzdluzOsi(a: Vec2, b: Vec2, szerokosc: number): Vec2[] {
  const L = dlugosc(a, b) || 1;
  const nx = (-(b[1] - a[1]) / L) * (szerokosc / 2);
  const ny = ((b[0] - a[0]) / L) * (szerokosc / 2);
  return [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ];
}

export const doPunktow = (pkt: Vec2[]) => pkt.map((p) => `${p[0]},${p[1]}`).join(' ');

/** Prostokąt z dwóch przeciwległych narożników: pozycja min + dodatnie wymiary. */
export const prostokatZPunktow = (a: Vec2, b: Vec2) => ({
  pozycja: [Math.min(a[0], b[0]), Math.min(a[1], b[1])] as Vec2,
  wymiar: [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])] as Vec2,
});

/** Odległość punktu od odcinka — do trafiania w ściany i belki kliknięciem. */
export function odlegloscOdOdcinka(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dlKw = dx * dx + dy * dy;
  if (dlKw < 1e-12) return dlugosc(p, a);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / dlKw;
  t = Math.max(0, Math.min(1, t));
  return dlugosc(p, [a[0] + t * dx, a[1] + t * dy]);
}
