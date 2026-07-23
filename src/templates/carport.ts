import { distribute } from '../model/generators/util';
import type { Vec2 } from '../model/types';
import type { PrimitiveSketch } from './index';

export interface CarportOptions {
  /** Span along X — also the roof slope direction. */
  width?: number;
  /** Length along Y. */
  length?: number;
  /** Roof pitch in degrees. Default 8. */
  pitch?: number;
  /** Underside-of-beam height on the low side. Default 2.4. */
  height?: number;
  eaves?: number;
  post?: Vec2;
  beam?: Vec2;
  /** Max post spacing along Y — the number of rows follows automatically. */
  postSpacing?: number;
  /** Top-of-boards level of the deck; `null` = carport without a deck. */
  deckLevel?: number | null;
  /** Knee braces under the eaves beams. Default true. */
  braces?: boolean;
  /** Horizontal reach of the brace. Default 0.6. */
  braceReach?: number;
}

/** Post-and-beam carport with a mono-pitch roof: 2 rows of posts, eaves beams, optional deck. */
export function carportSketch(o: CarportOptions = {}): PrimitiveSketch[] {
  const width = o.width ?? 4;
  const length = o.length ?? 6;
  const pitch = o.pitch ?? 8;
  const post = o.post ?? [0.14, 0.14];
  const beam = o.beam ?? [0.1, 0.18];
  const eaves = o.eaves ?? 0.35;
  const postSpacing = o.postSpacing ?? 3;
  const deckLevel = o.deckLevel === undefined ? 0.15 : o.deckLevel;

  const tg = Math.tan((pitch * Math.PI) / 180);
  const xLow = post[0] / 2;
  const xHigh = width - post[0] / 2;
  const hLow = o.height ?? 2.4;
  const hHigh = hLow + (xHigh - xLow) * tg;
  const zBeam = (h: number) => h + beam[1] / 2;

  const postYs = distribute(post[1] / 2, length - post[1] / 2, postSpacing);
  const reach = o.braceReach ?? 0.6;

  /**
   * Knee braces under the eaves beam, in the plane of the beam. On end posts only
   * inwards, so they don't stick past the beam end.
   */
  const bracesAt = (x: number, y: number, h: number): PrimitiveSketch[] => {
    if (o.braces === false) return [];
    const first = y === postYs[0];
    const last = y === postYs[postYs.length - 1];
    const sign = first ? 1 : last ? -1 : 1;
    return [
      {
        type: 'brace',
        from: [x, y],
        to: [x, y + reach * sign],
        topLevel: h,
        verticalArm: reach,
        section: [0.08, 0.12],
        bothSides: !first && !last,
        species: 'pine-c24',
      },
    ];
  };

  return [
    ...postYs.flatMap((y): PrimitiveSketch[] => [
      { type: 'post', position: [xLow, y], section: post, height: hLow, species: 'treated-pine' },
      { type: 'post', position: [xHigh, y], section: post, height: hHigh, species: 'treated-pine' },
      ...bracesAt(xLow, y, hLow),
      ...bracesAt(xHigh, y, hHigh),
    ]),
    {
      type: 'beam',
      name: 'eavesBeam',
      from: [xLow, 0, zBeam(hLow)],
      to: [xLow, length, zBeam(hLow)],
      section: beam,
      species: 'pine-c24',
    },
    {
      type: 'beam',
      name: 'eavesBeam',
      from: [xHigh, 0, zBeam(hHigh)],
      to: [xHigh, length, zBeam(hHigh)],
      section: beam,
      species: 'pine-c24',
    },
    {
      type: 'monoPitchRoof',
      position: [0, 0],
      size: [width, length],
      pitch,
      slopeDirection: '-x',
      // rafter underside at x=0 so it lands on top of the eaves beam over the low post
      z: hLow + beam[1] - xLow * tg,
      eaves,
      rafterSpacing: 0.6,
      rafterSection: [0.06, 0.16],
      sheathing: 'osb22',
      species: 'pine-c24',
    },
    ...(deckLevel === null
      ? []
      : ([
          {
            type: 'deck',
            position: [0, 0],
            size: [width, length],
            level: deckLevel,
            joistDirection: 'x',
            joistSpacing: 0.5,
            joistSection: [0.045, 0.145],
            species: 'treated-pine',
            boardSpecies: 'larch',
          },
        ] satisfies PrimitiveSketch[])),
  ];
}
