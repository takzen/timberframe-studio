import { findFastener, findSheathing, findSpecies, name } from '../model/catalog';
import type { Bill } from '../model/materials';
import { useStore } from '../store';
import { useT } from '../useT';

const money = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function MaterialsTable({ b }: { b: Bill }) {
  const t = useT();
  const lang = useStore((s) => s.language);
  const materialName = (id: string, plate: boolean) =>
    plate ? name(findSheathing(id).name, lang) : name(findSpecies(id).name, lang);

  const frame = b.items.filter((i) => i.category === 'frame');
  const sheathing = b.items.filter((i) => i.category !== 'frame');
  const pcs = t('bom.pcs');

  const section = (title: string, rows: typeof b.items) =>
    rows.length === 0 ? null : (
      <>
        <tr className="section-head">
          <th colSpan={3}>{title}</th>
        </tr>
        {rows.map((i) => (
          <tr key={`${i.name}-${i.sectionMm}-${i.materialId}`}>
            <td>
              {t(`member.${i.name}`)}
              <span className="sub">
                {materialName(i.materialId, i.plate)} · {i.lengths}
              </span>
            </td>
            <td className="num">
              {i.sectionMm}
              <span className="sub">{i.pcs} {pcs}</span>
            </td>
            <td className="num">
              {i.plate ? `${i.totalM2?.toFixed(2)} m²` : `${i.totalM.toFixed(2)} mb`}
              <span className="sub">{money(i.cost)} zł</span>
            </td>
          </tr>
        ))}
      </>
    );

  return (
    <>
      <table className="materials">
        <thead>
          <tr>
            <th>{t('bom.colElement')}</th>
            <th className="num">{t('bom.colSection')}</th>
            <th className="num">{t('bom.colQtyCost')}</th>
          </tr>
        </thead>
        <tbody>
          {section(t('bom.frame'), frame)}
          {section(t('bom.sheathing'), sheathing)}
          {b.fasteners.length > 0 && (
            <>
              <tr className="section-head">
                <th colSpan={3}>{t('bom.fasteners')}</th>
              </tr>
              {b.fasteners.map((f) => (
                <tr key={f.id}>
                  <td colSpan={2}>
                    {name(findFastener(f.id)!.name, lang)}
                    <span className="sub">{money(f.pricePerPc)} zł/{pcs}</span>
                  </td>
                  <td className="num">
                    {f.pcs} {pcs}
                    <span className="sub">{money(f.cost)} zł</span>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      <table className="summary">
        <tbody>
          <tr>
            <td>{t('bom.timber')}</td>
            <td className="num">{b.totalM3.toFixed(3)} m³</td>
            <td className="num">{money(b.timberCost)} zł</td>
          </tr>
          <tr>
            <td>{t('bom.sheathingTotal')}</td>
            <td className="num">{b.totalM2.toFixed(2)} m²</td>
            <td className="num">{money(b.sheathingCost)} zł</td>
          </tr>
          <tr>
            <td>{t('bom.fastenersTotal')}</td>
            <td className="num" />
            <td className="num">{money(b.fastenerCost)} zł</td>
          </tr>
          <tr className="grand">
            <td>{t('bom.total')}</td>
            <td className="num" />
            <td className="num">{money(b.totalCost)} zł</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
