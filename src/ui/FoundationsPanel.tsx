import { CONCRETE, name } from '../model/catalog';
import { SOILS } from '../model/foundations/soil';
import type { FoundationAnalysis } from '../model/foundations/types';
import type { Status } from '../model/structural/types';
import { useStore } from '../store';
import { useT } from '../useT';
import { NumberField, SelectField } from './fields';

const DOT: Record<Status, string> = { ok: '#5fbf6a', warn: '#e0b04a', over: '#e0645a' };
const RANK: Record<Status, number> = { ok: 0, warn: 1, over: 2 };
const money = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function FoundationsPanel({ analysis }: { analysis: FoundationAnalysis }) {
  const t = useT();
  const lang = useStore((s) => s.language);
  const f = useStore((s) => s.foundations);
  const setFoundations = useStore((s) => s.setFoundations);

  const { footings, slabs } = analysis;
  const groups = new Map<string, { side: number; pcs: number; status: Status; maxNd: number }>();
  for (const s of footings) {
    const key = s.side.toFixed(2);
    const g = groups.get(key);
    if (g) {
      g.pcs += 1;
      g.maxNd = Math.max(g.maxNd, s.Nd);
      if (RANK[s.status] > RANK[g.status]) g.status = s.status;
    } else {
      groups.set(key, { side: s.side, pcs: 1, status: s.status, maxNd: s.Nd });
    }
  }

  return (
    <section>
      <h2>{t('foundations.title')}</h2>

      <div className="field-grid">
        <SelectField
          label={t('foundations.soilBearing')}
          value={String(f.soilBearing)}
          options={SOILS.map((so) => ({ value: String(so.bearing), label: `${name(so.name, lang)} · ${so.bearing} kPa` }))}
          onChange={(v) => setFoundations({ soilBearing: Number(v) })}
        />
        <NumberField label={t('foundations.soilBearing')} unit="kPa" value={f.soilBearing} step={25} min={25} onChange={(soilBearing) => setFoundations({ soilBearing })} />
        <SelectField
          label={t('foundations.concrete')}
          value={f.concreteClass}
          options={CONCRETE.map((c) => ({ value: c.id, label: `${name(c.name, lang)} · ${c.pricePerM3} zł/m³` }))}
          onChange={(concreteClass) => setFoundations({ concreteClass })}
        />
        <NumberField label={t('foundations.frostDepth')} unit="m" value={f.frostDepth} step={0.1} min={0.4} onChange={(frostDepth) => setFoundations({ frostDepth })} />
        <NumberField label={t('foundations.minFooting')} unit="m" value={f.minFooting} step={0.05} min={0.2} onChange={(minFooting) => setFoundations({ minFooting })} />
        <NumberField label={t('foundations.footingThickness')} unit="m" value={f.footingThickness} step={0.05} min={0.2} onChange={(footingThickness) => setFoundations({ footingThickness })} />
      </div>

      {footings.length === 0 && slabs.length === 0 ? (
        <p className="hint">{t('foundations.empty')}</p>
      ) : (
        <table className="materials analysis">
          <thead>
            <tr>
              <th>{t('foundations.colFoundation')}</th>
              <th className="num">{t('foundations.colSizePressure')}</th>
            </tr>
          </thead>
          <tbody>
            {[...groups.values()]
              .sort((a, b) => b.side - a.side)
              .map((g) => (
                <tr key={g.side}>
                  <td>
                    <span className="status-dot" style={{ background: DOT[g.status] }} />
                    {t('foundations.footing')} {g.side.toFixed(2)}×{g.side.toFixed(2)} m
                    <span className="sub">{g.pcs} {t('analysis.pcs')} · {t('foundations.founding')} {f.frostDepth.toFixed(1)} m</span>
                  </td>
                  <td className="num">
                    N≈{g.maxNd.toFixed(1)} kN
                    <span className="sub">{t('foundations.soil')} {f.soilBearing} kPa</span>
                  </td>
                </tr>
              ))}
            {slabs.map((sl) => (
              <tr key={sl.primitiveId}>
                <td>
                  <span className="status-dot" style={{ background: DOT[sl.status] }} />
                  {t('foundations.slab')} {sl.area.toFixed(1)} m² · {(sl.thickness * 100).toFixed(0)} cm
                  <span className="sub">{t('foundations.pressure')} {sl.pressure.toFixed(0)} kPa</span>
                </td>
                <td className="num">
                  {Math.round(sl.utilisation * 100)}%
                  <span className="sub">{t('foundations.ofSoil')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(footings.length > 0 || slabs.length > 0) && (
        <table className="summary">
          <tbody>
            <tr>
              <td>{t('foundations.concreteTotal')}</td>
              <td className="num">{analysis.concreteVolume.toFixed(2)} m³</td>
              <td className="num">{money(analysis.cost)} zł</td>
            </tr>
          </tbody>
        </table>
      )}

      <p className="disclaimer">{t('foundations.disclaimer')}</p>
    </section>
  );
}
