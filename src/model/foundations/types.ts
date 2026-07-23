// Indicative foundation design: post footings and a foundation slab.
// Criterion: soil pressure ≤ soil bearing. No EC7/EC2 (reinforcement, punching).

import type { Status } from '../structural/types';
import type { Element, Vec2 } from '../types';

export interface FoundationSettings {
  /** Allowable soil bearing (pressure) [kPa]. */
  soilBearing: number;
  /** Concrete class id from the catalog. */
  concreteClass: string;
  /** Founding (frost) depth [m]. */
  frostDepth: number;
  /** Minimum footing side [m]. */
  minFooting: number;
  /** Footing block thickness [m]. */
  footingThickness: number;
}

export interface FootingResult {
  postId: string;
  point: Vec2;
  /** Side of the square footing [m]. */
  side: number;
  thickness: number;
  /** Design axial force [kN]. */
  Nd: number;
  /** Soil pressure [kPa]. */
  pressure: number;
  utilisation: number;
  status: Status;
  volume: number;
  cost: number;
}

export interface SlabResult {
  primitiveId: string;
  area: number;
  thickness: number;
  volume: number;
  pressure: number;
  utilisation: number;
  status: Status;
  cost: number;
}

export interface FoundationAnalysis {
  footings: FootingResult[];
  slabs: SlabResult[];
  /** Footing blocks to render (slabs come from primitives). */
  footingElements: Element[];
  concreteVolume: number;
  cost: number;
}
