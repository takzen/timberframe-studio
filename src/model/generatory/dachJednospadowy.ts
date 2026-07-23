import { znajdzPoszycie } from '../katalog';
import type { DachJednospadowyDef, Element, Vec3 } from '../typy';
import { przesunNadOs, rozmiesc } from './util';

/**
 * Dach jednospadowy: krokwie co N cm wzdłuż spadku + poszycie jako panel na krokwiach.
 * `z` = poziom spodu krokwi nad niską krawędzią obrysu; okap wydłuża krokwie
 * na obu końcach, a poszycie dodatkowo na boki.
 */
export function generujDachJednospadowy(def: DachJednospadowyDef): Element[] {
  const [x0, y0] = def.pozycja;
  const [dx, dy] = def.wymiar;
  const okap = def.okap ?? 0.3;
  const rozstaw = def.rozstawKrokwi ?? 0.6;
  const [kw, kh] = def.przekrojKrokwi ?? [0.06, 0.16];
  const poszycie = znajdzPoszycie(def.poszycie ?? 'osb22');
  const grub = poszycie.grubosc;
  const tg = Math.tan((def.kat * Math.PI) / 180);

  // `s` — współrzędna wzdłuż spadku, `p` — wzdłuż krawędzi poziomej
  const osSpadku = def.kierunekSpadku.endsWith('x') ? 'x' : 'y';
  const [s0, s1] = osSpadku === 'x' ? [x0, x0 + dx] : [y0, y0 + dy];
  const [p0, p1] = osSpadku === 'x' ? [y0, y0 + dy] : [x0, x0 + dx];
  const sDol = def.kierunekSpadku.startsWith('-') ? s0 : s1;
  const zSpodu = (s: number) => def.z + (sDol === s0 ? s - s0 : s1 - s) * tg;
  const pkt = (s: number, p: number, z: number): Vec3 =>
    osSpadku === 'x' ? [s, p, z] : [p, s, z];

  const okapG = def.okapGora ?? okap;
  const [okapPrzyS0, okapPrzyS1] = sDol === s0 ? [okap, okapG] : [okapG, okap];
  const sA = s0 - okapPrzyS0;
  const sB = s1 + okapPrzyS1;
  const el: Element[] = [];

  // statyka: rozpiętość między podporami (krawędzie obrysu, bez okapu) po połaci
  const cosA = Math.cos((def.kat * Math.PI) / 180) || 1;
  const rozpietosc = (s1 - s0) / cosA;
  const planPkt = (s: number, p: number): [number, number] =>
    osSpadku === 'x' ? [s, p] : [p, s];

  rozmiesc(p0 + kw / 2, p1 - kw / 2, rozstaw).forEach((p, i) => {
    const [od, do_] = przesunNadOs(pkt(sA, p, zSpodu(sA)), pkt(sB, p, zSpodu(sB)), kh / 2);
    el.push({
      id: `${def.id}-krokiew-${i}`,
      zPrymitywu: def.id,
      nazwa: 'krokiew',
      grupa: 'dachy',
      kategoria: 'konstrukcja',
      od,
      do: do_,
      przekroj: [kw, kh],
      gatunek: def.gatunek,
      statyka: {
        rozpietosc,
        szerokoscObciazenia: rozstaw,
        kat: def.kat,
        pokrycie: poszycie.id,
        podpory: [planPkt(s0, p), planPkt(s1, p)],
      },
    });
  });

  const pc = (p0 + p1) / 2;
  const [od, do_] = przesunNadOs(pkt(sA, pc, zSpodu(sA)), pkt(sB, pc, zSpodu(sB)), kh + grub / 2);
  el.push({
    id: `${def.id}-poszycie`,
    zPrymitywu: def.id,
    nazwa: 'poszycie dachu',
    grupa: 'dachy',
    kategoria: 'poszycie',
    od,
    do: do_,
    przekroj: [p1 - p0 + 2 * okap, grub],
    material: poszycie.id,
  });

  return el;
}
