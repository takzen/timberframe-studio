import type { BelkaDef, Element } from '../typy';

export function generujBelke(def: BelkaDef): Element[] {
  return [
    {
      id: `${def.id}-0`,
      zPrymitywu: def.id,
      nazwa: def.nazwa ?? 'belka',
      grupa: 'belki',
      kategoria: 'konstrukcja',
      od: def.od,
      do: def.do,
      przekroj: def.przekroj,
      gatunek: def.gatunek,
    },
  ];
}
