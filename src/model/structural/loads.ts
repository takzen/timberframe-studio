// Loads per EN 1991 (self-weight, snow, imposed).

import { findSheathing, findSpecies } from '../catalog';
import type { Element } from '../types';
import type { LoadNote, StructuralSettings } from './types';

const G = 9.81; // gravitational acceleration [m/s²]

export interface SnowZone {
  zone: number;
  /** Characteristic s_k [kN/m²]. Zone 5 depends on altitude — indicative value. */
  sk: number;
  labelKey: string;
  skLabel: string;
}

/** Snow zones of Poland per EN 1991-1-3, national annex. */
export const SNOW_ZONES: SnowZone[] = [
  { zone: 1, sk: 0.7, labelKey: 'zone1', skLabel: '0,70' },
  { zone: 2, sk: 0.9, labelKey: 'zone2', skLabel: '0,90' },
  { zone: 3, sk: 1.2, labelKey: 'zone3', skLabel: '1,20' },
  { zone: 4, sk: 1.6, labelKey: 'zone4', skLabel: '1,60' },
  { zone: 5, sk: 2.0, labelKey: 'zone5', skLabel: '2,00' },
];

export const findSnowZone = (n: number): SnowZone =>
  SNOW_ZONES.find((s) => s.zone === n) ?? SNOW_ZONES[0];

/** Roof shape coefficient μ₁ (5.3.2), undrifted case: 0.8 to 30°, linear to 0 at 60°. */
export function mu1(pitchDeg: number): number {
  if (pitchDeg <= 30) return 0.8;
  if (pitchDeg >= 60) return 0;
  return 0.8 * ((60 - pitchDeg) / 30);
}

/** Roof snow load s = μ₁·Cₑ·Cₜ·sₖ [kN/m²] (Cₑ=Cₜ=1). */
export const roofSnow = (sk: number, pitchDeg: number): number => mu1(pitchDeg) * sk;

/** Self-weight line load of a timber member [kN/m] along its axis. */
export function selfWeightLine(el: Element): number {
  const rho = findSpecies(el.species).mech.densityMean;
  const area = el.section[0] * el.section[1]; // m²
  return (rho * G * area) / 1000; // kg·m/s² → N → kN
}

/** Covering weight per m² of slope [kN/m²]. */
export function coveringWeight(sheathingId?: string): number {
  if (!sheathingId) return 0;
  return (findSheathing(sheathingId).weight * G) / 1000;
}

export interface LineLoad {
  /** Permanent (self-weight + covering) g_k [kN/m]. */
  gk: number;
  /** Variable (snow or imposed) q_k [kN/m]. */
  qk: number;
  /** Span [m] (for rafters — along the slope). */
  span: number;
  /** true = imposed load (different ψ₂). */
  imposed: boolean;
  note: LoadNote;
}

/**
 * Assembles the line load acting on a single bending member.
 *
 * Sloped rafter: strong-axis moment ≈ (g+s)·a_h·L_h²/8, where a_h is the
 * horizontal spacing; cosα cancels between the perpendicular component and the
 * slope length. The rafter self-weight acts along the slope, so per horizontal
 * metre it is /cosα. Deflection span is taken along the slope (`span` from the
 * generator is already the slope length).
 */
export function memberLoad(el: Element, s: StructuralSettings): LineLoad | null {
  const st = el.structural;
  if (!st) return null;

  const cosA = Math.cos((st.pitch * Math.PI) / 180) || 1;
  const a = st.tributaryWidth;

  const grade = findSpecies(el.species).mech.grade;
  const gSelf = selfWeightLine(el);
  const gCovering = coveringWeight(st.covering) * a;
  const gk = gSelf + gCovering;

  let qk: number;
  let note: LoadNote;
  if (st.imposed) {
    qk = s.imposedLoad * a;
    note = { kind: 'imposed', q: s.imposedLoad, grade };
  } else {
    const snow = roofSnow(s.snowSk, st.pitch);
    qk = snow * a * cosA;
    note = { kind: 'snow', zone: s.snowZone, grade };
  }

  return { gk, qk, span: st.span, imposed: Boolean(st.imposed), note };
}
