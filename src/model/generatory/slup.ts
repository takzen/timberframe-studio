import type { Element, SlupDef } from '../typy';

export function generujSlup(def: SlupDef): Element[] {
  const z0 = def.z ?? 0;
  const [x, y] = def.pozycja;
  return [
    {
      id: `${def.id}-0`,
      zPrymitywu: def.id,
      nazwa: def.nazwa ?? 'słup',
      grupa: 'slupy',
      kategoria: 'konstrukcja',
      od: [x, y, z0],
      do: [x, y, z0 + def.wysokosc],
      // gora=[1,0,0]: wysokość przekroju celuje w X świata, stąd [wymiar Y, wymiar X]
      przekroj: [def.przekroj[1], def.przekroj[0]],
      gora: [1, 0, 0],
      gatunek: def.gatunek,
    },
  ];
}
