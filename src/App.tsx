import { useMemo } from 'react';
import { generujElementy } from './model/generuj';
import { analizaSurowa, grupuj, statusyElementow, statusyPrymitywow } from './model/statyka/analiza';
import { Rzut } from './rzut/Rzut';
import { Scena } from './scena/Scena';
import { Pasek } from './ui/Pasek';
import { PanelBoczny } from './ui/PanelBoczny';
import { useStore } from './store';
import './App.css';

export default function App() {
  const prymitywy = useStore((s) => s.prymitywy);
  const trybWidoku = useStore((s) => s.trybWidoku);
  const widoczneGrupy = useStore((s) => s.widoczneGrupy);
  const statyka = useStore((s) => s.statyka);
  const pokazWytezenie = useStore((s) => s.pokazWytezenie);

  const wszystkie = useMemo(() => generujElementy(prymitywy), [prymitywy]);
  const widoczne = useMemo(
    () =>
      wszystkie.filter(
        (el) =>
          widoczneGrupy[el.grupa] && (trybWidoku === 'pelny' || el.kategoria === 'konstrukcja'),
      ),
    [wszystkie, widoczneGrupy, trybWidoku],
  );

  // analiza liczona raz: tabela w panelu + mapy statusów do kolorowania
  const surowe = useMemo(() => analizaSurowa(wszystkie, statyka), [wszystkie, statyka]);
  const wyniki = useMemo(() => grupuj(surowe), [surowe]);
  const statusEl = useMemo(() => statusyElementow(surowe), [surowe]);
  const statusPrym = useMemo(() => statusyPrymitywow(wszystkie, statusEl), [wszystkie, statusEl]);

  return (
    <div className="uklad">
      <Pasek />
      <main className="obszar">
        <section className="panel-rzutu">
          <h3>Rzut</h3>
          <Rzut wytezenie={pokazWytezenie ? statusPrym : null} />
        </section>
        <section className="panel-3d">
          <h3>Podgląd 3D</h3>
          <div className="plotno">
            <Scena elementy={widoczne} wytezenie={pokazWytezenie ? statusEl : null} />
          </div>
        </section>
      </main>
      <PanelBoczny elementy={widoczne} wyniki={wyniki} />
    </div>
  );
}
