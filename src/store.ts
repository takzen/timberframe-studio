import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from './i18n';
import { newPrimitive, typeInfo } from './model/defaults';
import { moveBy } from './plan/editing';
import type { FoundationSettings } from './model/foundations/types';
import type { PriceOverrides } from './model/pricing';
import { findSnowZone } from './model/structural/loads';
import { findWindZone } from './model/structural/wind';
import type { ServiceClass, StructuralSettings } from './model/structural/types';
import type { Group, PrimitiveDef, PrimitiveType, Vec2 } from './model/types';

export type ViewMode = 'full' | 'frame';
export type Tool = 'select' | PrimitiveType;

/** Default structural settings — also used to backfill older persisted state. */
const DEFAULT_STRUCTURAL: StructuralSettings = {
  snowZone: 2,
  snowSk: 0.9,
  serviceClass: 2,
  imposedLoad: 2.0,
  windZone: 1,
  windVb0: 22,
  terrain: 2,
  openStructure: false,
};

export const GROUPS: { id: Group; labelKey: string }[] = [
  { id: 'posts', labelKey: 'group.posts' },
  { id: 'beams', labelKey: 'group.beams' },
  { id: 'decks', labelKey: 'group.decks' },
  { id: 'walls', labelKey: 'group.walls' },
  { id: 'roofs', labelKey: 'group.roofs' },
  { id: 'foundations', labelKey: 'group.foundations' },
];

const MAX_HISTORY = 60;
/** Plan-metres a pasted copy is shifted from its source so it is grabbable. */
const PASTE_OFFSET = 0.3;
const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

interface State {
  language: Language;
  name: string;
  primitives: PrimitiveDef[];
  selected: string | null;
  tool: Tool;
  /** Work level — base for new beams and roofs. */
  workLevel: number;
  /** Snap step on the plan, in metres. */
  gridStep: number;
  viewMode: ViewMode;
  visibleGroups: Record<Group, boolean>;
  showGrid: boolean;
  /** Colours over-utilised members on the plan and in 3D. */
  showUtilisation: boolean;
  structural: StructuralSettings;
  foundations: FoundationSettings;
  /** Price overrides by catalog id — empty = all catalog defaults. */
  prices: PriceOverrides;

  history: PrimitiveDef[][];
  historyIndex: number;
  /** Copied primitive awaiting paste — ephemeral, not persisted. */
  clipboard: PrimitiveDef | null;

  add: (type: PrimitiveType, a: Vec2, b: Vec2) => void;
  /** Copies the selected primitive to the clipboard. */
  copy: () => void;
  /** Pastes the clipboard as a new primitive, offset and selected. */
  paste: () => void;
  update: (id: string, changes: Partial<PrimitiveDef>) => void;
  /** Live preview of a change during dragging — does not clutter the history. */
  updateLive: (id: string, changes: Partial<PrimitiveDef>) => void;
  /** Closes a drag with a single history entry. */
  commit: () => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  setTool: (t: Tool) => void;
  setWorkLevel: (z: number) => void;
  setGridStep: (s: number) => void;
  setViewMode: (m: ViewMode) => void;
  toggleGroup: (g: Group) => void;
  toggleGrid: () => void;
  toggleUtilisation: () => void;
  setSnowZone: (zone: number) => void;
  setSnowSk: (sk: number) => void;
  setServiceClass: (c: ServiceClass) => void;
  setImposedLoad: (q: number) => void;
  setWindZone: (zone: number) => void;
  setWindVb0: (v: number) => void;
  setTerrain: (t: 0 | 1 | 2 | 3 | 4) => void;
  setOpenStructure: (open: boolean) => void;
  setPrice: (id: string, value: number) => void;
  resetPrice: (id: string) => void;
  resetPrices: () => void;
  setFoundations: (changes: Partial<FoundationSettings>) => void;
  setLanguage: (lang: Language) => void;
  undo: () => void;
  redo: () => void;
  load: (name: string, primitives: PrimitiveDef[]) => void;
  setName: (name: string) => void;
  reset: () => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Saves a new primitives state together with a history entry. */
      const withHistory = (primitives: PrimitiveDef[], rest: Partial<State> = {}) => {
        const { history, historyIndex } = get();
        const trimmed = history.slice(0, historyIndex + 1);
        trimmed.push(primitives);
        const overflow = Math.max(0, trimmed.length - MAX_HISTORY);
        set({
          primitives,
          history: trimmed.slice(overflow),
          historyIndex: trimmed.length - overflow - 1,
          ...rest,
        });
      };

