import type { PrymitywDef, Vec2 } from '../model/typy';
import { prostokatZPunktow } from './geometria';

export interface Uchwyt {
  id: string;
  punkt: Vec2;
}

const rogiProstokata = (poz: Vec2, wym: Vec2): Record<string, Vec2> => ({
  p00: [poz[0], poz[1]],
  p10: [poz[0] + wym[0], poz[1]],
  p01: [poz[0], poz[1] + wym[1]],
  p11: [poz[0] + wym[0], poz[1] + wym[1]],
});

const PRZECIWLEGLY: Record<string, string> = { p00: 'p11', p11: 'p00', p10: 'p01', p01: 'p10' };

const jakoProstokat = (def: PrymitywDef) =>
  def.typ === 'podest' || def.typ === 'dachJednospadowy' || def.typ === 'dachDwuspadowy'
    ? { pozycja: def.pozycja, wymiar: def.wymiar }
    : null;

/** Punkty, za które można złapać zaznaczony element, żeby zmienić jego kształt. */
export function uchwyty(def: PrymitywDef): Uchwyt[] {
  const r = jakoProstokat(def);
  if (r)
    return Object.entries(rogiProstokata(r.pozycja, r.wymiar)).map(([id, punkt]) => ({ id, punkt }));
  if (def.typ === 'sciana' || def.typ === 'zastrzal')
    return [
      { id: 'od', punkt: def.od },
      { id: 'do', punkt: def.do },
    ];
  if (def.typ === 'belka')
    return [
      { id: 'od', punkt: [def.od[0], def.od[1]] },
      { id: 'do', punkt: [def.do[0], def.do[1]] },
    ];
  return [];
}

/** Punkt odniesienia elementu — to jego przyciągamy do siatki przy przesuwaniu. */
export function zaczep(def: PrymitywDef): Vec2 {
  const r = jakoProstokat(def);
  if (r) return r.pozycja;
  if (def.typ === 'sciana' || def.typ === 'zastrzal') return def.od;
  if (def.typ === 'belka') return [def.od[0], def.od[1]];
  return def.pozycja;
}

/** Punkty, do których warto przyciągać rysowanie i edycję (narożniki, końce, osie słupów). */
export function punktyZaczepienia(prymitywy: PrymitywDef[], pomijajId?: string): Vec2[] {
  const punkty: Vec2[] = [];
  for (const def of prymitywy) {
    if (def.id === pomijajId) continue;
    punkty.push(...uchwyty(def).map((u) => u.punkt));
    if (def.typ === 'slup') punkty.push(def.pozycja);
  }
  return punkty;
}

/** Przesuwa cały element o wektor. */
export function przesun(def: PrymitywDef, dx: number, dy: number): Partial<PrymitywDef> {
  switch (def.typ) {
    case 'sciana':
    case 'zastrzal':
      return {
        od: [def.od[0] + dx, def.od[1] + dy],
        do: [def.do[0] + dx, def.do[1] + dy],
      };
    case 'belka':
      return {
        od: [def.od[0] + dx, def.od[1] + dy, def.od[2]],
        do: [def.do[0] + dx, def.do[1] + dy, def.do[2]],
      };
    case 'slup':
      return { pozycja: [def.pozycja[0] + dx, def.pozycja[1] + dy] };
    default:
      return { pozycja: [def.pozycja[0] + dx, def.pozycja[1] + dy] };
  }
}

/** Przesuwa pojedynczy uchwyt do wskazanego punktu. */
export function ustawUchwyt(
  def: PrymitywDef,
  uchwyt: string,
  p: Vec2,
): Partial<PrymitywDef> | null {
  const r = jakoProstokat(def);
  if (r) {
    const staly = rogiProstokata(r.pozycja, r.wymiar)[PRZECIWLEGLY[uchwyt]];
    if (!staly) return null;
    const nowy = prostokatZPunktow(staly, p);
    if (nowy.wymiar[0] < 0.1 || nowy.wymiar[1] < 0.1) return null;
    return nowy;
  }
  if (def.typ === 'sciana' || def.typ === 'zastrzal')
    return uchwyt === 'od' ? { od: p } : { do: p };
  if (def.typ === 'belka')
    return uchwyt === 'od'
      ? { od: [p[0], p[1], def.od[2]] }
      : { do: [p[0], p[1], def.do[2]] };
  return null;
}

/**
 * Przyciąganie: najpierw do bliskiego punktu istniejącej geometrii (w promieniu
 * `promienPx`), a gdy takiego nie ma — do siatki.
 */
export function przyciagnijInteligentnie(
  p: Vec2,
  punkty: Vec2[],
  skok: number,
  promienPx: number,
  skala: number,
): { punkt: Vec2; doczepiony: boolean } {
  const promien = promienPx / skala;
  let najblizszy: Vec2 | null = null;
  let najlepsza = promien;
  for (const q of punkty) {
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (d < najlepsza) {
      najlepsza = d;
      najblizszy = q;
    }
  }
  if (najblizszy) return { punkt: [...najblizszy], doczepiony: true };
  return {
    punkt: [Math.round(p[0] / skok) * skok, Math.round(p[1] / skok) * skok],
    doczepiony: false,
  };
}
