import { Fragment } from 'react';
import { name } from '../model/catalog';
import { PRICE_ITEMS, type PriceItem, type PriceKind, type PriceUnit } from '../model/pricing';
import { useStore } from '../store';
import { useT } from '../useT';

const money = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const KIND_ORDER: PriceKind[] = ['species', 'sheathing', 'concrete', 'fastener'];

export function PriceEditor({ onClose }: { onClose: () => void }) {
  const t = useT();
  const lang = useStore((s) => s.language);
  const prices = useStore((s) => s.prices);
  const setPrice = useStore((s) => s.setPrice);
  const resetPrice = useStore((s) => s.resetPrice);
  const resetPrices = useStore((s) => s.resetPrices);

  const unit = (u: PriceUnit) => t(`price.unit.${u}`);
  const overrides = Object.keys(prices).length;

  const row = (item: PriceItem) => {
    const overridden = prices[item.id] !== undefined;
    const value = overridden ? prices[item.id] : item.base;
    return (
      <tr key={item.id} className={overridden ? 'overridden' : ''}>
        <td>
          {name(item.name, lang)}
          <span className="sub">{unit(item.unit)}</span>
        </td>
        <td className="num">
          <input
            type="number"
            min={0}
            step={item.unit === 'pc' ? 0.1 : 10}
            value={Number(value.toFixed(2))}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v >= 0) setPrice(item.id, v);
            }}
          />
        </td>
        <td className="reset-cell">
          {overridden ? (
            <button className="mini" title={`${t('price.default')} ${money(item.base)}`} onClick={() => resetPrice(item.id)}>
              ↺ {money(item.base)}
            </button>
          ) : (
            <span className="sub default-dim">{t('price.default')}</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal price-editor" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{t('price.title')}</h2>
          <div className="modal-actions">
            <button className="mini" disabled={overrides === 0} onClick={resetPrices}>
              {t('price.resetAll')}{overrides > 0 ? ` (${overrides})` : ''}
            </button>
            <button className="mini close" onClick={onClose}>
              {t('price.close')}
            </button>
          </div>
        </header>
        <p className="hint">{t('price.hint')}</p>
        <div className="modal-body">
          <table className="materials price-table">
            <thead>
              <tr>
                <th>{t('price.colItem')}</th>
                <th className="num">{t('price.colPrice')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {KIND_ORDER.map((kind) => (
                <Fragment key={kind}>
                  <tr className="section-head">
                    <th colSpan={3}>{t(`price.kind.${kind}`)}</th>
                  </tr>
                  {PRICE_ITEMS.filter((i) => i.kind === kind).map(row)}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
