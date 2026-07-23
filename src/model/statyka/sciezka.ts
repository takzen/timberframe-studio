// Ścieżka obciążeń: dach → belka → słup. Rozdziela reakcje krokwi na belki,
// reakcje belek na słupy i sprawdza belki (zginanie) oraz słupy (wyboczenie).
//
// Uproszczenia (Etap 2): belka wieloprzęsłowa traktowana jako ciąg belek
// wolnopodpartych między kolejnymi podporami (nie belka ciągła); reakcje krokwi
// zbierane jako obciążenie równomierne; słup przegubowy na obu końcach (β=1).

import { znajdzGatunek } from '../katalog';
import type { Element, Vec2 } from '../typy';
import { ciezarWlasnyLiniowy, obciazenieElementu } from './obciazenia';
import { sprawdzSciskany, sprawdzZginany, zbudujWynik } from './sprawdzenia';
import type { Sprawdzenie, UstawieniaStatyki, WynikElementu } from './typy';

const TOL = 0.25; // tolerancja dopasowania podpory do belki/słupa w rzucie [m]

interface Reakcja {
  punkt: Vec2;
  /** Reakcja od obciążenia stałego / zmiennego [kN]. */
  Rg: number;
  Rq: number;
}

const dl2 = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Odległość punktu od odcinka w rzucie oraz odległość rzutu wzdłuż odcinka. */
function rzutNaOdcinek(p: Vec2, a: Vec2, b: Vec2): { d: number; wzdluz: number; dlugosc: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  const L = Math.sqrt(L2);
  if (L2 < 1e-9) return { d: dl2(p, a), wzdluz: 0, dlugosc: 0 };
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  const proj: Vec2 = [a[0] + t * dx, a[1] + t * dy];
  return { d: dl2(p, proj), wzdluz: t * L, dlugosc: L };
}

/**
 * Reakcje pionowe krokwi na podporach. Całkowite obciążenie (g·L, q·L) rozkłada
 * się równo między podpory nie oznaczone jako zrównoważone — dla dachu
 * krokwiowego (dwuspadowego) całość spływa na okap, dla jednospadowego po połowie.
 */
function reakcjeKrokwi(elementy: Element[], u: UstawieniaStatyki): Reakcja[] {
  const r: Reakcja[] = [];
  for (const el of elementy) {
    const s = el.statyka;
    if (!s?.podpory || s.uzytkowe) continue; // tylko elementy dachu (nie legary)
    const o = obciazenieElementu(el, u);
    if (!o) continue;
    const balansowane = new Set(s.balansowane ?? []);
    const czynne = s.podpory.map((_, i) => i).filter((i) => !balansowane.has(i));
    if (czynne.length === 0) continue;
    const Rg = (o.gk * o.rozpietosc) / czynne.length;
    const Rq = (o.qk * o.rozpietosc) / czynne.length;
    for (const i of czynne) r.push({ punkt: s.podpory[i], Rg, Rq });
  }
  return r;
}

/** Sprawdza belkę pod zebranymi reakcjami i zwraca reakcje na jej podporach. */
function sprawdzBelke(
  belka: Element,
  reakcje: Reakcja[],
  slupyWzdluz: number[],
  u: UstawieniaStatyki,
): { wynik: WynikElementu; reakcjePodpor: Reakcja[] } {
  const a: Vec2 = [belka.od[0], belka.od[1]];
  const b: Vec2 = [belka.do[0], belka.do[1]];
  const { dlugosc } = rzutNaOdcinek(a, a, b);
  const przez = dlugosc || dl2(a, b);
  const kierunek: Vec2 = [(b[0] - a[0]) / (przez || 1), (b[1] - a[1]) / (przez || 1)];
  const naPunkt = (wzdluz: number): Vec2 => [a[0] + kierunek[0] * wzdluz, a[1] + kierunek[1] * wzdluz];

  const mech = znajdzGatunek(belka.gatunek).mech;
  const gWlasny = ciezarWlasnyLiniowy(belka);

  // podpory belki: końce + słupy pod nią, posortowane wzdłuż osi
  const podpory = [0, przez, ...slupyWzdluz].sort((x, y) => x - y);
  const unikalne = podpory.filter((t, i) => i === 0 || t - podpory[i - 1] > TOL);

  const reakcjePodpor: Reakcja[] = unikalne.map((t) => ({ punkt: naPunkt(t), Rg: 0, Rq: 0 }));
  const najgorsze: Sprawdzenie[] = [];
  let maks = -1;
  let rozpMiar = przez;

  // każde przęsło między kolejnymi podporami jako belka wolnopodparta
  for (let i = 0; i < unikalne.length - 1; i++) {
    const tA = unikalne[i];
    const tB = unikalne[i + 1];
    const seg = tB - tA;
    if (seg < 0.05) continue;
    const wSeg = reakcje.filter((r) => {
      const w = rzutNaOdcinek(r.punkt, a, b).wzdluz;
      return w >= tA - TOL && w < tB + TOL;
    });
    const sumRg = wSeg.reduce((s, r) => s + r.Rg, 0);
    const sumRq = wSeg.reduce((s, r) => s + r.Rq, 0);
    const gk = sumRg / seg + gWlasny; // obciążenie równomierne zastępcze [kN/m]
    const qk = sumRq / seg;

    const spr = sprawdzZginany({
      L: seg,
      gk,
      qk,
      b: belka.przekroj[0],
      h: belka.przekroj[1],
      mech,
      klasa: u.klasaUzytkowania,
    });
    const m = Math.max(...spr.map((x) => x.wykorzystanie));
    if (m > maks) {
      maks = m;
      najgorsze.length = 0;
      najgorsze.push(...spr);
      rozpMiar = seg;
    }
    // reakcje przęsła na obie podpory (obciążenie równomierne → po połowie)
    reakcjePodpor[i].Rg += (gk * seg) / 2;
    reakcjePodpor[i].Rq += (qk * seg) / 2;
    reakcjePodpor[i + 1].Rg += (gk * seg) / 2;
    reakcjePodpor[i + 1].Rq += (qk * seg) / 2;
  }

  const wynik = zbudujWynik(belka, najgorsze, rozpMiar, `dźwigar · ${mech.klasa}`);
  return { wynik, reakcjePodpor };
}

