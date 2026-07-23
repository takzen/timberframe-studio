import { LACZNIKI, znajdzGatunek, znajdzLacznik, znajdzPoszycie } from './katalog';
import type { Element, Kategoria } from './typy';
import { dlugoscDoCiecia, dlugoscElementu } from './generatory/util';

export interface PozycjaMaterialowa {
  kategoria: Kategoria;
  nazwa: string;
  /** Np. "45×145". */
  przekrojCm: string;
  /** Gatunek drewna lub materiał poszycia. */
  material: string;
  /** true = wyceniane po m² (płyty, blacha, papa); false = po m³ drewna. */
  plytowy: boolean;
  sztuk: number;
  sumaMb: number;
  /** Powierzchnia — tylko dla płyt i desek. */
  sumaM2: number | null;
  sumaM3: number;
  koszt: number;
  /** Rozbicie na długości, np. "3× 2.20, 3× 2.74". */
  dlugosci: string;
}

export interface PozycjaLacznika {
  id: string;
  nazwa: string;
  sztuk: number;
  cenaSzt: number;
  koszt: number;
}

export interface Zestawienie {
  pozycje: PozycjaMaterialowa[];
  laczniki: PozycjaLacznika[];
  kosztDrewna: number;
  kosztPoszycia: number;
  kosztLacznikow: number;
  kosztRazem: number;
  sumaMb: number;
  sumaM2: number;
  sumaM3: number;
}

const mm = (m: number): string => {
  const v = Math.round(m * 1000);
  return String(v);
};

/** Przekrój w konwencji handlowej: mniejszy wymiar × większy, w mm. */
const opisPrzekroju = ([a, b]: [number, number]): string =>
  `${mm(Math.min(a, b))}×${mm(Math.max(a, b))}`;

const zaokr = (v: number, miejsc = 2) => {
  const m = 10 ** miejsc;
  return Math.round(v * m) / m;
};

/** Płyty i deski mają jeden wymiar cienki — powierzchnia liczy się z większego. */
const szerokoscKryjaca = (el: Element) => Math.max(el.przekroj[0], el.przekroj[1]);
const plaski = (el: Element) => Boolean(el.material) || el.kategoria === 'poszycie';

/**
 * Łączniki potrzebne dla jednego elementu. Reguły heurystyczne wg typu połączenia —
 * nie zastępują projektu konstrukcyjnego, dają zamówienie z zapasem.
 */
function lacznikiElementu(el: Element): { id: string; ilosc: number }[] {
  const dl = dlugoscElementu(el);
  const co = (dystans: number, min: number) => Math.max(min, Math.ceil(dl / dystans) + 1);

  switch (el.nazwa) {
    case 'słup':
    case 'słup zadaszenia':
      return [
        { id: 'stopa-slupa', ilosc: 1 },
        { id: 'kotwa-m12', ilosc: 2 },
        { id: 'katownik-wzm', ilosc: 2 },
        { id: 'wkret-8x160', ilosc: 6 },
      ];
    case 'belka':
    case 'belka oczepowa':
    case 'belka zadaszenia':
    case 'belka przyścienna':
    case 'belka kalenicowa':
      return [
        { id: 'katownik-wzm', ilosc: 2 },
        { id: 'wkret-8x160', ilosc: 4 },
      ];
    case 'zastrzał':
      return [
        { id: 'katownik-90', ilosc: 2 },
        { id: 'wkret-8x160', ilosc: 4 },
      ];
    case 'krokiew':
      return [
        { id: 'lacznik-krokwiowy', ilosc: 2 },
        { id: 'wkret-5x90', ilosc: 6 },
      ];
    case 'legar':
      return [
        { id: 'katownik-90', ilosc: 2 },
        { id: 'wkret-5x90', ilosc: 8 },
      ];
    case 'podwalina':
      return [{ id: 'kotwa-m12', ilosc: co(1.5, 2) }];
    case 'oczep':
      return [{ id: 'wkret-8x160', ilosc: co(0.6, 2) }];
    case 'słupek':
      return [{ id: 'wkret-5x90', ilosc: 4 }];
    case 'nadproże':
      return [{ id: 'wkret-8x160', ilosc: 4 }];
    case 'rygiel':
      return [{ id: 'wkret-5x90', ilosc: 4 }];
    case 'deska tarasowa':
      return [{ id: 'wkret-tarasowy', ilosc: 2 * co(0.5, 2) }];
    case 'poszycie ściany':
    case 'poszycie dachu':
      return [{ id: 'wkret-5x90', ilosc: Math.ceil(dl * szerokoscKryjaca(el) * 10) }];
    default:
      return [];
  }
}

function opisMaterialu(el: Element): {
  opis: string;
  plytowy: boolean;
  cena: (m3: number, m2: number) => number;
} {
  if (el.material) {
    const m = znajdzPoszycie(el.material);
    return { opis: m.nazwa, plytowy: true, cena: (_m3, m2) => m2 * m.cenaM2 };
  }
  const g = znajdzGatunek(el.gatunek);
  return { opis: g.nazwa, plytowy: false, cena: (m3) => m3 * g.cenaM3 };
}

