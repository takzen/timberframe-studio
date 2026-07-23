import { findFastener, name } from '../model/catalog';
import type { FoundationAnalysis } from '../model/foundations/types';
import type { MemberResult } from '../model/structural/types';
import type { Element } from '../model/types';
import { bill, exportCSV, toCSV } from '../model/materials';
import { GROUPS, useStore } from '../store';
import { useT } from '../useT';
import { AnalysisPanel } from './AnalysisPanel';
import { FoundationsPanel } from './FoundationsPanel';
import { MaterialsTable } from './MaterialsTable';
import { PropertiesPanel } from './PropertiesPanel';

export function SidePanel({
  elements,
  results,
  foundations,
}: {
  elements: Element[];
  results: MemberResult[];
  foundations: FoundationAnalysis;
}) {
  const t = useT();
  const lang = useStore((s) => s.language);
  const projectName = useStore((s) => s.name);
  const viewMode = useStore((s) => s.viewMode);
  const visibleGroups = useStore((s) => s.visibleGroups);
  const showGrid = useStore((s) => s.showGrid);
  const setViewMode = useStore((s) => s.setViewMode);
  const toggleGroup = useStore((s) => s.toggleGroup);
  const toggleGrid = useStore((s) => s.toggleGrid);

  const b = bill(elements);

  const exportBill = () => {
    const csv = toCSV(
      b,
      (id) => name(findFastener(id)!.name, lang),
      (k) => t(`member.${k}`),
    );
    exportCSV(csv, `${projectName.replace(/[^\w\-]+/g, '_')}-bill.csv`);
  };

  return (
    <aside className="side-panel">
      <PropertiesPanel />

      <section>
        <h2>{t('view.title')}</h2>
        <div className="toggle">
          <button className={viewMode === 'full' ? 'active' : ''} onClick={() => setViewMode('full')}>{t('view.full')}</button>
          <button className={viewMode === 'frame' ? 'active' : ''} onClick={() => setViewMode('frame')}>{t('view.frameOnly')}</button>
        </div>
        <label className="check">
          <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
          {t('view.grid')}
        </label>
        {GROUPS.map((g) => (
          <label key={g.id} className="check">
            <input type="checkbox" checked={visibleGroups[g.id]} onChange={() => toggleGroup(g.id)} />
            {t(g.labelKey)}
          </label>
        ))}
      </section>

      {results.length > 0 && <AnalysisPanel results={results} />}

      {(foundations.footings.length > 0 || foundations.slabs.length > 0) && (
        <FoundationsPanel analysis={foundations} />
      )}

      <section className="stretch">
        <h2>
          {t('bom.title')}
          <button className="mini" onClick={exportBill}>CSV</button>
        </h2>
        {elements.length === 0 ? (
          <p className="hint">{t('bom.emptyHint')}</p>
        ) : (
          <>
            <p className="hint">{t('bom.visible', { n: elements.length })}</p>
            <MaterialsTable b={b} />
          </>
        )}
      </section>
    </aside>
  );
}