/** Słup z policzoną siłą osiową — do sprawdzenia i do doboru fundamentu. */
export interface SlupObciazony {
  id: string;
  nazwa: string;
  punkt: Vec2;
  przekroj: [number, number];
  gatunek?: string;
  dlugosc: number;
  /** Siła osiowa obliczeniowa N_d [kN] (z ciężarem własnym słupa). */
  Nd: number;
}

/**
 * Rozwiązuje ścieżkę obciążeń: reakcje krokwi → belki → słupy. Zwraca wyniki
 * sprawdzeń belek i słupów oraz obciążenia osiowe słupów (do fundamentów).
 */
export function rozwiazSciezke(
  elementy: Element[],
  u: UstawieniaStatyki,
): { wyniki: WynikElementu[]; slupy: SlupObciazony[] } {
  const belki = elementy.filter((e) => /^belka/.test(e.nazwa));
  const slupy = elementy.filter((e) => /^słup/.test(e.nazwa));
  const slupPunkt = (s: Element): Vec2 => [s.od[0], s.od[1]];

  const krokwie = reakcjeKrokwi(elementy, u);

  // akumulator obciążenia osiowego słupów
  const osioweSlupa = new Map<string, { Ng: number; Nq: number }>();
  for (const s of slupy) osioweSlupa.set(s.id, { Ng: 0, Nq: 0 });
  const dodajDoSlupa = (punkt: Vec2, Rg: number, Rq: number) => {
    let najbl: Element | null = null;
    let najd = TOL;
    for (const s of slupy) {
      const d = dl2(punkt, slupPunkt(s));
      if (d < najd) {
        najd = d;
        najbl = s;
      }
    }
    if (najbl) {
      const acc = osioweSlupa.get(najbl.id)!;
      acc.Ng += Rg;
      acc.Nq += Rq;
      return true;
    }
    return false;
  };

  // 1) reakcje krokwi → belki (najbliższa w zasięgu), reszta → słupy bezpośrednio
  const naBelce = new Map<string, Reakcja[]>();
  for (const bel of belki) naBelce.set(bel.id, []);
  for (const r of krokwie) {
    let najbl: Element | null = null;
    let najd = TOL;
    for (const bel of belki) {
      const d = rzutNaOdcinek(r.punkt, [bel.od[0], bel.od[1]], [bel.do[0], bel.do[1]]).d;
      if (d < najd) {
        najd = d;
        najbl = bel;
      }
    }
    if (najbl) naBelce.get(najbl.id)!.push(r);
    else dodajDoSlupa(r.punkt, r.Rg, r.Rq); // krokiew wprost na słupie
  }

  // 2) sprawdź belki, przekaż ich reakcje na słupy
  const wyniki: WynikElementu[] = [];
  for (const bel of belki) {
    const a: Vec2 = [bel.od[0], bel.od[1]];
    const b: Vec2 = [bel.do[0], bel.do[1]];
    const slupyWzdluz = slupy
      .map((s) => rzutNaOdcinek(slupPunkt(s), a, b))
      .filter((r) => r.d < TOL)
      .map((r) => r.wzdluz);
    const { wynik, reakcjePodpor } = sprawdzBelke(bel, naBelce.get(bel.id)!, slupyWzdluz, u);
    wyniki.push(wynik);
    for (const rp of reakcjePodpor) dodajDoSlupa(rp.punkt, rp.Rg, rp.Rq);
  }

  // 3) sprawdź słupy na wyboczenie i zbierz ich obciążenia osiowe
  const slupyObc: SlupObciazony[] = [];
  for (const s of slupy) {
    const { Ng, Nq } = osioweSlupa.get(s.id)!;
    const dlugosc = Math.abs(s.do[2] - s.od[2]) || 2.4;
    const mech = znajdzGatunek(s.gatunek).mech;
    const gWlasny = ciezarWlasnyLiniowy(s) * dlugosc;
    const spr = sprawdzSciskany({
      Ng: Ng + gWlasny,
      Nq,
      b: s.przekroj[0],
      h: s.przekroj[1],
      L: dlugosc,
      mech,
      klasa: u.klasaUzytkowania,
    });
    const Nd = 1.35 * (Ng + gWlasny) + 1.5 * Nq;
    wyniki.push(zbudujWynik(s, spr, dlugosc, `N=${Nd.toFixed(1)} kN · ${mech.klasa}`));
    slupyObc.push({
      id: s.id,
      nazwa: s.nazwa,
      punkt: slupPunkt(s),
      przekroj: [s.przekroj[0], s.przekroj[1]],
      gatunek: s.gatunek,
      dlugosc,
      Nd,
    });
  }

  return { wyniki, slupy: slupyObc };
}

/** Wyniki sprawdzeń belek i słupów (bez obciążeń — do tabeli w panelu). */
export function analizaSciezki(elementy: Element[], u: UstawieniaStatyki): WynikElementu[] {
  return rozwiazSciezke(elementy, u).wyniki;
}
