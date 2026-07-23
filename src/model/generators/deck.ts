import type { DeckDef, Element, Vec3 } from '../types';
import { distribute } from './util';

/**
 * Deck: joists every N cm along `joistDirection`, decking boards perpendicular to
 * the joists, laid with a gap. `level` = top-of-boards level.
 */
export function generateDeck(def: DeckDef): Element[] {
  const [x0, y0] = def.position;
  const [dx, dy] = def.size;
  const joist = def.joistSection ?? [0.045, 0.145];
  const spacing = def.joistSpacing ?? 0.5;
  const dir = def.joistDirection ?? 'y';
  const boardW = def.board?.width ?? 0.14;
  const boardT = def.board?.thickness ?? 0.025;
  const gap = def.board?.gap ?? 0.006;
  const boardSpecies = def.boardSpecies ?? def.species;

  const zJoistAxis = def.level - boardT - joist[1] / 2;
  const zBoardAxis = def.level - boardT / 2;

  // `along` — coordinate along the joist axis, `across` — perpendicular to it
  const lenAlong = dir === 'y' ? dy : dx;
  const lenAcross = dir === 'y' ? dx : dy;
  const pt = (across: number, along: number, z: number): Vec3 =>
    dir === 'y' ? [x0 + across, y0 + along, z] : [x0 + along, y0 + across, z];

  const el: Element[] = [];

  distribute(joist[0] / 2, lenAcross - joist[0] / 2, spacing).forEach((p, i) => {
    el.push({
      id: `${def.id}-joist-${i}`,
      fromPrimitive: def.id,
      name: 'joist',
      group: 'decks',
      category: 'frame',
      from: pt(p, 0, zJoistAxis),
      to: pt(p, lenAlong, zJoistAxis),
      section: [joist[0], joist[1]],
      species: def.species,
      // joist as a simply-supported beam over its full length (no intermediate supports)
      structural: { span: lenAlong, tributaryWidth: spacing, pitch: 0, imposed: true },
    });
  });

  const step = boardW + gap;
  const boardCount = Math.max(1, Math.floor((lenAlong + gap + 1e-9) / step));
  for (let i = 0; i < boardCount; i++) {
    const s = boardW / 2 + i * step;
    el.push({
      id: `${def.id}-board-${i}`,
      fromPrimitive: def.id,
      name: 'deckingBoard',
      group: 'decks',
      category: 'sheathing',
      from: pt(0, s, zBoardAxis),
      to: pt(lenAcross, s, zBoardAxis),
      section: [boardW, boardT],
      species: boardSpecies,
    });
  }

  return el;
}
