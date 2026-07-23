import type { BeamDef, Element } from '../types';

export function generateBeam(def: BeamDef): Element[] {
  return [
    {
      id: `${def.id}-0`,
      fromPrimitive: def.id,
      name: def.name ?? 'beam',
      group: 'beams',
      category: 'frame',
      from: def.from,
      to: def.to,
      section: def.section,
      species: def.species,
    },
  ];
}
