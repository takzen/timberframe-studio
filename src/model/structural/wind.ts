// Wind actions per EN 1991-1-4 (Polish national annex), indicative.
//
// Scope of this pass: net wind uplift on the roof and the resulting hold-down
// (net tension) at the posts, which is what governs light open structures such
// as carports. It does NOT cover wind pressure on walls, reversed bending of
// rafters/beams under suction, torsion, or the local (cladding) peak pressures —
// those are for the phase that follows. See the disclaimer.

import type { StructuralSettings } from './types';

const RHO_AIR = 1.25; // air density [kg/m³]

export interface WindZone {
  zone: number;
  /** Fundamental basic wind velocity v_b,0 [m/s]. */
  vb0: number;
  labelKey: string;
  vb0Label: string;
}

/**
 * Wind zones of Poland per EN 1991-1-4 national annex. Zone 3 (mountains) is
 * altitude-dependent; the value here is its sea-level base, meant to be edited
 * up for the actual altitude — like snow zone 5.
 */
export const WIND_ZONES: WindZone[] = [
  { zone: 1, vb0: 22, labelKey: 'windZone1', vb0Label: '22' },
  { zone: 2, vb0: 26, labelKey: 'windZone2', vb0Label: '26' },
  { zone: 3, vb0: 22, labelKey: 'windZone3', vb0Label: '22' },
];

export const findWindZone = (n: number): WindZone =>
  WIND_ZONES.find((w) => w.zone === n) ?? WIND_ZONES[0];

export type TerrainCategory = 0 | 1 | 2 | 3 | 4;

/** Roughness length z₀ [m] per terrain category (Table 4.1). */
const Z0: Record<TerrainCategory, number> = { 0: 0.003, 1: 0.01, 2: 0.05, 3: 0.3, 4: 1.0 };
/** Minimum height z_min [m] per terrain category (Table 4.1). */
const ZMIN: Record<TerrainCategory, number> = { 0: 1, 1: 1, 2: 2, 3: 5, 4: 10 };
const Z0_II = 0.05;

/**
 * Peak velocity pressure q_p(z) [kN/m²] on flat terrain (§4.5), from the mean
 * wind and the turbulence intensity: q_p = (1 + 7·I_v)·½·ρ·v_m². Orography
 * c_o = 1, direction and season factors = 1.
 */
export function peakVelocityPressure(vb0: number, terrain: TerrainCategory, z: number): number {
  const z0 = Z0[terrain];
  const zUse = Math.max(z, ZMIN[terrain]);
  const kr = 0.19 * (z0 / Z0_II) ** 0.07;
  const cr = kr * Math.log(zUse / z0); // roughness factor
  const vm = cr * vb0; // mean wind velocity [m/s]
  const iv = 1 / Math.log(zUse / z0); // turbulence intensity (k_l = 1)
  const qpPa = (1 + 7 * iv) * 0.5 * RHO_AIR * vm * vm;
  return qpPa / 1000; // Pa → kN/m²
}

/**
 * Overall (whole-roof resultant) uplift pressure coefficient used for anchorage —
 * the average suction that lifts the roof, not the local cladding peak.
 *
 * Open canopy (carport): order of the net force coefficient of §7.3. Enclosed
 * roof: mean external suction combined with an adverse internal pressure
 * (c_pi = +0.2). Both ease off as the pitch steepens and the windward slope
 * turns from suction to pressure. Indicative figures — see the disclaimer.
 */
export function upliftCoefficient(openStructure: boolean, pitchDeg: number): number {
  const base = openStructure ? 1.3 : 0.9;
  if (pitchDeg <= 15) return base;
  if (pitchDeg >= 45) return base * 0.5;
  return base * (1 - 0.5 * ((pitchDeg - 15) / 30)); // linear taper 15°→45°
}

/** Net upward wind pressure on the roof w_k [kN/m²] for the given settings and height. */
export function roofUpliftPressure(s: StructuralSettings, pitchDeg: number, z: number): number {
  const qp = peakVelocityPressure(s.windVb0, s.terrain, z);
  return qp * upliftCoefficient(s.openStructure, pitchDeg);
}

/**
 * Indicative design tension a single standard adjustable post base with one M12
 * anchor into ≥C20/25 can be relied on for [kN]. A nominal figure for flagging —
 * heavier hold-downs and multiple anchors carry far more. The panel shows the
 * actual uplift in kN alongside, so the number that matters is visible.
 */
export const HOLD_DOWN_CAPACITY = 5.0;
