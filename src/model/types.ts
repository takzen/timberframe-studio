// Units: metres. Axes: X/Y ground plane, Z up.

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export type Category = 'frame' | 'sheathing' | 'foundation';
export type Group = 'posts' | 'beams' | 'decks' | 'roofs' | 'walls' | 'foundations';

/** A single physical member (beam / stud / board / panel / footing). */
export interface Element {
  id: string;
  /** Id of the primitive this came from — used for plan selection. */
  fromPrimitive: string;
  /** Member-name key (see i18n `member.*`). */
  name: string;
  group: Group;
  category: Category;
  /** Member axis — any orientation in space. */
  from: Vec3;
  to: Vec3;
  /** [width, height] of the section in m; height points towards `up` (default vertical). */
  section: Vec2;
  /** Orientation hint: the direction the section height should point. */
  up?: Vec3;
  /** Timber species/grade id from the catalog (frame members and boards). */
  species?: string;
  /** Sheathing material id from the catalog (panels, sheet, felt). */
  material?: string;
  /** Concrete class id from the catalog — a concrete element (slab, footing). */
  concrete?: string;
  /**
   * Data for the indicative capacity check (simply-supported bending members).
   * An element without this field is skipped by the structural analysis.
   */
  structural?: StructuralData;
  /**
   * End miter in degrees, measured from the plane perpendicular to the axis.
   * 0 = square end. Positive lengthens the bottom edge of the member.
   */
  startMiter?: number;
  endMiter?: number;
}

export interface StructuralData {
  /** Span between supports [m] (for rafters — the slope length). */
  span: number;
  /** Load width = member spacing [m] (tributary width). */
  tributaryWidth: number;
  /** Pitch [°] — 0 for horizontal members. */
  pitch: number;
  /** Id of the covering loading the member (roof) — for dead load. */
  covering?: string;
  /** true = deck/floor member (imposed load instead of snow). */
  imposed?: boolean;
  /** Support positions in plan [m] — to trace the load path (roof→beam→post). */
  supports?: Vec2[];
  /**
   * Indices of internally balanced supports (do not pass load on) — the ridge
   * of a couple roof: its vertical reaction balances the opposing rafter, so
   * all load flows to the eaves.
   */
  balanced?: number[];
}

/** Fields shared by every primitive. */
export interface BasePrimitive {
  /** Stable identifier — assigned when added in the editor. */
  id: string;
  /** Label shown on the plan and in lists, e.g. "Wall W-1". */
  label?: string;
  /** Timber species/grade id from the catalog. */
  species?: string;
}

export interface PostDef extends BasePrimitive {
  type: 'post';
  name?: string;
  /** Section centre in plan. */
  position: Vec2;
  /** [dimension along X, dimension along Y]. */
  section: Vec2;
  height: number;
  /** Base level (default 0). */
  z?: number;
}

export interface BeamDef extends BasePrimitive {
  type: 'beam';
  name?: string;
  from: Vec3;
  to: Vec3;
  section: Vec2;
}

/**
 * Knee brace stiffening the post-to-beam joint. Drawn in plan as a line from the
 * post towards the beam; in space it runs diagonally from a point on the post to
 * the underside of the beam.
 */
export interface BraceDef extends BasePrimitive {
  type: 'brace';
  /** Point at the post (plan). */
  from: Vec2;
  /** Point at the beam (plan) — also the direction and horizontal reach. */
  to: Vec2;
  /** Level at which the brace meets the beam. */
  topLevel: number;
  /** Drop down the post from `topLevel`. Default 0.6. */
  verticalArm?: number;
  /** Default [0.08, 0.12]. */
  section?: Vec2;
  /** A second brace on the opposite side of the post (typical for carports). */
  bothSides?: boolean;
}

export interface DeckDef extends BasePrimitive {
  type: 'deck';
  /** min-X / min-Y corner. */
  position: Vec2;
  size: Vec2;
  /** Top-of-boards level. */
  level: number;
  /** Joist axis (default 'y'); boards run perpendicular. */
  joistDirection?: 'x' | 'y';
  /** Nominal joist spacing (default 0.5). */
  joistSpacing?: number;
  /** Default [0.045, 0.145]. */
  joistSection?: Vec2;
  board?: { width?: number; thickness?: number; gap?: number };
  /** Decking board species (separate from joists). */
  boardSpecies?: string;
}

export type SlopeDirection = '+x' | '-x' | '+y' | '-y';

export interface MonoPitchRoofDef extends BasePrimitive {
  type: 'monoPitchRoof';
  /** Support-outline corner (plan, without eaves). */
  position: Vec2;
  size: Vec2;
  /** Pitch angle in degrees. */
  pitch: number;
  /** The side the slope falls towards (lower edge). */
  slopeDirection: SlopeDirection;
  /** Level of the rafter underside at the low edge of the outline. */
  z: number;
  /** Default 0.3. */
  eaves?: number;
  /** Eaves at the high edge — 0 for a roof abutting a wall. Default = `eaves`. */
  eavesHigh?: number;
  /** Default 0.6. */
  rafterSpacing?: number;
  /** Default [0.06, 0.16]. */
  rafterSection?: Vec2;
  /** Sheathing material id from the catalog. */
  sheathing?: string;
}

export interface GableRoofDef extends BasePrimitive {
  type: 'gableRoof';
  position: Vec2;
  size: Vec2;
  pitch: number;
  ridgeDirection: 'x' | 'y';
  /** Level of the rafter underside at the eave edges of the outline. */
  z: number;
  eaves?: number;
  rafterSpacing?: number;
  /** Default [0.06, 0.18]. */
  rafterSection?: Vec2;
  sheathing?: string;
  /** Ridge beam section, default [0.08, 0.18]. */
  ridgeSection?: Vec2;
}

export interface OpeningDef {
  type: 'window' | 'door';
  /** Distance of the opening start from the wall start (along from→to). */
  offset: number;
  width: number;
  height: number;
  /** Bottom-of-opening level above the wall base (door: 0, window default 0.9). */
  sill?: number;
}

export interface WallDef extends BasePrimitive {
  type: 'wall';
  /** Wall axis in plan. */
  from: Vec2;
  to: Vec2;
  /** Total height (with sill and top plate). */
  height: number;
  z?: number;
  /** [member thickness along the wall, wall depth] — default [0.06, 0.14]. */
  section?: Vec2;
  /** Default 0.6. */
  studSpacing?: number;
  openings?: OpeningDef[];
  /** Sheathing material id from the catalog (none = no sheathing). */
  sheathing?: string;
  /** Sheathing side relative to from→to: 1 = left (+90°), -1 = right. */
  sheathingSide?: 1 | -1;
}

export interface SlabDef extends BasePrimitive {
  type: 'slab';
  /** min-X / min-Y corner. */
  position: Vec2;
  size: Vec2;
  /** Slab thickness [m]. */
  thickness: number;
  /** Top-of-slab level [m] (default 0). */
  z?: number;
  /** Concrete class id from the catalog. */
  concreteClass?: string;
}

export type PrimitiveDef =
  | PostDef
  | BeamDef
  | BraceDef
  | DeckDef
  | MonoPitchRoofDef
  | GableRoofDef
  | WallDef
  | SlabDef;

export type PrimitiveType = PrimitiveDef['type'];

export interface Project {
  id: string;
  name: string;
  description?: string;
  primitives: PrimitiveDef[];
}