      return {
        language: 'pl',
        // empty = default; the toolbar shows the translated "New project"
        name: '',
        primitives: [],
        selected: null,
        tool: 'select',
        workLevel: 2.6,
        gridStep: 0.1,
        viewMode: 'full',
        visibleGroups: {
          posts: true,
          beams: true,
          decks: true,
          roofs: true,
          walls: true,
          foundations: true,
        },
        showGrid: true,
        showUtilisation: true,
        structural: { ...DEFAULT_STRUCTURAL },
        foundations: {
          soilBearing: 150,
          concreteClass: 'c16-20',
          frostDepth: 1.0,
          minFooting: 0.4,
          footingThickness: 0.4,
        },
        prices: {},
        clipboard: null,
        history: [[]],
        historyIndex: 0,

        add: (type, a, b) => {
          const { primitives, workLevel } = get();
          const { prefix } = typeInfo(type);
          const used = primitives.filter((p) => typeInfo(p.type).prefix === prefix).length;
          const id = newId();
          const def = newPrimitive(type, id, `${prefix}-${used + 1}`, a, b, workLevel);
          withHistory([...primitives, def], { selected: id, tool: 'select' });
        },

        copy: () => {
          const { selected, primitives } = get();
          const def = primitives.find((p) => p.id === selected);
          if (def) set({ clipboard: structuredClone(def) });
        },

        paste: () => {
          const { clipboard, primitives } = get();
          if (!clipboard) return;
          const { prefix } = typeInfo(clipboard.type);
          const used = primitives.filter((p) => typeInfo(p.type).prefix === prefix).length;
          const id = newId();
          // offset so the copy lands beside the original, not on top of it; the
          // clipboard advances to the pasted copy so repeated pastes cascade
          const def = {
            ...structuredClone(clipboard),
            ...moveBy(clipboard, PASTE_OFFSET, PASTE_OFFSET),
            id,
            label: `${prefix}-${used + 1}`,
          } as PrimitiveDef;
          // clipboard is an independent deep copy, never the stored object, so a
          // later edit to the pasted primitive can't drift the clipboard
          withHistory([...primitives, def], {
            selected: id,
            tool: 'select',
            clipboard: structuredClone(def),
          });
        },

        update: (id, changes) => {
          const primitives = get().primitives.map((p) =>
            p.id === id ? ({ ...p, ...changes } as PrimitiveDef) : p,
          );
          withHistory(primitives);
        },

        updateLive: (id, changes) =>
          set({
            primitives: get().primitives.map((p) =>
              p.id === id ? ({ ...p, ...changes } as PrimitiveDef) : p,
            ),
          }),

        commit: () => {
          const { primitives, history, historyIndex } = get();
          if (history[historyIndex] === primitives) return;
          withHistory(primitives);
        },

        remove: (id) => {
          withHistory(
            get().primitives.filter((p) => p.id !== id),
            { selected: null },
          );
        },

        select: (selected) => set({ selected }),
        setTool: (tool) => set({ tool, selected: tool === 'select' ? get().selected : null }),
        setWorkLevel: (workLevel) => set({ workLevel }),
        setGridStep: (gridStep) => set({ gridStep }),
        setViewMode: (viewMode) => set({ viewMode }),
        toggleGroup: (g) =>
          set((s) => ({ visibleGroups: { ...s.visibleGroups, [g]: !s.visibleGroups[g] } })),
        toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
        toggleUtilisation: () => set((s) => ({ showUtilisation: !s.showUtilisation })),
        setSnowZone: (zone) =>
          set((s) => ({
            structural: { ...s.structural, snowZone: zone, snowSk: findSnowZone(zone).sk },
          })),
        setSnowSk: (snowSk) => set((s) => ({ structural: { ...s.structural, snowSk } })),
        setServiceClass: (serviceClass) =>
          set((s) => ({ structural: { ...s.structural, serviceClass } })),
        setImposedLoad: (imposedLoad) =>
          set((s) => ({ structural: { ...s.structural, imposedLoad } })),
        setWindZone: (zone) =>
          set((s) => ({
            structural: { ...s.structural, windZone: zone, windVb0: findWindZone(zone).vb0 },
          })),
        setWindVb0: (windVb0) => set((s) => ({ structural: { ...s.structural, windVb0 } })),
        setTerrain: (terrain) => set((s) => ({ structural: { ...s.structural, terrain } })),
        setOpenStructure: (openStructure) =>
          set((s) => ({ structural: { ...s.structural, openStructure } })),
        setPrice: (id, value) => set((s) => ({ prices: { ...s.prices, [id]: value } })),
        resetPrice: (id) =>
          set((s) => {
            const { [id]: _, ...rest } = s.prices;
            return { prices: rest };
          }),
        resetPrices: () => set({ prices: {} }),
        setFoundations: (changes) =>
          set((s) => ({ foundations: { ...s.foundations, ...changes } })),
        setLanguage: (language) => set({ language }),

        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex <= 0) return;
          set({ historyIndex: historyIndex - 1, primitives: history[historyIndex - 1], selected: null });
        },
        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex >= history.length - 1) return;
          set({ historyIndex: historyIndex + 1, primitives: history[historyIndex + 1], selected: null });
        },

        load: (name, primitives) => {
          set({ name, selected: null, tool: 'select', clipboard: null, history: [[]], historyIndex: 0 });
          withHistory(primitives);
        },
        setName: (name) => set({ name }),
        reset: () => {
          set({ name: '', selected: null, tool: 'select', clipboard: null, history: [[]], historyIndex: 0 });
          withHistory([]);
        },
      };
    },
    {
      name: 'timberframe-studio-v2',
      partialize: (s) => ({
        language: s.language,
        name: s.name,
        primitives: s.primitives,
        workLevel: s.workLevel,
        gridStep: s.gridStep,
        viewMode: s.viewMode,
        visibleGroups: s.visibleGroups,
        showGrid: s.showGrid,
        showUtilisation: s.showUtilisation,
        structural: s.structural,
        foundations: s.foundations,
        prices: s.prices,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // backfill settings added after this state was saved (e.g. wind), so an
          // older localStorage doesn't leave new fields undefined → NaN
          state.structural = { ...DEFAULT_STRUCTURAL, ...state.structural };
          state.prices = state.prices ?? {};
          // history starts from the loaded project, not from empty
          state.history = [state.primitives];
          state.historyIndex = 0;
        }
      },
    },
  ),
);
