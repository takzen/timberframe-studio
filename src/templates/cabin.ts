import { findSheathing } from '../model/catalog';
import type { Vec2 } from '../model/types';
import type { PrimitiveSketch } from './index';

// Timber-frame cabin 6×7 m (42 m²) with a deck to the south and a canopy over it.
const WIDTH = 6; // X — across the ridge
const LENGTH = 7; // Y — along the ridge
const WALL_H = 2.6;
const ROOF_PITCH = 35;
const EAVES = 0.4;
const WALL_SECTION: Vec2 = [0.06, 0.14];
const WALL_SHEATHING = 'osb12';
const sheathingThickness = findSheathing(WALL_SHEATHING).thickness;
const inset = WALL_SECTION[1] / 2; // gable walls inset so they don't overlap the corners

// Deck and its canopy — on the -Y side, at the wall with the door
const DECK_X = 0.5;
const DECK_W = 5;
const DECK_D = 3;
const DECK_LEVEL = 0.18;

const Y_FACE = -(WALL_SECTION[1] / 2 + sheathingThickness); // outer face of the south wall
const Y_CANOPY_EAVE = -2.6; // lower canopy edge (without overhang)
const CANOPY_PITCH = 8;
const tgC = Math.tan((CANOPY_PITCH * Math.PI) / 180);
const Z_AT_WALL = 2.5; // rafter underside at the wall face
const Z_CANOPY_EAVE = Z_AT_WALL - (Y_FACE - Y_CANOPY_EAVE) * tgC;
const canopyUnderside = (y: number) => Z_CANOPY_EAVE + (y - Y_CANOPY_EAVE) * tgC;

const CANOPY_POST: Vec2 = [0.12, 0.12];
const CANOPY_BEAM: Vec2 = [0.1, 0.16];
const Y_POSTS = Y_CANOPY_EAVE + 0.1;
const Y_LEDGER = Y_FACE - CANOPY_BEAM[0] / 2;
const X_POSTS = [DECK_X + 0.1, DECK_X + DECK_W - 0.1];

const wall = (
  from: Vec2,
  to: Vec2,
  sheathingSide: 1 | -1,
  openings: NonNullable<Extract<PrimitiveSketch, { type: 'wall' }>['openings']>,
): PrimitiveSketch => ({
  type: 'wall',
  from,
  to,
  height: WALL_H,
  section: WALL_SECTION,
  studSpacing: 0.6,
  sheathing: WALL_SHEATHING,
  sheathingSide,
  species: 'pine-c24',
  openings,
});

export function cabinSketch(): PrimitiveSketch[] {
  return [
    // --- walls ---
    wall([0, 0], [WIDTH, 0], -1, [
      { type: 'door', offset: 2.55, width: 0.9, height: 2.05 },
      { type: 'window', offset: 0.7, width: 1.2, height: 1.2, sill: 0.9 },
      { type: 'window', offset: 4.1, width: 1.2, height: 1.2, sill: 0.9 },
    ]),
    wall([0, LENGTH], [WIDTH, LENGTH], 1, [
      { type: 'window', offset: 2.4, width: 1.2, height: 1.0, sill: 1.2 },
    ]),
    wall([0, inset], [0, LENGTH - inset], 1, [
      { type: 'window', offset: 1.4, width: 1.5, height: 1.3, sill: 0.85 },
      { type: 'window', offset: 4.2, width: 1.0, height: 1.3, sill: 0.85 },
    ]),
    wall([WIDTH, inset], [WIDTH, LENGTH - inset], -1, [
      { type: 'window', offset: 2.0, width: 1.8, height: 1.3, sill: 0.85 },
      { type: 'door', offset: 4.7, width: 0.9, height: 2.05 },
    ]),

    // --- main roof ---
    {
      type: 'gableRoof',
      position: [0, 0],
      size: [WIDTH, LENGTH],
      pitch: ROOF_PITCH,
      ridgeDirection: 'y',
      z: WALL_H,
      eaves: EAVES,
      rafterSpacing: 0.6,
      rafterSection: [0.06, 0.18],
      ridgeSection: [0.08, 0.18],
      sheathing: 'osb22',
      species: 'pine-c24',
    },

    // --- deck ---
    {
      type: 'deck',
      position: [DECK_X, Y_FACE - DECK_D],
      size: [DECK_W, DECK_D],
      level: DECK_LEVEL,
      joistDirection: 'y',
      joistSpacing: 0.5,
      joistSection: [0.045, 0.145],
      species: 'treated-pine',
      boardSpecies: 'larch',
    },

    // --- deck canopy ---
    ...X_POSTS.map(
      (x): PrimitiveSketch => ({
        type: 'post',
        name: 'canopyPost',
        position: [x, Y_POSTS],
        section: CANOPY_POST,
        height: canopyUnderside(Y_POSTS) - CANOPY_BEAM[1],
        species: 'treated-pine',
      }),
    ),
    {
      type: 'beam',
      name: 'canopyBeam',
      from: [DECK_X, Y_POSTS, canopyUnderside(Y_POSTS) - CANOPY_BEAM[1] / 2],
      to: [DECK_X + DECK_W, Y_POSTS, canopyUnderside(Y_POSTS) - CANOPY_BEAM[1] / 2],
      section: CANOPY_BEAM,
      species: 'pine-c24',
    },
    {
      type: 'beam',
      name: 'ledgerBeam',
      from: [DECK_X, Y_LEDGER, canopyUnderside(Y_LEDGER) - CANOPY_BEAM[1] / 2],
      to: [DECK_X + DECK_W, Y_LEDGER, canopyUnderside(Y_LEDGER) - CANOPY_BEAM[1] / 2],
      section: CANOPY_BEAM,
      species: 'pine-c24',
    },
    {
      type: 'monoPitchRoof',
      position: [DECK_X, Y_CANOPY_EAVE],
      size: [DECK_W, Y_FACE - Y_CANOPY_EAVE],
      pitch: CANOPY_PITCH,
      slopeDirection: '-y',
      z: Z_CANOPY_EAVE,
      eaves: 0.25,
      eavesHigh: 0, // roof abutting the wall
      rafterSpacing: 0.6,
      rafterSection: [0.05, 0.14],
      sheathing: 'osb22',
      species: 'pine-c24',
    },
  ];
}
