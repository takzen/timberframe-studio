import { znajdzPoszycie } from '../model/katalog';
import type { Vec2 } from '../model/typy';
import type { SzkicPrymitywu } from './index';

// Dom szkieletowy 6×7 m (42 m²) z tarasem od południa i zadaszeniem tarasu.
const SZER = 6; // X — w poprzek kalenicy
const DL = 7; // Y — wzdłuż kalenicy
const H_SCIANY = 2.6;
const KAT_DACHU = 35;
const OKAP = 0.4;
const SCIANA: Vec2 = [0.06, 0.14];
const POSZYCIE_SCIAN = 'osb12';
const grubPoszycia = znajdzPoszycie(POSZYCIE_SCIAN).grubosc;
const g = SCIANA[1] / 2; // wcięcie ścian szczytowych, by nie nachodziły na narożniki

// Taras (podest) i jego zadaszenie — po stronie -Y, przy ścianie z drzwiami
const TARAS_X = 0.5;
const TARAS_SZER = 5;
const TARAS_DL = 3;
const POZIOM_TARASU = 0.18;

const Y_LICO = -(SCIANA[1] / 2 + grubPoszycia); // zewnętrzne lico ściany południowej
const Y_OKAP_ZADASZ = -2.6; // dolna krawędź zadaszenia (bez okapu)
const ZADASZ_KAT = 8;
const tgZ = Math.tan((ZADASZ_KAT * Math.PI) / 180);
const Z_PRZY_SCIANIE = 2.5; // spód krokwi zadaszenia przy licu ściany
const Z_OKAP_ZADASZ = Z_PRZY_SCIANIE - (Y_LICO - Y_OKAP_ZADASZ) * tgZ;
const spodZadaszenia = (y: number) => Z_OKAP_ZADASZ + (y - Y_OKAP_ZADASZ) * tgZ;

const SLUP_TARASU: Vec2 = [0.12, 0.12];
const BELKA_TARASU: Vec2 = [0.1, 0.16];
const Y_SLUPOW = Y_OKAP_ZADASZ + 0.1;
const Y_BELKI_PRZYSCIENNEJ = Y_LICO - BELKA_TARASU[0] / 2;
const X_SLUPOW = [TARAS_X + 0.1, TARAS_X + TARAS_SZER - 0.1];

const sciana = (
  od: Vec2,
  do_: Vec2,
  stronaPoszycia: 1 | -1,
  otwory: NonNullable<Extract<SzkicPrymitywu, { typ: 'sciana' }>['otwory']>,
): SzkicPrymitywu => ({
  typ: 'sciana',
  od,
  do: do_,
  wysokosc: H_SCIANY,
  przekroj: SCIANA,
  rozstawSlupkow: 0.6,
  poszycie: POSZYCIE_SCIAN,
  stronaPoszycia,
  gatunek: 'sosna-c24',
  otwory,
});

export function domekSzkic(): SzkicPrymitywu[] {
  return [
    // --- ściany ---
    sciana([0, 0], [SZER, 0], -1, [
      { typ: 'drzwi', odleglosc: 2.55, szerokosc: 0.9, wysokosc: 2.05 },
      { typ: 'okno', odleglosc: 0.7, szerokosc: 1.2, wysokosc: 1.2, parapet: 0.9 },
      { typ: 'okno', odleglosc: 4.1, szerokosc: 1.2, wysokosc: 1.2, parapet: 0.9 },
    ]),
    sciana([0, DL], [SZER, DL], 1, [
      { typ: 'okno', odleglosc: 2.4, szerokosc: 1.2, wysokosc: 1.0, parapet: 1.2 },
    ]),
    sciana([0, g], [0, DL - g], 1, [
      { typ: 'okno', odleglosc: 1.4, szerokosc: 1.5, wysokosc: 1.3, parapet: 0.85 },
      { typ: 'okno', odleglosc: 4.2, szerokosc: 1.0, wysokosc: 1.3, parapet: 0.85 },
    ]),
    sciana([SZER, g], [SZER, DL - g], -1, [
      { typ: 'okno', odleglosc: 2.0, szerokosc: 1.8, wysokosc: 1.3, parapet: 0.85 },
      { typ: 'drzwi', odleglosc: 4.7, szerokosc: 0.9, wysokosc: 2.05 },
    ]),

    // --- dach główny ---
    {
      typ: 'dachDwuspadowy',
      pozycja: [0, 0],
      wymiar: [SZER, DL],
      kat: KAT_DACHU,
      kierunekKalenicy: 'y',
      z: H_SCIANY,
      okap: OKAP,
      rozstawKrokwi: 0.6,
      przekrojKrokwi: [0.06, 0.18],
      przekrojKalenicy: [0.08, 0.18],
      poszycie: 'osb22',
      gatunek: 'sosna-c24',
    },

    // --- taras ---
    {
      typ: 'podest',
      pozycja: [TARAS_X, Y_LICO - TARAS_DL],
      wymiar: [TARAS_SZER, TARAS_DL],
      wysokosc: POZIOM_TARASU,
      kierunekLegarow: 'y',
      rozstawLegarow: 0.5,
      przekrojLegara: [0.045, 0.145],
      gatunek: 'impregnowana',
      gatunekDeski: 'modrzew',
    },

    // --- zadaszenie tarasu ---
    ...X_SLUPOW.map(
      (x): SzkicPrymitywu => ({
        typ: 'slup',
        nazwa: 'słup zadaszenia',
        pozycja: [x, Y_SLUPOW],
        przekroj: SLUP_TARASU,
        wysokosc: spodZadaszenia(Y_SLUPOW) - BELKA_TARASU[1],
        gatunek: 'impregnowana',
      }),
    ),
    {
      typ: 'belka',
      nazwa: 'belka zadaszenia',
      od: [TARAS_X, Y_SLUPOW, spodZadaszenia(Y_SLUPOW) - BELKA_TARASU[1] / 2],
      do: [TARAS_X + TARAS_SZER, Y_SLUPOW, spodZadaszenia(Y_SLUPOW) - BELKA_TARASU[1] / 2],
      przekroj: BELKA_TARASU,
      gatunek: 'sosna-c24',
    },
    {
      typ: 'belka',
      nazwa: 'belka przyścienna',
      od: [
        TARAS_X,
        Y_BELKI_PRZYSCIENNEJ,
        spodZadaszenia(Y_BELKI_PRZYSCIENNEJ) - BELKA_TARASU[1] / 2,
      ],
      do: [
        TARAS_X + TARAS_SZER,
        Y_BELKI_PRZYSCIENNEJ,
        spodZadaszenia(Y_BELKI_PRZYSCIENNEJ) - BELKA_TARASU[1] / 2,
      ],
      przekroj: BELKA_TARASU,
      gatunek: 'sosna-c24',
    },
    {
      typ: 'dachJednospadowy',
      pozycja: [TARAS_X, Y_OKAP_ZADASZ],
      wymiar: [TARAS_SZER, Y_LICO - Y_OKAP_ZADASZ],
      kat: ZADASZ_KAT,
      kierunekSpadku: '-y',
      z: Z_OKAP_ZADASZ,
      okap: 0.25,
      okapGora: 0, // dach dostawiony do ściany
      rozstawKrokwi: 0.6,
      przekrojKrokwi: [0.05, 0.14],
      poszycie: 'osb22',
      gatunek: 'sosna-c24',
    },
  ];
}
