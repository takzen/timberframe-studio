import { znajdzBeton } from '../katalog';
import type { Element, PlytaDef } from '../typy';

/** Płyta fundamentowa: pojedyncza bryła betonu. */
export function generujPlyte(def: PlytaDef): Element[] {
  const [x, y] = def.pozycja;
  const [dx, dy] = def.wymiar;
  const zGora = def.z ?? 0;
  const beton = znajdzBeton(def.klasaBetonu);
  return [
    {
      id: `${def.id}-0`,
      zPrymitywu: def.id,
      nazwa: 'płyta fundamentowa',
      grupa: 'fundamenty',
      kategoria: 'fundament',
      od: [x + dx / 2, y, zGora - def.grubosc / 2],
      do: [x + dx / 2, y + dy, zGora - def.grubosc / 2],
      // przekrój = [szerokość w poprzek osi, grubość]; oś biegnie wzdłuż Y
      przekroj: [dx, def.grubosc],
      beton: beton.id,
    },
  ];
}
