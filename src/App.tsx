import { useMemo } from 'react';
import { analyseFoundations } from './model/foundations/foundations';
import { generateElements } from './model/generate';
import { analyseRaw, elementStatuses, grouped, primitiveStatuses } from './model/structural/analysis';
import { Plan } from './plan/Plan';
import { Scene } from './scene/Scene';
import { SidePanel } from './ui/SidePanel';
import { Toolbar } from './ui/Toolbar';
import { useStore } from './store';
import { useT } from './useT';
import './App.css';

export default function App() {
  const t = useT();
  const primitives = useStore((s) => s.primitives);
  const viewMode = useStore((s) => s.viewMode);
  const visibleGroups = useStore((s) => s.visibleGroups);
  const structural = useStore((s) => s.structural);
  const foundationSettings = useStore((s) => s.foundations);
  const prices = useStore((s) => s.prices);
  const showUtilisation = useStore((s) => s.showUtilisation);

  const all = useMemo(() => generateElements(primitives), [primitives]);

  // structural analysis computed once: table + status maps for colouring
  const raw = useMemo(() => analyseRaw(all, structural), [all, structural]);
  const results = useMemo(() => grouped(raw), [raw]);

  // foundation design: footings under posts (from axial forces) + slab checks
  const foundations = useMemo(
    () => analyseFoundations(primitives, all, structural, foundationSettings, prices),
    [primitives, all, structural, foundationSettings, prices],
  );

  // full mesh set = structure + generated footing blocks
  const withFootings = useMemo(() => [...all, ...foundations.footingElements], [all, foundations]);
  const visible = useMemo(
    () =>
      withFootings.filter(
        (el) => visibleGroups[el.group] && (viewMode === 'full' || el.category !== 'sheathing'),
      ),
    [withFootings, visibleGroups, viewMode],
  );

  const byElement = useMemo(() => {
    const m = elementStatuses(raw);
    for (const s of foundations.footings) m.set(`footing-${s.postId}`, s.status);
    for (const s of foundations.slabs) m.set(`${s.primitiveId}-0`, s.status);
    return m;
  }, [raw, foundations]);
  const byPrimitive = useMemo(() => primitiveStatuses(all, byElement), [all, byElement]);

  return (
    <div className="layout">
      <Toolbar />
      <main className="workspace">
        <section className="plan-pane">
          <h3>{t('plan.title')}</h3>
          <Plan
            util={showUtilisation ? byPrimitive : null}
            footings={visibleGroups.foundations ? foundations.footings : []}
          />
        </section>
        <section className="scene-pane">
          <h3>{t('scene.title')}</h3>
          <div className="canvas-wrap">
            <Scene elements={visible} util={showUtilisation ? byElement : null} />
          </div>
        </section>
      </main>
      <SidePanel elements={visible} results={results} foundations={foundations} />
    </div>
  );
}
