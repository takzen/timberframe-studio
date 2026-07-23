// Structural layer types. Indicative check per EN 1995-1-1.

export type ServiceClass = 1 | 2 | 3;

/** Load duration — drives k_mod and k_def. */
export type LoadDuration = 'permanent' | 'longTerm' | 'medium' | 'shortTerm' | 'instantaneous';

export interface StructuralSettings {
  /** Snow zone (PL) 1–5. */
  snowZone: number;
  /** Characteristic ground snow load s_k [kN/m²]. */
  snowSk: number;
  /** Service class of the structure (environment moisture). */
  serviceClass: ServiceClass;
  /** Imposed load on floors/decks q_k [kN/m²]. */
  imposedLoad: number;
}

export type Status = 'ok' | 'warn' | 'over';

/** A single check (utilisation = effect / resistance). */
export interface Check {
  /** i18n key (`check.*`). */
  nameKey: string;
  utilisation: number;
}

/** Structured load note, formatted for display by the UI. */
export interface LoadNote {
  kind: 'snow' | 'imposed' | 'beam' | 'axial';
  zone?: number;
  q?: number;
  Nd?: number;
  /** Strength grade, e.g. "C24" (language-neutral). */
  grade: string;
}

export interface MemberResult {
  /** Element id (before grouping) — for colouring plan and 3D. */
  id?: string;
  /** Member-name key. */
  name: string;
  sectionMm: string;
  grade: string;
  span: number;
  /** Number of members of this kind (the worst case represents the group). */
  pcs: number;
  checks: Check[];
  /** Largest utilisation across all checks. */
  maxUtilisation: number;
  /** i18n key of the governing check. */
  governing: string;
  status: Status;
  load: LoadNote;
}
