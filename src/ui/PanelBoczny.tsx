import type { Element } from '../model/typy';
import { eksportujCSV, zestawienie } from '../model/materialy';
import { GRUPY, useStore } from '../store';
import { PanelAnalizy } from './PanelAnalizy';
import { PanelWlasciwosci } from './PanelWlasciwosci';
import { TabelaMaterialowa } from './TabelaMaterialowa';

export function PanelBoczny({ elementy, wszystkie }: { elementy: Element[]; wszystkie: Element[] }) {
  const nazwa = useStore((s) => s.nazwa);
  const trybWidoku = useStore((s) => s.trybWidoku);
  const widoczneGrupy = useStore((s) => s.widoczneGrupy);
  const pokazSiatke = useStore((s) => s.pokazSiatke);
  const ustawTryb = useStore((s) => s.ustawTryb);
  const przelaczGrupe = useStore((s) => s.przelaczGrupe);
  const przelaczSiatke = useStore((s) => s.przelaczSiatke);

  const z = zestawienie(elementy);

  return (
    <aside className="panel">
      <PanelWlasciwosci />

      <section>
        <h2>Widok</h2>
        <div className="przelacznik">
          <button className={trybWidoku === 'pelny' ? 'akt' : ''} onClick={() => ustawTryb('pelny')}>
            Pełny 3D
          </button>
          <button
            className={trybWidoku === 'konstrukcja' ? 'akt' : ''}
            onClick={() => ustawTryb('konstrukcja')}
          >
            Tylko konstrukcja
          </button>
        </div>
        <label className="ptaszek">
          <input type="checkbox" checked={pokazSiatke} onChange={przelaczSiatke} />
          Siatka
        </label>
        {GRUPY.map((g) => (
          <label key={g.id} className="ptaszek">
            <input
              type="checkbox"
              checked={widoczneGrupy[g.id]}
              onChange={() => przelaczGrupe(g.id)}
            />
            {g.etykieta}
          </label>
        ))}
      </section>

      {wszystkie.length > 0 && <PanelAnalizy elementy={wszystkie} />}

      <section className="rozciagnij">
        <h2>
          Zestawienie i koszt
          <button
            className="mini"
            onClick={() => eksportujCSV(z, `${nazwa.replace(/[^\w\-]+/g, '_')}-zestawienie.csv`)}
          >
            CSV
          </button>
        </h2>
        {elementy.length === 0 ? (
          <p className="opis">
            Narysuj pierwszy element w rzucie albo wczytaj szablon z paska u góry.
          </p>
        ) : (
          <>
            <p className="opis">{elementy.length} elementów widocznych wg ustawień powyżej</p>
            <TabelaMaterialowa z={z} />
          </>
        )}
      </section>
    </aside>
  );
}
