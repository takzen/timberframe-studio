import type { Element, PrimitiveDef } from './types';
import { generateBeam } from './generators/beam';
import { generateBrace } from './generators/brace';
import { generateDeck } from './generators/deck';
import { generateGableRoof } from './generators/gableRoof';
import { generateMonoPitchRoof } from './generators/monoPitchRoof';
import { generatePost } from './generators/post';
import { generateSlab } from './generators/slab';
import { generateWall } from './generators/wall';

export function generatePrimitive(def: PrimitiveDef): Element[] {
  switch (def.type) {
    case 'post':
      return generatePost(def);
    case 'beam':
      return generateBeam(def);
    case 'brace':
      return generateBrace(def);
    case 'deck':
      return generateDeck(def);
    case 'monoPitchRoof':
      return generateMonoPitchRoof(def);
    case 'gableRoof':
      return generateGableRoof(def);
    case 'wall':
      return generateWall(def);
    case 'slab':
      return generateSlab(def);
  }
}

export function generateElements(primitives: PrimitiveDef[]): Element[] {
  return primitives.flatMap(generatePrimitive);
}
