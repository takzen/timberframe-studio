import type { PrymitywDef, TypPrymitywu, Vec2 } from './typy';

export interface OpisTypu {
  typ: TypPrymitywu;
  etykieta: string;
  /** Prefiks numeracji, np. "S" → "Ściana S-1". */
  prefiks: string;
  /** Jak rysuje się ten prymityw w rzucie. */
  rysowanie: 'linia' | 'punkt' | 'prostokat';
  skrot: string;
}

export const TYPY: OpisTypu[] = [
  { typ: 'sciana', etykieta: 'Ściana', prefiks: 'S', rysowanie: 'linia', skrot: '1' },
  { typ: 'belka', etykieta: 'Belka', prefiks: 'B', rysowanie: 'linia', skrot: '2' },
  { typ: 'slup', etykieta: 'Słup', prefiks: 'P', rysowanie: 'punkt', skrot: '3' },
  { typ: 'zastrzal', etykieta: 'Zastrzał', prefiks: 'Z', rysowanie: 'linia', skrot: '7' },
  { typ: 'podest', etykieta: 'Podest', prefiks: 'T', rysowanie: 'prostokat', skrot: '4' },
  {
    typ: 'dachJednospadowy',
    etykieta: 'Dach 1-spadowy',
    prefiks: 'D',
    rysowanie: 'prostokat',
    skrot: '5',
  },
  {
    typ: 'dachDwuspadowy',
    etykieta: 'Dach 2-spadowy',
    prefiks: 'D',
    rysowanie: 'prostokat',
    skrot: '6',
  },
];

export const opisTypu = (typ: TypPrymitywu): OpisTypu =>
  TYPY.find((t) => t.typ === typ) ?? TYPY[0];

/** Prostokąt znormalizowany do narożnika min i dodatnich wymiarów. */
const prostokat = (a: Vec2, b: Vec2) => ({
  pozycja: [Math.min(a[0], b[0]), Math.min(a[1], b[1])] as Vec2,
  wymiar: [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])] as Vec2,
});

/**
 * Nowy prymityw z rozsądnymi wartościami startowymi, na podstawie punktów
 * wskazanych w rzucie. `poziom` to bieżąca wysokość robocza (np. górna
 * krawędź ścian) — używana jako podstawa belek i dachów.
 */
export function nowyPrymityw(
  typ: TypPrymitywu,
  id: string,
  etykieta: string,
  a: Vec2,
  b: Vec2,
  poziom: number,
): PrymitywDef {
  const baza = { id, etykieta };
  switch (typ) {
    case 'sciana':
      return {
        ...baza,
        typ: 'sciana',
        od: a,
        do: b,
        wysokosc: 2.6,
        przekroj: [0.06, 0.14],
        rozstawSlupkow: 0.6,
        poszycie: 'osb12',
        stronaPoszycia: -1,
        gatunek: 'sosna-c24',
        otwory: [],
      };
    case 'belka':
      return {
        ...baza,
        typ: 'belka',
        od: [a[0], a[1], poziom],
        do: [b[0], b[1], poziom],
        przekroj: [0.1, 0.18],
        gatunek: 'sosna-c24',
      };
    case 'zastrzal':
      return {
        ...baza,
        typ: 'zastrzal',
        od: a,
        // rysowany jednym pociągnięciem: gdy użytkownik tylko kliknie, dajemy typowe 60 cm
        do: Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05 ? [a[0] + 0.6, a[1]] : b,
        zGora: poziom > 0.5 ? poziom : 2.4,
        ramiePionowe: 0.6,
        przekroj: [0.08, 0.12],
        obustronny: true,
        gatunek: 'sosna-c24',
      };
    case 'slup':
      return {
        ...baza,
        typ: 'slup',
        pozycja: a,
        przekroj: [0.14, 0.14],
        wysokosc: poziom > 0.5 ? poziom : 2.4,
        gatunek: 'sosna-c24',
      };
    case 'podest':
      return {
        ...baza,
        typ: 'podest',
        ...prostokat(a, b),
        wysokosc: 0.15,
        kierunekLegarow: 'y',
        rozstawLegarow: 0.5,
        przekrojLegara: [0.045, 0.145],
        gatunek: 'impregnowana',
        gatunekDeski: 'modrzew',
      };
    case 'dachJednospadowy': {
      const r = prostokat(a, b);
      return {
        ...baza,
        typ: 'dachJednospadowy',
        ...r,
        kat: 8,
        kierunekSpadku: r.wymiar[0] >= r.wymiar[1] ? '-x' : '-y',
        z: poziom > 0.5 ? poziom : 2.6,
        okap: 0.35,
        rozstawKrokwi: 0.6,
        przekrojKrokwi: [0.06, 0.16],
        poszycie: 'osb22',
        gatunek: 'sosna-c24',
      };
    }
    case 'dachDwuspadowy': {
      const r = prostokat(a, b);
      return {
        ...baza,
        typ: 'dachDwuspadowy',
        ...r,
        kat: 35,
        kierunekKalenicy: r.wymiar[1] >= r.wymiar[0] ? 'y' : 'x',
        z: poziom > 0.5 ? poziom : 2.6,
        okap: 0.4,
        rozstawKrokwi: 0.6,
        przekrojKrokwi: [0.06, 0.18],
        przekrojKalenicy: [0.08, 0.18],
        poszycie: 'osb22',
        gatunek: 'sosna-c24',
      };
    }
  }
}
