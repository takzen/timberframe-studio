import type { Element, PostDef } from '../types';

export function generatePost(def: PostDef): Element[] {
  const z0 = def.z ?? 0;
  const [x, y] = def.position;
  return [
    {
      id: `${def.id}-0`,
      fromPrimitive: def.id,
      name: def.name ?? 'post',
      group: 'posts',
      category: 'frame',
      from: [x, y, z0],
      to: [x, y, z0 + def.height],
      // up=[1,0,0]: section height points along world X, hence [dim Y, dim X]
      section: [def.section[1], def.section[0]],
      up: [1, 0, 0],
      species: def.species,
    },
  ];
}