export function zestawienie(elementy: Element[]): Zestawienie {
  const grupy = new Map<string, { poz: PozycjaMaterialowa; dl: Map<number, number> }>();
  const szt = new Map<string, number>();

  for (const el of elementy) {
    if (el.beton) continue; // beton wyceniany osobno w module fundamentów
    const przekrojCm = opisPrzekroju(el.przekroj);
    const { opis, plytowy, cena } = opisMaterialu(el);
    const klucz = `${el.kategoria}|${el.nazwa}|${przekrojCm}|${opis}`;
    // zamawiamy i tniemy dłuższą krawędź, nie oś — przy ukosach to różnica
    const dl = zaokr(dlugoscDoCiecia(el));
    const m3 = dl * el.przekroj[0] * el.przekroj[1];
    const m2 = dl * szerokoscKryjaca(el);

    let g = grupy.get(klucz);
    if (!g) {
      g = {
        poz: {
          kategoria: el.kategoria,
          nazwa: el.nazwa,
          przekrojCm,
          material: opis,
          plytowy,
          sztuk: 0,
          sumaMb: 0,
          sumaM2: plaski(el) ? 0 : null,
          sumaM3: 0,
          koszt: 0,
          dlugosci: '',
        },
        dl: new Map(),
      };
      grupy.set(klucz, g);
    }
    g.poz.sztuk += 1;
    g.poz.sumaMb += dl;
    g.poz.sumaM3 += m3;
    g.poz.koszt += cena(m3, m2);
    if (g.poz.sumaM2 !== null) g.poz.sumaM2 += m2;
    g.dl.set(dl, (g.dl.get(dl) ?? 0) + 1);

    for (const l of lacznikiElementu(el)) szt.set(l.id, (szt.get(l.id) ?? 0) + l.ilosc);
  }

  const pozycje = [...grupy.values()].map(({ poz, dl }) => ({
    ...poz,
    sumaMb: zaokr(poz.sumaMb),
    sumaM2: poz.sumaM2 === null ? null : zaokr(poz.sumaM2),
    sumaM3: zaokr(poz.sumaM3, 3),
    koszt: zaokr(poz.koszt),
    dlugosci: [...dl.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([d, ile]) => `${ile}× ${d.toFixed(2)}`)
      .join(', '),
  }));
  pozycje.sort(
    (a, b) =>
      a.kategoria.localeCompare(b.kategoria) ||
      a.nazwa.localeCompare(b.nazwa, 'pl') ||
      a.przekrojCm.localeCompare(b.przekrojCm),
  );

  const laczniki: PozycjaLacznika[] = LACZNIKI.filter((l) => szt.has(l.id)).map((l) => {
    const sztuk = szt.get(l.id) ?? 0;
    return { id: l.id, nazwa: l.nazwa, sztuk, cenaSzt: l.cenaSzt, koszt: zaokr(sztuk * l.cenaSzt) };
  });

  const suma = (f: (p: PozycjaMaterialowa) => number) =>
    zaokr(pozycje.reduce((s, p) => s + f(p), 0));
  const kosztDrewna = suma((p) => (p.plytowy ? 0 : p.koszt));
  const kosztPoszycia = suma((p) => (p.plytowy ? p.koszt : 0));
  const kosztLacznikow = zaokr(laczniki.reduce((s, l) => s + l.koszt, 0));

  return {
    pozycje,
    laczniki,
    kosztDrewna,
    kosztPoszycia,
    kosztLacznikow,
    kosztRazem: zaokr(kosztDrewna + kosztPoszycia + kosztLacznikow),
    sumaMb: suma((p) => p.sumaMb),
    sumaM2: suma((p) => p.sumaM2 ?? 0),
    sumaM3: zaokr(pozycje.reduce((s, p) => s + p.sumaM3, 0), 3),
  };
}

export function doCSV(z: Zestawienie): string {
  const w = ['kategoria;nazwa;przekroj_mm;material;sztuk;dlugosci_m;suma_mb;suma_m2;suma_m3;koszt_pln'];
  for (const p of z.pozycje) {
    w.push(
      [
        p.kategoria,
        p.nazwa,
        p.przekrojCm,
        p.material,
        p.sztuk,
        `"${p.dlugosci}"`,
        p.sumaMb,
        p.sumaM2 ?? '',
        p.sumaM3,
        p.koszt,
      ].join(';'),
    );
  }
  w.push('');
  w.push('laczniki;nazwa;sztuk;cena_szt;koszt_pln');
  for (const l of z.laczniki) w.push(['', l.nazwa, l.sztuk, l.cenaSzt, l.koszt].join(';'));
  w.push('');
  w.push(`;RAZEM drewno;;;;;;;;${z.kosztDrewna}`);
  w.push(`;RAZEM poszycia;;;;;;;;${z.kosztPoszycia}`);
  w.push(`;RAZEM laczniki;;;;;;;;${z.kosztLacznikow}`);
  w.push(`;RAZEM projekt;;;;;;;;${z.kosztRazem}`);
  return w.join('\n');
}

export function eksportujCSV(z: Zestawienie, nazwaPliku: string): void {
  const csv = doCSV(z);
  console.log(csv);
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nazwaPliku;
  a.click();
  URL.revokeObjectURL(url);
}

export { znajdzLacznik };
