import { STREFY_SNIEGU } from '../model/statyka/obciazenia';
import type { Status, WynikElementu } from '../model/statyka/typy';
import { useStore } from '../store';
import { PoleLiczba, PoleWybor } from './pola';

const KROPKA: Record<Status, string> = {
  ok: '#5fbf6a',
  uwaga: '#e0b04a',
  przekroczone: '#e0645a',
};

function Wiersz({ w }: { w: WynikElementu }) {
  const proc = Math.round(w.maksWykorzystanie * 100);
  return (
    <tr>
      <td>
        <span className="kropka" style={{ background: KROPKA[w.status] }} />
        {w.nazwa} {w.przekrojMm}
        <span className="dlugosci">
          {w.sztuk} szt · {w.rozpietosc.toFixed(2)} m · {w.opisObciazenia}
        </span>
      </td>
      <td className="num">
        {proc}%
        <span className="dlugosci">{w.miarodajne}</span>
      </td>
    </tr>
  );
}

export function PanelAnalizy({ wyniki }: { wyniki: WynikElementu[] }) {
  const ustawienia = useStore((s) => s.statyka);
  const pokazWytezenie = useStore((s) => s.pokazWytezenie);
  const ustawStrefeSniegu = useStore((s) => s.ustawStrefeSniegu);
  const ustawSniegSk = useStore((s) => s.ustawSniegSk);
  const ustawKlaseUzytkowania = useStore((s) => s.ustawKlaseUzytkowania);
  const ustawObciazenieUzytkowe = useStore((s) => s.ustawObciazenieUzytkowe);
  const przelaczWytezenie = useStore((s) => s.przelaczWytezenie);

  const najgorszy = wyniki[0];

  return (
    <section>
      <h2>Analiza nośności</h2>

      <div className="siatka-pol">
        <PoleWybor
          etykieta="Strefa śniegowa"
          wartosc={String(ustawienia.strefaSniegu)}
          opcje={STREFY_SNIEGU.map((s) => ({ wartosc: String(s.strefa), etykieta: s.etykieta }))}
          onZmiana={(v) => ustawStrefeSniegu(Number(v))}
        />
        <PoleLiczba
          etykieta="Śnieg s_k"
          jednostka="kN/m²"
          wartosc={ustawienia.sniegSk}
          krok={0.1}
          min={0.1}
          onZmiana={ustawSniegSk}
        />
        <PoleWybor
          etykieta="Klasa użytkowania"
          wartosc={String(ustawienia.klasaUzytkowania)}
          opcje={[
            { wartosc: '1', etykieta: '1 — wnętrze ogrzewane' },
            { wartosc: '2', etykieta: '2 — zadaszone, nieogrzewane' },
            { wartosc: '3', etykieta: '3 — na zewnątrz' },
          ]}
          onZmiana={(v) => ustawKlaseUzytkowania(Number(v) as 1 | 2 | 3)}
        />
        <PoleLiczba
          etykieta="Użytkowe podest"
          jednostka="kN/m²"
          wartosc={ustawienia.obciazenieUzytkowe}
          krok={0.5}
          min={0.5}
          onZmiana={ustawObciazenieUzytkowe}
        />
      </div>

      <div className={`werdykt werdykt-${najgorszy.status}`}>
        <span className="kropka" style={{ background: KROPKA[najgorszy.status] }} />
        {najgorszy.status === 'przekroczone'
          ? `Przekroczona nośność: ${najgorszy.nazwa} ${najgorszy.przekrojMm} (${Math.round(
              najgorszy.maksWykorzystanie * 100,
            )}%)`
          : najgorszy.status === 'uwaga'
            ? `Najbardziej wytężony: ${najgorszy.nazwa} ${najgorszy.przekrojMm} (${Math.round(
                najgorszy.maksWykorzystanie * 100,
              )}%)`
            : `Wszystko w normie — zapas ${100 - Math.round(najgorszy.maksWykorzystanie * 100)}%`}
      </div>

      <label className="ptaszek podswietl">
        <input type="checkbox" checked={pokazWytezenie} onChange={przelaczWytezenie} />
        Podświetl na rysunku i w 3D
        <span className="legenda">
          <span className="kropka" style={{ background: KROPKA.uwaga }} /> ≥90%
          <span className="kropka" style={{ background: KROPKA.przekroczone }} /> &gt;100%
        </span>
      </label>

      <table className="materialy analiza">
        <thead>
          <tr>
            <th>element</th>
            <th className="num">wykorzystanie</th>
          </tr>
        </thead>
        <tbody>
          {wyniki.map((w) => (
            <Wiersz key={`${w.nazwa}-${w.przekrojMm}-${w.rozpietosc}`} w={w} />
          ))}
        </tbody>
      </table>

      <p className="zastrzezenie">
        Szacunek orientacyjny wg PN-EN 1995-1-1: krokwie i legary (zginanie wolnopodparte),
        belki (ciąg przęseł), słupy (ściskanie z wyboczeniem), kombinacja 1,35·G + 1,5·Q.
        <strong> Bez</strong> wiatru, połączeń, stateczności globalnej, rozporu i fundamentów.
        Nie zastępuje projektu konstrukcyjnego — zob. DISCLAIMER.
      </p>
    </section>
  );
}
