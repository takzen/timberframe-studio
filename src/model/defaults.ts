import type { PrimitiveDef, PrimitiveType, Vec2 } from './types';

export type DrawKind = 'line' | 'point' | 'rect';

export interface TypeInfo {
  type: PrimitiveType;
  /** i18n key for the tool/label name (`tool.*`). */
  labelKey: string;
  /** Numbering prefix, e.g. "W" → "W-1". */
  prefix: string;
  /** How this primitive is drawn on the plan. */
  draw: DrawKind;
  shortcut: string;
}

export const TYPES: TypeInfo[] = [
  { type: 'wall', labelKey: 'tool.wall', prefix: 'W', draw: 'line', shortcut: '1' },
  { type: 'beam', labelKey: 'tool.beam', prefix: 'B', draw: 'line', shortcut: '2' },
  { type: 'post', labelKey: 'tool.post', prefix: 'P', draw: 'point', shortcut: '3' },
  { type: 'brace', labelKey: 'tool.brace', prefix: 'K', draw: 'line', shortcut: '7' },
  { type: 'deck', labelKey: 'tool.deck', prefix: 'T', draw: 'rect', shortcut: '4' },
  { type: 'monoPitchRoof', labelKey: 'tool.monoPitchRoof', prefix: 'R', draw: 'rect', shortcut: '5' },
  { type: 'gableRoof', labelKey: 'tool.gableRoof', prefix: 'R', draw: 'rect', shortcut: '6' },
  { type: 'slab', labelKey: 'tool.slab', prefix: 'F', draw: 'rect', shortcut: '8' },
];

export const typeInfo = (type: PrimitiveType): TypeInfo =>
  TYPES.find((t) => t.type === type) ?? TYPES[0];

/** Rectangle normalised to the min corner with positive dimensions. */
const rect = (a: Vec2, b: Vec2) => ({
  position: [Math.min(a[0], b[0]), Math.min(a[1], b[1])] as Vec2,
  size: [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])] as Vec2,
});

/**
 * A new primitive with sensible starting values, from the points picked on the
 * plan. `level` is the current work level (e.g. top of walls) — used as the base
 * for new beams and roofs.
 */
export function newPrimitive(
  type: PrimitiveType,
  id: string,
  label: string,
  a: Vec2,
  b: Vec2,
  level: number,
): PrimitiveDef {
  const base = { id, label };
  switch (type) {
    case 'wall':
      return {
        ...base,
        type: 'wall',
        from: a,
        to: b,
        height: 2.6,
        section: [0.06, 0.14],
        studSpacing: 0.6,
        sheathing: 'osb12',
        sheathingSide: -1,
        species: 'pine-c24',
        openings: [],
      };
    case 'beam':
      return {
        ...base,
        type: 'beam',
        from: [a[0], a[1], level],
        to: [b[0], b[1], level],
        section: [0.1, 0.18],
        species: 'pine-c24',
      };
    case 'brace':
      return {
        ...base,
        type: 'brace',
        from: a,
        // drawn with one drag; a bare click gives a typical 60 cm reach
        to: Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.05 ? [a[0] + 0.6, a[1]] : b,
        topLevel: level > 0.5 ? level : 2.4,
        verticalArm: 0.6,
        section: [0.08, 0.12],
        bothSides: true,
        species: 'pine-c24',
      };
    case 'post':
      return {
        ...base,
        type: 'post',
        position: a,
        section: [0.14, 0.14],
        height: level > 0.5 ? level : 2.4,
        species: 'pine-c24',
      };
    case 'deck':
      return {
        ...base,
        type: 'deck',
        ...rect(a, b),
        level: 0.15,
        joistDirection: 'y',
        joistSpacing: 0.5,
        joistSection: [0.045, 0.145],
        species: 'treated-pine',
        boardSpecies: 'larch',
      };
    case 'monoPitchRoof': {
      const r = rect(a, b);
      return {
        ...base,
        type: 'monoPitchRoof',
        ...r,
        pitch: 8,
        slopeDirection: r.size[0] >= r.size[1] ? '-x' : '-y',
        z: level > 0.5 ? level : 2.6,
        eaves: 0.35,
        rafterSpacing: 0.6,
        rafterSection: [0.06, 0.16],
        sheathing: 'osb22',
        species: 'pine-c24',
      };
    }
    case 'gableRoof': {
      const r = rect(a, b);
      return {
        ...base,
        type: 'gableRoof',
        ...r,
        pitch: 35,
        ridgeDirection: r.size[1] >= r.size[0] ? 'y' : 'x',
        z: level > 0.5 ? level : 2.6,
        eaves: 0.4,
        rafterSpacing: 0.6,
        rafterSection: [0.06, 0.18],
        ridgeSection: [0.08, 0.18],
        sheathing: 'osb22',
        species: 'pine-c24',
      };
    }
    case 'slab':
      return {
        ...base,
        type: 'slab',
        ...rect(a, b),
        thickness: 0.2,
        z: 0,
        concreteClass: 'c16-20',
      };
  }
}
