import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { findConcrete, name } from '../model/catalog';
import { analyseFoundations } from '../model/foundations/foundations';
import { generateElements } from '../model/generate';
import { bill } from '../model/materials';
import { analyseRaw, grouped } from '../model/structural/analysis';
import { findSnowZone } from '../model/structural/loads';
import type { LoadNote, Status } from '../model/structural/types';
import { findWindZone } from '../model/structural/wind';
import { useStore } from '../store';
import { useT } from '../useT';
import { MaterialsTable } from './MaterialsTable';

const DOT: Record<Status, string> = { ok: '#3f9b4b', warn: '#c08a1e', over: '#c33a30' };
const money = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ReportView({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useStore((s) => s.language);
  const primitives = useStore((s) => s.primitives);
  const structural = useStore((s) => s.structural);
  const foundationSettings = useStore((s) => s.foundations);
  const prices = useStore((s) => s.prices);
  const projectName = useStore((s) => s.name);

  const { results, b, foundations } = useMemo(() => {
    const all = generateElements(primitives);
    return {
      results: grouped(analyseRaw(all, structural)),
      b: bill(all, prices),
      foundations: analyseFoundations(primitives, all, structural, foundationSettings, prices),
    };
  }, [primitives, structural, foundationSettings, prices]);

  const title = projectName.trim() === '' ? t('project.new') : projectName;
  const worst = results[0];
  const today = new Date().toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-GB');
  const grandTotal = b.totalCost + foundations.cost;

  const loadText = (l: LoadNote) =>
    l.kind === 'snow'
      ? t('load.snow', { zone: l.zone ?? 0 })
      : l.kind === 'imposed'
        ? t('load.imposed', { q: (l.q ?? 0).toFixed(1) })
        : l.kind === 'beam'
          ? t('load.beam')
          : l.Td !== undefined
            ? t('load.uplift', { t: l.Td.toFixed(1) })
            : t('load.axial', { n: (l.Nd ?? 0).toFixed(1) });

  const verdictText = worst
    ? worst.status === 'over'
      ? t('analysis.verdictOver', { name: t(`member.${worst.name}`), section: worst.sectionMm, pct: Math.round(worst.maxUtilisation * 100) })
      : worst.status === 'warn'
        ? t('analysis.verdictWarn', { name: t(`member.${worst.name}`), section: worst.sectionMm, pct: Math.round(worst.maxUtilisation * 100) })
        : t('analysis.verdictOk', { pct: 100 - Math.round(worst.maxUtilisation * 100) })
    : '';

  const assumptions: [string, string][] = [
    [t('analysis.snowZone'), `${t(findSnowZone(structural.snowZone).labelKey)} · s_k = ${structural.snowSk} kN/m²`],
    [t('analysis.serviceClass'), t(`analysis.class${structural.serviceClass}`)],
    [t('analysis.imposedDeck'), `${structural.imposedLoad} kN/m²`],
    [t('analysis.windZone'), `${t(findWindZone(structural.windZone).labelKey)} · v_b,0 = ${structural.windVb0} m/s`],
    [t('analysis.terrain'), t(`terrain${structural.terrain}`)],
    [t('analysis.openStructure'), structural.openStructure ? t('report.yes') : t('report.no')],
    [t('foundations.soilBearing'), `${foundationSettings.soilBearing} kPa`],
    [t('foundations.concrete'), name(findConcrete(foundationSettings.concreteClass).name, lang)],
  ];

  const hasFoundations = foundations.footings.length > 0 || foundations.slabs.length > 0;

  return createPortal(
    <div className="report-overlay">
      <div className="report">
        <header className="report-head">
          <div>
            <h1>{title}</h1>
            <p className="report-meta">
              {t('report.title')} · {t('report.generated')} {today}
            </p>
          </div>
          <div className="report-actions no-print">
            <button onClick={() => window.print()}>{t('report.print')}</button>
            <button onClick={onClose}>{t('report.close')}</button>
          </div>
        </header>

        {worst && (
          <div className="report-verdict" style={{ borderColor: DOT[worst.status], color: DOT[worst.status] }}>
            <strong>{t('report.verdict')}:</strong> {verdictText}
          </div>
        )}

        <section className="report-section">
          <h2>{t('report.assumptions')}</h2>
          <dl className="report-assumptions">
            {assumptions.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {results.length > 0 && (
          <section className="report-section">
            <h2>{t('report.structuralTitle')}</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th>{t('analysis.colElement')}</th>
                  <th className="num">{t('analysis.pcs')}</th>
                  <th className="num">m</th>
                  <th>{t('bom.colElement')}</th>
                  <th className="num">{t('analysis.colUtil')}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={`${r.name}-${r.sectionMm}-${r.span}`}>
                    <td>
                      <span className="dot" style={{ background: DOT[r.status] }} />
                      {t(`member.${r.name}`)} {r.sectionMm}
                    </td>
                    <td className="num">{r.pcs}</td>
                    <td className="num">{r.span.toFixed(2)}</td>
                    <td className="muted">{loadText(r.load)} · {t(r.governing)}</td>
                    <td className="num strong">{Math.round(r.maxUtilisation * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {hasFoundations && (
          <section className="report-section">
            <h2>{t('report.foundationsTitle')}</h2>
            <p className="report-line">
              {t('foundations.footing')}: {foundations.footings.length} ·{' '}
              {name(findConcrete(foundationSettings.concreteClass).name, lang)} ·{' '}
              {foundations.concreteVolume.toFixed(3)} m³ · {money(foundations.cost)} zł
            </p>
          </section>
        )}

        <section className="report-section report-materials">
          <h2>{t('report.materialsTitle')}</h2>
          <MaterialsTable b={b} />
          {hasFoundations && (
            <table className="summary report-grand">
              <tbody>
                <tr>
                  <td>{t('report.totalWithFoundations')}</td>
                  <td className="num strong">{money(grandTotal)} zł</td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <p className="report-disclaimer">{t('analysis.disclaimer')}</p>
      </div>
    </div>,
    document.body,
  );
}
