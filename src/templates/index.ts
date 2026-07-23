import { typeInfo } from '../model/defaults';
import type { PrimitiveDef } from '../model/types';
import { cabinSketch } from './cabin';
import { carportSketch } from './carport';

/** A primitive without an id — templates don't know ids; `withIds` assigns them. */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;
export type PrimitiveSketch = WithoutId<PrimitiveDef>;

/** Assigns sketches sequential ids and label codes like "W-1". */
export function withIds(sketches: PrimitiveSketch[]): PrimitiveDef[] {
  const counter = new Map<string, number>();
  return sketches.map((s, i) => {
    const { prefix } = typeInfo(s.type);
    const nr = (counter.get(prefix) ?? 0) + 1;
    counter.set(prefix, nr);
    return { ...s, id: `sk${i}`, label: s.label ?? `${prefix}-${nr}` } as PrimitiveDef;
  });
}

export interface Template {
  id: string;
  /** i18n key for the template name. */
  nameKey: string;
  build: () => PrimitiveDef[];
}

export const TEMPLATES: Template[] = [
  { id: 'cabin', nameKey: 'template.cabin', build: () => withIds(cabinSketch()) },
  { id: 'carport', nameKey: 'template.carport', build: () => withIds(carportSketch()) },
  {
    id: 'carport-3x3',
    nameKey: 'template.carport3x3',
    build: () =>
      withIds(
        carportSketch({
          width: 3,
          length: 3,
          pitch: 10,
          height: 2.3,
          post: [0.12, 0.12],
          beam: [0.08, 0.16],
          eaves: 0.3,
        }),
      ),
  },
];
