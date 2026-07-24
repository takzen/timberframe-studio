// Checks for simply-supported bending members and posts per EN 1995-1-1.
// Rafters and joists as single-span beams, uniform load; posts in compression.

import { findSpecies } from '../catalog';
import type { MechProps } from '../catalog';
import type { Element } from '../types';
import { gammaM, kdef, kh, kmod, KCR, psi2 } from './ec5';
import type { Check, LoadNote, MemberResult, Status, StructuralSettings } from './types';

// beam deflection limits (EC5 recommendations / PL practice)
const LIMIT_INST = 300; // w_inst ≤ L/300
const LIMIT_FIN = 250; // w_fin ≤ L/250

const status = (u: number): Status => (u > 1 ? 'over' : u > 0.9 ? 'warn' : 'ok');
export const statusOf = status;

export interface BendingInput {
  /** Span [m]. */
  L: number;
  /** Permanent load g_k [kN/m]. */
  gk: number;
  /** Variable load q_k [kN/m]. */
  qk: number;
  /** Section width b [m]. */
  b: number;
  /** Section height h [m]. */
  h: number;
  mech: MechProps;
  cls: StructuralSettings['serviceClass'];
}

/** Returns the checks (bending, shear, deflections) for a simply-supported beam. */
export function checkBending(w: BendingInput): Check[] {
  const { L, gk, qk, b, h, mech, cls } = w;
  const hMm = h * 1000;

  // ULS — combination 1.35·G + 1.5·Q; variable action = medium-term (snow/imposed PL)
  const qd = 1.35 * gk + 1.5 * qk; // kN/m
  const Md = (qd * L * L) / 8; // kNm
  const Vd = (qd * L) / 2; // kN

  const W = (b * h * h) / 6; // m³
  const A = b * h; // m²
  const km = kmod(cls, 'medium');
  const gM = gammaM(mech);

  // stresses in kPa (kN/m²); strengths MPa → ×1000 kPa
  const sigmaM = Md / W;
  const fmD = (kh(mech, hMm) * km * mech.fmk * 1000) / gM;
  const tauD = (1.5 * Vd) / (KCR * A);
  const fvD = (km * mech.fvk * 1000) / gM;

  // SLS — deflections; E in kN/m² (MPa × 1000)
  const I = (b * h * h * h) / 12; // m⁴
  const E = mech.E0mean * 1000;
  const wG = (5 * gk * L ** 4) / (384 * E * I);
  const wQ = (5 * qk * L ** 4) / (384 * E * I);
  const wInst = wG + wQ;
  const wFin = wG * (1 + kdef(cls)) + wQ * (1 + psi2(false) * kdef(cls));

  return [
    { nameKey: 'check.bending', utilisation: sigmaM / fmD },
    { nameKey: 'check.shear', utilisation: tauD / fvD },
    { nameKey: 'check.deflectionInst', utilisation: wInst / (L / LIMIT_INST) },
    { nameKey: 'check.deflectionFin', utilisation: wFin / (L / LIMIT_FIN) },
  ];
}

export interface UpliftBendingInput {
  /** Span [m]. */
  L: number;
  /** Permanent dead line load g_k [kN/m]. */
  gk: number;
  /** Characteristic wind uplift line load w_k [kN/m] (upward). */
  wk: number;
  b: number;
  h: number;
  mech: MechProps;
  cls: StructuralSettings['serviceClass'];
}

/**
 * Reversed bending under net wind uplift: 1.0·G (favourable) − 1.5·W. A member
 * only bends the other way once the uplift overcomes its dead load; wind is a
 * short-term action, so k_mod is higher than for snow. Returns a check only when
 * there is net uplift — otherwise the gravity bending already governs and this
 * would just read near zero.
 */
export function checkWindUpliftBending(w: UpliftBendingInput): Check[] {
  const { L, gk, wk, b, h, mech, cls } = w;
  const qNet = 1.5 * wk - 1.0 * gk; // kN/m upward; ≤ 0 means the dead load holds it down
  if (qNet <= 0) return [];
  const Md = (qNet * L * L) / 8; // kNm
  const W = (b * h * h) / 6; // m³
  const sigmaM = Md / W; // kPa
  const fmD = (kh(mech, h * 1000) * kmod(cls, 'shortTerm') * mech.fmk * 1000) / gammaM(mech);
  return [{ nameKey: 'check.windBending', utilisation: sigmaM / fmD }];
}

export interface CompressionInput {
  /** Axial permanent N_g [kN] and variable N_q [kN]. */
  Ng: number;
  Nq: number;
  /** Section dimensions [m]. */
  b: number;
  h: number;
  /** Buckling length [m] (β=1 — post held at the top by the roof). */
  L: number;
  mech: MechProps;
  cls: StructuralSettings['serviceClass'];
}

/**
 * Axial compression with buckling per EN 1995-1-1 §6.3.2. The smaller inertia
 * (smaller section dimension) governs. β=1 — post pinned at both ends (held at
 * the top by the roof structure).
 */
export function checkCompression(w: CompressionInput): Check[] {
  const { Ng, Nq, b, h, L, mech, cls } = w;
  const Nd = 1.35 * Ng + 1.5 * Nq; // kN
  const A = b * h; // m²
  const iMin = Math.min(b, h) / Math.sqrt(12); // radius of gyration [m]
  const lambda = L / iMin;
  const lambdaRel = (lambda / Math.PI) * Math.sqrt((mech.fc0k * 1000) / (mech.E005 * 1000));

  const betaC = mech.glulam ? 0.1 : 0.2;
  let kc = 1;
  if (lambdaRel > 0.3) {
    const k = 0.5 * (1 + betaC * (lambdaRel - 0.3) + lambdaRel * lambdaRel);
    kc = 1 / (k + Math.sqrt(k * k - lambdaRel * lambdaRel));
  }

  const sigmaC = Nd / A; // kPa
  const fcD = (kmod(cls, 'medium') * mech.fc0k * 1000) / gammaM(mech);
  return [{ nameKey: 'check.buckling', utilisation: sigmaC / (kc * fcD) }];
}

const mm = (m: number) => Math.round(m * 1000);

/** Builds a single-element result (pcs = 1) from a list of checks. */
export function buildResult(
  el: Element,
  checks: Check[],
  span: number,
  load: LoadNote,
): MemberResult {
  const worst = checks.length
    ? checks.reduce((a, b) => (b.utilisation > a.utilisation ? b : a))
    : { nameKey: '—', utilisation: 0 };
  const sectionMm = `${mm(el.section[0])}×${mm(el.section[1])}`;
  return {
    id: el.id,
    name: el.name,
    sectionMm,
    grade: findSpecies(el.species).mech.grade,
    span,
    pcs: 1,
    checks,
    maxUtilisation: worst.utilisation,
    governing: worst.nameKey,
    status: status(worst.utilisation),
    load,
  };
}
