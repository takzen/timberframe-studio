import { useMemo } from 'react';
import { analizaFundamentow } from './model/fundamenty/fundamenty';
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
  const ustawieniaFund = useStore((s) => s.fundamenty);
  const pokazWytezenie = useStore((s) => s.pokazWytezenie);

  const wszystkie = useMemo(() => generujElementy(prymitywy), [prymitywy]);

  // analiza statyczna liczona raz: tabela + mapy statusów do kolorowania
  const surowe = useMemo(() => analizaSurowa(wszystkie, statyka), [wszystkie, statyka]);
  const wyniki = useMemo(() => grupuj(surowe), [surowe]);

  // dobór fundamentów: stopy pod słupy (z sił osiowych) + sprawdzenie płyt
  const fundamenty = useMemo(
    () => analizaFundamentow(prymitywy, wszystkie, statyka, ustawieniaFund),
    [prymitywy, wszystkie, statyka, ustawieniaFund],
  );

  // pełen zestaw meshy = konstrukcja + wygenerowane bryły stóp
  const zElementami = useMemo(
    () => [...wszystkie, ...fundamenty.elementyStop],
    [wszystkie, fundamenty],
  );
  const widoczne = useMemo(
    () =>
      zElementami.filter(
        (el) => widoczneGrupy[el.grupa] && (trybWidoku === 'pelny' || el.kategoria !== 'poszycie'),
      ),
    [zElementami, widoczneGrupy, trybWidoku],
  );

  const statusEl = useMemo(() => {
    const m = statusyElementow(surowe);
    for (const s of fundamenty.stopy) m.set(`stopa-${s.idSlupa}`, s.status);
    for (const p of fundamenty.plyty) m.set(`${p.idPrymitywu}-0`, p.status);
    return m;
  }, [surowe, fundamenty]);
  const statusPrym = useMemo(
    () => statusyPrymitywow(wszystkie, statusEl),
    [wszystkie, statusEl],
  );

  const pokazFundamenty = widoczneGrupy.fundamenty;

  return (
    <div className="uklad">
      <Pasek />
      <main className="obszar">
        <section className="panel-rzutu">
          <h3>Rzut</h3>
          <Rzut
            wytezenie={pokazWytezenie ? statusPrym : null}
            stopy={pokazFundamenty ? fundamenty.stopy : []}
          />
        </section>
        <section className="panel-3d">
          <h3>Podgląd 3D</h3>
          <div className="plotno">
            <Scena elementy={widoczne} wytezenie={pokazWytezenie ? statusEl : null} />
          </div>
        </section>
      </main>
      <PanelBoczny elementy={widoczne} wyniki={wyniki} fundamenty={fundamenty} />
    </div>
  );
}
