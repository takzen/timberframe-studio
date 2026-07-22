import type { Zestawienie } from '../model/materialy';

const zl = (v: number) =>
  v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TabelaMaterialowa({ z }: { z: Zestawienie }) {
  const konstrukcja = z.pozycje.filter((p) => p.kategoria === 'konstrukcja');
  const poszycie = z.pozycje.filter((p) => p.kategoria === 'poszycie');

  const sekcja = (tytul: string, wiersze: typeof z.pozycje) =>
    wiersze.length === 0 ? null : (
      <>
        <tr className="naglowek-sekcji">
          <th colSpan={3}>{tytul}</th>
        </tr>
        {wiersze.map((p) => (
          <tr key={`${p.nazwa}-${p.przekrojCm}-${p.material}`}>
            <td>
              {p.nazwa}
              <span className="dlugosci">
                {p.material} · {p.dlugosci}
              </span>
            </td>
            <td className="num">
              {p.przekrojCm}
              <span className="dlugosci">{p.sztuk} szt.</span>
            </td>
            <td className="num">
              {p.plytowy ? `${p.sumaM2?.toFixed(2)} m²` : `${p.sumaMb.toFixed(2)} mb`}
              <span className="dlugosci">{zl(p.koszt)} zł</span>
            </td>
          </tr>
        ))}
      </>
    );

  return (
    <>
      <table className="materialy">
        <thead>
          <tr>
            <th>element / materiał</th>
            <th className="num">przekrój mm</th>
            <th className="num">ilość / koszt</th>
          </tr>
        </thead>
        <tbody>
          {sekcja('Konstrukcja', konstrukcja)}
          {sekcja('Poszycia i deski', poszycie)}
          {z.laczniki.length > 0 && (
            <>
              <tr className="naglowek-sekcji">
                <th colSpan={3}>Łączniki i okucia</th>
              </tr>
              {z.laczniki.map((l) => (
                <tr key={l.id}>
                  <td colSpan={2}>
                    {l.nazwa}
                    <span className="dlugosci">{zl(l.cenaSzt)} zł/szt.</span>
                  </td>
                  <td className="num">
                    {l.sztuk} szt.
                    <span className="dlugosci">{zl(l.koszt)} zł</span>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      <table className="podsumowanie">
        <tbody>
          <tr>
            <td>Drewno</td>
            <td className="num">{z.sumaM3.toFixed(3)} m³</td>
            <td className="num">{zl(z.kosztDrewna)} zł</td>
          </tr>
          <tr>
            <td>Poszycia</td>
            <td className="num">{z.sumaM2.toFixed(2)} m²</td>
            <td className="num">{zl(z.kosztPoszycia)} zł</td>
          </tr>
          <tr>
            <td>Łączniki</td>
            <td className="num" />
            <td className="num">{zl(z.kosztLacznikow)} zł</td>
          </tr>
          <tr className="razem">
            <td>Razem</td>
            <td className="num" />
            <td className="num">{zl(z.kosztRazem)} zł</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
