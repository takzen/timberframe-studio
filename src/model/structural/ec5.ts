// Factors and resistances per EN 1995-1-1 (Eurocode 5).

import type { MechProps } from '../catalog';
import type { LoadDuration, ServiceClass } from './types';

/**
 * k_mod — Table 3.1, solid and glued laminated timber.
 * Row = service class (1/2/3), column = load duration.
 */
const KMOD: Record<ServiceClass, Record<LoadDuration, number>> = {
  1: { permanent: 0.6, longTerm: 0.7, medium: 0.8, shortTerm: 0.9, instantaneous: 1.1 },
  2: { permanent: 0.6, longTerm: 0.7, medium: 0.8, shortTerm: 0.9, instantaneous: 1.1 },
  3: { permanent: 0.5, longTerm: 0.55, medium: 0.65, shortTerm: 0.7, instantaneous: 0.9 },
};

/** k_def — Table 3.2, solid and glulam. */
const KDEF: Record<ServiceClass, number> = { 1: 0.6, 2: 0.8, 3: 2.0 };

export const kmod = (cls: ServiceClass, duration: LoadDuration): number => KMOD[cls][duration];
export const kdef = (cls: ServiceClass): number => KDEF[cls];

/** Partial material factor γ_M (2.4.1). */
export const gammaM = (mech: MechProps): number => (mech.glulam ? 1.25 : 1.3);

/**
 * k_h — member depth factor (3.2 / 3.3). Raises f_m,k and f_t for members
 * shallower than the reference (150 mm solid, 600 mm glulam).
 */
export function kh(mech: MechProps, heightMm: number): number {
  if (mech.glulam) return Math.min((600 / heightMm) ** 0.1, 1.1);
  return Math.min((150 / heightMm) ** 0.2, 1.3);
}

/** k_cr — shear width reduction for cracking (6.1.7 + NA). */
export const KCR = 0.67;

/**
 * ψ₂ — quasi-permanent combination factor (EN 1990, national annex).
 * Snow up to 1000 m a.s.l. = 0; imposed cat. A = 0.3.
 */
export const psi2 = (imposed: boolean): number => (imposed ? 0.3 : 0);
