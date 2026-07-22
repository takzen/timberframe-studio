import { opisTypu } from '../model/domyslne';
import type { PrymitywDef } from '../model/typy';
import { domekSzkic } from './domek';
import { wiataSzkic } from './wiata';

/** Prymityw bez identyfikatora — szablony nie znają id, nadaje je `zIdami`. */
type BezId<T> = T extends unknown ? Omit<T, 'id'> : never;
export type SzkicPrymitywu = BezId<PrymitywDef>;

/** Nadaje szkicom kolejne identyfikatory i etykiety typu "Ściana S-1". */
export function zIdami(szkice: SzkicPrymitywu[]): PrymitywDef[] {
  const licznik = new Map<string, number>();
  return szkice.map((s, i) => {
    const { prefiks, etykieta } = opisTypu(s.typ);
    const nr = (licznik.get(prefiks) ?? 0) + 1;
    licznik.set(prefiks, nr);
    return {
      ...s,
      id: `sz${i}`,
      etykieta: s.etykieta ?? `${etykieta} ${prefiks}-${nr}`,
    } as PrymitywDef;
  });
}

export interface Szablon {
  id: string;
  nazwa: string;
  opis: string;
  buduj: () => PrymitywDef[];
}

export const SZABLONY: Szablon[] = [
  {
    id: 'domek',
    nazwa: 'Dom szkieletowy 6×7 m',
    opis: '42 m², 4 ściany z otworami, dach dwuspadowy 35°, taras 5×3 m z zadaszeniem',
    buduj: () => zIdami(domekSzkic()),
  },
  {
    id: 'wiata',
    nazwa: 'Wiata 4×6 m',
    opis: '6 słupów 14×14, belki oczepowe, dach jednospadowy 8°, podest',
    buduj: () => zIdami(wiataSzkic()),
  },
  {
    id: 'wiata-3x3',
    nazwa: 'Wiata 3×3 m',
    opis: '4 słupy 12×12, dach jednospadowy 10°, podest',
    buduj: () =>
      zIdami(
        wiataSzkic({
          szer: 3,
          dl: 3,
          kat: 10,
          wysokosc: 2.3,
          slup: [0.12, 0.12],
          belka: [0.08, 0.16],
          okap: 0.3,
        }),
      ),
  },
];
