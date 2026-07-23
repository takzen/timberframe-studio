import { BETONY } from '../model/katalog';
import { GRUNTY } from '../model/fundamenty/grunty';
import type { AnalizaFundamentow } from '../model/fundamenty/typy';
import type { Status } from '../model/statyka/typy';
import { useStore } from '../store';
import { PoleLiczba, PoleWybor } from './pola';

const KROPKA: Record<Status, string> = {
  ok: '#5fbf6a',
  uwaga: '#e0b04a',
  przekroczone: '#e0645a',
};
const zl = (v: number) =>
  v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PanelFundamenty({ analiza }: { analiza: AnalizaFundamentow }) {
  const f = useStore((s) => s.fundamenty);
  const ustawFundamenty = useStore((s) => s.ustawFundamenty);

  const { stopy, plyty } = analiza;
  // stopy tego samego boku łączymy w jedną pozycję (największe N i najgorszy status)
  const RANGA: Record<Status, number> = { ok: 0, uwaga: 1, przekroczone: 2 };
  const grupyStop = new Map<string, { bok: number; sztuk: number; status: Status; maxNd: number }>();
  for (const s of stopy) {
    const klucz = s.bok.toFixed(2);
    const g = grupyStop.get(klucz);
    if (g) {
      g.sztuk += 1;
      g.maxNd = Math.max(g.maxNd, s.Nd);
      if (RANGA[s.status] > RANGA[g.status]) g.status = s.status;
    } else {
      grupyStop.set(klucz, { bok: s.bok, sztuk: 1, status: s.status, maxNd: s.Nd });
    }
  }

  return (
    <section>
      <h2>Fundamenty</h2>

      <div className="siatka-pol">
        <PoleWybor
          etykieta="Nośność gruntu"
          wartosc={String(f.nosnoscGruntu)}
          opcje={GRUNTY.map((g) => ({
            wartosc: String(g.nosnosc),
            etykieta: `${g.nazwa} · ${g.nosnosc} kPa`,
          }))}
          onZmiana={(v) => ustawFundamenty({ nosnoscGruntu: Number(v) })}
        />
        <PoleLiczba
          etykieta="Nośność gruntu"
          jednostka="kPa"
          wartosc={f.nosnoscGruntu}
          krok={25}
          min={25}
          onZmiana={(nosnoscGruntu) => ustawFundamenty({ nosnoscGruntu })}
        />
        <PoleWybor
          etykieta="Beton fundamentów"
          wartosc={f.klasaBetonu}
          opcje={BETONY.map((b) => ({ wartosc: b.id, etykieta: `${b.nazwa} · ${b.cenaM3} zł/m³` }))}
          onZmiana={(klasaBetonu) => ustawFundamenty({ klasaBetonu })}
        />
        <PoleLiczba
          etykieta="Gł. przemarzania"
          jednostka="m"
          wartosc={f.glebokoscPrzemarzania}
          krok={0.1}
          min={0.4}
          onZmiana={(glebokoscPrzemarzania) => ustawFundamenty({ glebokoscPrzemarzania })}
        />
        <PoleLiczba
          etykieta="Min. bok stopy"
          jednostka="m"
          wartosc={f.minStopa}
          krok={0.05}
          min={0.2}
          onZmiana={(minStopa) => ustawFundamenty({ minStopa })}
        />
        <PoleLiczba
          etykieta="Grubość stopy"
          jednostka="m"
          wartosc={f.gruboscStopy}
          krok={0.05}
          min={0.2}
          onZmiana={(gruboscStopy) => ustawFundamenty({ gruboscStopy })}
        />
      </div>

      {stopy.length === 0 && plyty.length === 0 ? (
        <p className="opis">
          Dobór stóp rusza, gdy w projekcie są słupy. Płytę fundamentową dodajesz
          narzędziem „Płyta fund." z paska.
        </p>
      ) : (
        <table className="materialy analiza">
          <thead>
            <tr>
              <th>fundament</th>
              <th className="num">wymiar · nacisk</th>
            </tr>
          </thead>
          <tbody>
            {[...grupyStop.values()]
              .sort((a, b) => b.bok - a.bok)
              .map((g) => (
                <tr key={g.bok}>
                  <td>
                    <span className="kropka" style={{ background: KROPKA[g.status] }} />
                    Stopa {g.bok.toFixed(2)}×{g.bok.toFixed(2)} m
                    <span className="dlugosci">
                      {g.sztuk} szt · posadowienie {f.glebokoscPrzemarzania.toFixed(1)} m
                    </span>
                  </td>
                  <td className="num">
                    N≈{g.maxNd.toFixed(1)} kN
                    <span className="dlugosci">grunt {f.nosnoscGruntu} kPa</span>
                  </td>
                </tr>
              ))}
            {plyty.map((p) => (
              <tr key={p.idPrymitywu}>
                <td>
                  <span className="kropka" style={{ background: KROPKA[p.status] }} />
                  Płyta {p.pole.toFixed(1)} m² · {(p.grubosc * 100).toFixed(0)} cm
                  <span className="dlugosci">nacisk {p.naprezenie.toFixed(0)} kPa</span>
                </td>
                <td className="num">
                  {Math.round(p.wykorzystanie * 100)}%
                  <span className="dlugosci">gruntu</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(stopy.length > 0 || plyty.length > 0) && (
        <table className="podsumowanie">
          <tbody>
            <tr>
              <td>Beton fundamentów</td>
              <td className="num">{analiza.objetoscBetonu.toFixed(2)} m³</td>
              <td className="num">{zl(analiza.koszt)} zł</td>
            </tr>
          </tbody>
        </table>
      )}

      <p className="zastrzezenie">
        Orientacyjny dobór: bok stopy z warunku nacisk ≤ nośność gruntu, przyjęta
        <strong> nośność gruntu</strong> bez badań geotechnicznych. Bez zbrojenia,
        przebicia i osiadania (EC2/EC7). Nie zastępuje projektu — zob. DISCLAIMER.
      </p>
    </section>
  );
}
