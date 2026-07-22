import { rozmiesc } from '../model/generatory/util';
import type { Vec2 } from '../model/typy';
import type { SzkicPrymitywu } from './index';

export interface OpcjeWiaty {
  /** Rozpiętość wzdłuż X — zarazem kierunek spadku dachu. */
  szer?: number;
  /** Długość wzdłuż Y. */
  dl?: number;
  /** Kąt dachu w stopniach. Domyślnie 8. */
  kat?: number;
  /** Wysokość spodu belki po niskiej stronie. Domyślnie 2.4. */
  wysokosc?: number;
  okap?: number;
  slup?: Vec2;
  belka?: Vec2;
  /** Maksymalny rozstaw słupów wzdłuż Y — liczba rzędów wychodzi automatycznie. */
  rozstawSlupow?: number;
  /** Poziom góry desek podestu; `null` = wiata bez podestu. */
  poziomPodestu?: number | null;
  /** Zastrzały usztywniające pod belkami oczepowymi. Domyślnie tak. */
  zastrzaly?: boolean;
  /** Wysięg poziomy zastrzału. Domyślnie 0.6. */
  wysiegZastrzalu?: number;
}

/** Wiata słupowa z dachem jednospadowym: 2 rzędy słupów, belki oczepowe, opcjonalny podest. */
export function wiataSzkic(o: OpcjeWiaty = {}): SzkicPrymitywu[] {
  const szer = o.szer ?? 4;
  const dl = o.dl ?? 6;
  const kat = o.kat ?? 8;
  const slup = o.slup ?? [0.14, 0.14];
  const belka = o.belka ?? [0.1, 0.18];
  const okap = o.okap ?? 0.35;
  const rozstawSlupow = o.rozstawSlupow ?? 3;
  const poziomPodestu = o.poziomPodestu === undefined ? 0.15 : o.poziomPodestu;

  const tg = Math.tan((kat * Math.PI) / 180);
  const xNiski = slup[0] / 2;
  const xWysoki = szer - slup[0] / 2;
  const hNiski = o.wysokosc ?? 2.4;
  const hWysoki = hNiski + (xWysoki - xNiski) * tg;
  const zBelki = (h: number) => h + belka[1] / 2;

  const yySlupow = rozmiesc(slup[1] / 2, dl - slup[1] / 2, rozstawSlupow);
  const wysieg = o.wysiegZastrzalu ?? 0.6;

  /**
   * Zastrzały pod belką oczepową, w płaszczyźnie belki. Na słupach skrajnych
   * tylko do środka, żeby nie wystawały poza koniec belki.
   */
  const zastrzalyPrzySlupie = (x: number, y: number, h: number): SzkicPrymitywu[] => {
    if (o.zastrzaly === false) return [];
    const pierwszy = y === yySlupow[0];
    const ostatni = y === yySlupow[yySlupow.length - 1];
    const zwrot = pierwszy ? 1 : ostatni ? -1 : 1;
    return [
      {
        typ: 'zastrzal',
        od: [x, y],
        do: [x, y + wysieg * zwrot],
        zGora: h,
        ramiePionowe: wysieg,
        przekroj: [0.08, 0.12],
        obustronny: !pierwszy && !ostatni,
        gatunek: 'sosna-c24',
      },
    ];
  };

  return [
    ...yySlupow.flatMap(
      (y): SzkicPrymitywu[] => [
        {
          typ: 'slup',
          pozycja: [xNiski, y],
          przekroj: slup,
          wysokosc: hNiski,
          gatunek: 'impregnowana',
        },
        {
          typ: 'slup',
          pozycja: [xWysoki, y],
          przekroj: slup,
          wysokosc: hWysoki,
          gatunek: 'impregnowana',
        },
        ...zastrzalyPrzySlupie(xNiski, y, hNiski),
        ...zastrzalyPrzySlupie(xWysoki, y, hWysoki),
      ],
    ),
    {
      typ: 'belka',
      nazwa: 'belka oczepowa',
      od: [xNiski, 0, zBelki(hNiski)],
      do: [xNiski, dl, zBelki(hNiski)],
      przekroj: belka,
      gatunek: 'sosna-c24',
    },
    {
      typ: 'belka',
      nazwa: 'belka oczepowa',
      od: [xWysoki, 0, zBelki(hWysoki)],
      do: [xWysoki, dl, zBelki(hWysoki)],
      przekroj: belka,
      gatunek: 'sosna-c24',
    },
    {
      typ: 'dachJednospadowy',
      pozycja: [0, 0],
      wymiar: [szer, dl],
      kat,
      kierunekSpadku: '-x',
      // spód krokwi w x=0 tak, by nad słupem niskim wypadł na górze belki oczepowej
      z: hNiski + belka[1] - xNiski * tg,
      okap,
      rozstawKrokwi: 0.6,
      przekrojKrokwi: [0.06, 0.16],
      poszycie: 'osb22',
      gatunek: 'sosna-c24',
    },
    ...(poziomPodestu === null
      ? []
      : ([
          {
            typ: 'podest',
            pozycja: [0, 0],
            wymiar: [szer, dl],
            wysokosc: poziomPodestu,
            kierunekLegarow: 'x',
            rozstawLegarow: 0.5,
            przekrojLegara: [0.045, 0.145],
            gatunek: 'impregnowana',
            gatunekDeski: 'modrzew',
          },
        ] satisfies SzkicPrymitywu[])),
  ];
}
