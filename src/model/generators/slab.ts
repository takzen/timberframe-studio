import { findConcrete } from '../catalog';
import type { Element, SlabDef } from '../types';

/** Foundation slab: a single block of concrete. */
export function generateSlab(def: SlabDef): Element[] {
  const [x, y] = def.position;
  const [dx, dy] = def.size;
  const zTop = def.z ?? 0;
  const concrete = findConcrete(def.concreteClass);
  return [
    {
      id: `${def.id}-0`,
      fromPrimitive: def.id,
      name: 'foundationSlab',
      group: 'foundations',
      category: 'foundation',
      from: [x + dx / 2, y, zTop - def.thickness / 2],
      to: [x + dx / 2, y + dy, zTop - def.thickness / 2],
      // section = [width across the axis, thickness]; the axis runs along Y
      section: [dx, def.thickness],
      concrete: concrete.id,
    },
  ];
}
