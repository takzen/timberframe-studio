import type { DeckDef, Element, Vec3 } from '../types';
import { distribute } from './util';

/** Narrowest strip worth ripping a board for [m]; below this the edge stays bare. */
const RIP_MIN = 0.03;

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
  const board = (i: number, s: number, w: number) =>
    el.push({
      id: `${def.id}-board-${i}`,
      fromPrimitive: def.id,
      name: 'deckingBoard',
      group: 'decks' as const,
      category: 'sheathing' as const,
      from: pt(0, s, zBoardAxis),
      to: pt(lenAcross, s, zBoardAxis),
      section: [w, boardT] as [number, number],
      species: boardSpecies,
    });

  const boardCount = Math.max(1, Math.floor((lenAlong + gap + 1e-9) / step));
  for (let i = 0; i < boardCount; i++) board(i, boardW / 2 + i * step, boardW);

  // full boards leave a strip up to one board-and-gap wide bare at the far edge;
  // rip a narrower board to fill it, but only once the strip is wider than the
  // board is thick — below that it would split when fixed, and its width would
  // stop being its larger dimension (which the m² costing keys on). Its far edge
  // lands exactly on the deck edge, one gap past the last full board.
  const ripWidth = lenAlong - boardCount * step;
  if (ripWidth > Math.max(RIP_MIN, boardT)) {
    board(boardCount, boardCount * step + ripWidth / 2, ripWidth);
  }

  return el;
}
