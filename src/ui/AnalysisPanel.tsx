import { SNOW_ZONES } from '../model/structural/loads';
import type { LoadNote, MemberResult, Status } from '../model/structural/types';
import { WIND_ZONES } from '../model/structural/wind';
import { useStore } from '../store';
import { useT } from '../useT';
import { NumberField, SelectField } from './fields';

const DOT: Record<Status, string> = { ok: '#5fbf6a', warn: '#e0b04a', over: '#e0645a' };

export function AnalysisPanel({ results }: { results: MemberResult[] }) {
  const t = useT();
  const s = useStore((st) => st.structural);
  const showUtilisation = useStore((st) => st.showUtilisation);
  const setSnowZone = useStore((st) => st.setSnowZone);
  const setSnowSk = useStore((st) => st.setSnowSk);
  const setServiceClass = useStore((st) => st.setServiceClass);
  const setImposedLoad = useStore((st) => st.setImposedLoad);
  const setWindZone = useStore((st) => st.setWindZone);
  const setWindVb0 = useStore((st) => st.setWindVb0);
  const setTerrain = useStore((st) => st.setTerrain);
  const setOpenStructure = useStore((st) => st.setOpenStructure);
  const toggleUtilisation = useStore((st) => st.toggleUtilisation);

  const loadText = (l: LoadNote) => {
    const head =
      l.kind === 'snow'
        ? t('load.snow', { zone: l.zone ?? 0 })
        : l.kind === 'imposed'
          ? t('load.imposed', { q: (l.q ?? 0).toFixed(1) })
          : l.kind === 'beam'
            ? t('load.beam')
            : l.Td !== undefined
              ? t('load.uplift', { t: l.Td.toFixed(1) })
              : t('load.axial', { n: (l.Nd ?? 0).toFixed(1) });
    return `${head} · ${l.grade}`;
  };

  const worst = results[0];
  const pct = Math.round(worst.maxUtilisation * 100);

  return (
    <section>
      <h2>{t('analysis.title')}</h2>

      <div className="field-grid">
        <SelectField
          label={t('analysis.snowZone')}
          value={String(s.snowZone)}
          options={SNOW_ZONES.map((z) => ({ value: String(z.zone), label: t(z.labelKey) }))}
          onChange={(v) => setSnowZone(Number(v))}
        />
        <NumberField label={t('analysis.snowSk')} unit="kN/m²" value={s.snowSk} step={0.1} min={0.1} onChange={setSnowSk} />
        <SelectField
          label={t('analysis.serviceClass')}
          value={String(s.serviceClass)}
          options={[
            { value: '1', label: t('analysis.class1') },
            { value: '2', label: t('analysis.class2') },
            { value: '3', label: t('analysis.class3') },
          ]}
          onChange={(v) => setServiceClass(Number(v) as 1 | 2 | 3)}
        />
        <NumberField label={t('analysis.imposedDeck')} unit="kN/m²" value={s.imposedLoad} step={0.5} min={0.5} onChange={setImposedLoad} />
        <SelectField
          label={t('analysis.windZone')}
          value={String(s.windZone)}
          options={WIND_ZONES.map((z) => ({ value: String(z.zone), label: t(z.labelKey) }))}
          onChange={(v) => setWindZone(Number(v))}
        />
        <NumberField label={t('analysis.windVb0')} unit="m/s" value={s.windVb0} step={1} min={15} onChange={setWindVb0} />
        <SelectField
          label={t('analysis.terrain')}
          value={String(s.terrain)}
          options={[0, 1, 2, 3, 4].map((c) => ({ value: String(c), label: t(`terrain${c}`) }))}
          onChange={(v) => setTerrain(Number(v) as 0 | 1 | 2 | 3 | 4)}
        />
      </div>

      <label className="check">
        <input type="checkbox" checked={s.openStructure} onChange={(e) => setOpenStructure(e.target.checked)} />
        {t('analysis.openStructure')}
      </label>

      <div className={`verdict verdict-${worst.status}`}>
        <span className="status-dot" style={{ background: DOT[worst.status] }} />
        {worst.status === 'over'
          ? t('analysis.verdictOver', { name: t(`member.${worst.name}`), section: worst.sectionMm, pct })
          : worst.status === 'warn'
            ? t('analysis.verdictWarn', { name: t(`member.${worst.name}`), section: worst.sectionMm, pct })
            : t('analysis.verdictOk', { pct: 100 - pct })}
      </div>

      <label className="check highlight-toggle">
        <input type="checkbox" checked={showUtilisation} onChange={toggleUtilisation} />
        {t('analysis.highlight')}
        <span className="legend">
          <span className="status-dot" style={{ background: DOT.warn }} /> ≥90%
          <span className="status-dot" style={{ background: DOT.over }} /> &gt;100%
        </span>
      </label>

      <table className="materials analysis">
        <thead>
          <tr>
            <th>{t('analysis.colElement')}</th>
            <th className="num">{t('analysis.colUtil')}</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={`${r.name}-${r.sectionMm}-${r.span}`}>
              <td>
                <span className="status-dot" style={{ background: DOT[r.status] }} />
                {t(`member.${r.name}`)} {r.sectionMm}
                <span className="sub">
                  {r.pcs} {t('analysis.pcs')} · {r.span.toFixed(2)} m · {loadText(r.load)}
                </span>
              </td>
              <td className="num">
                {Math.round(r.maxUtilisation * 100)}%
                <span className="sub">{t(r.governing)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="disclaimer">{t('analysis.disclaimer')}</p>
    </section>
  );
}
