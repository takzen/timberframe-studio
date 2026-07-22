import { useRef } from 'react';
import { TYPY } from '../model/domyslne';
import type { PrymitywDef } from '../model/typy';
import { SZABLONY } from '../projekty';
import { useStore } from '../store';

function pobierz(tresc: string, nazwaPliku: string, typ: string) {
  const blob = new Blob([tresc], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nazwaPliku;
  a.click();
  URL.revokeObjectURL(url);
}

export function Pasek() {
  const plik = useRef<HTMLInputElement>(null);
  const nazwa = useStore((s) => s.nazwa);
  const narzedzie = useStore((s) => s.narzedzie);
  const poziomRoboczy = useStore((s) => s.poziomRoboczy);
  const skokSiatki = useStore((s) => s.skokSiatki);
  const prymitywy = useStore((s) => s.prymitywy);
  const historia = useStore((s) => s.historia);
  const indeksHistorii = useStore((s) => s.indeksHistorii);

  const ustawNarzedzie = useStore((s) => s.ustawNarzedzie);
  const ustawPoziom = useStore((s) => s.ustawPoziom);
  const ustawSkok = useStore((s) => s.ustawSkok);
  const ustawNazwe = useStore((s) => s.ustawNazwe);
  const cofnij = useStore((s) => s.cofnij);
  const ponow = useStore((s) => s.ponow);
  const wczytaj = useStore((s) => s.wczytaj);
  const nowy = useStore((s) => s.nowy);

  const wczytajPlik = async (f: File) => {
    try {
      const dane = JSON.parse(await f.text()) as { nazwa?: string; prymitywy?: PrymitywDef[] };
      if (!Array.isArray(dane.prymitywy)) throw new Error('brak listy prymitywów');
      wczytaj(dane.nazwa ?? f.name.replace(/\.json$/i, ''), dane.prymitywy);
    } catch (e) {
      alert(`Nie udało się wczytać pliku: ${(e as Error).message}`);
    }
  };

  return (
    <header className="pasek">
      <div className="grupa">
        <input
          className="nazwa-projektu"
          value={nazwa}
          onChange={(e) => ustawNazwe(e.target.value)}
          aria-label="Nazwa projektu"
        />
      </div>

      <div className="grupa narzedzia">
        <button
          className={narzedzie === 'wybor' ? 'akt' : ''}
          onClick={() => ustawNarzedzie('wybor')}
          title="Wybór i przesuwanie widoku (Esc)"
        >
          Wybór
        </button>
        {TYPY.map((t) => (
          <button
            key={t.typ}
            className={narzedzie === t.typ ? 'akt' : ''}
            onClick={() => ustawNarzedzie(t.typ)}
          >
            {t.etykieta}
          </button>
        ))}
      </div>

      <div className="grupa">
        <button onClick={cofnij} disabled={indeksHistorii <= 0} title="Cofnij">
          ↶
        </button>
        <button
          onClick={ponow}
          disabled={indeksHistorii >= historia.length - 1}
          title="Ponów"
        >
          ↷
        </button>
      </div>

      <div className="grupa">
        <label className="pole-w-pasku">
          <span>poziom roboczy</span>
          <input
            type="number"
            value={poziomRoboczy}
            step={0.1}
            onChange={(e) => ustawPoziom(Number(e.target.value))}
          />
        </label>
        <label className="pole-w-pasku">
          <span>skok siatki</span>
          <select value={skokSiatki} onChange={(e) => ustawSkok(Number(e.target.value))}>
            <option value={0.01}>1 cm</option>
            <option value={0.05}>5 cm</option>
            <option value={0.1}>10 cm</option>
            <option value={0.25}>25 cm</option>
            <option value={0.5}>50 cm</option>
          </select>
        </label>
      </div>

      <div className="grupa prawa">
        <select
          value=""
          onChange={(e) => {
            const s = SZABLONY.find((x) => x.id === e.target.value);
            if (s) wczytaj(s.nazwa, s.buduj());
          }}
          title="Wczytaj szablon"
        >
          <option value="">Szablon…</option>
          {SZABLONY.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nazwa}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            if (prymitywy.length === 0 || confirm('Wyczyścić bieżący projekt?')) nowy();
          }}
        >
          Nowy
        </button>
        <button
          onClick={() =>
            pobierz(
              JSON.stringify({ nazwa, prymitywy }, null, 2),
              `${nazwa.replace(/[^\w\-]+/g, '_')}.json`,
              'application/json',
            )
          }
          title="Zapisz projekt do pliku JSON"
        >
          Zapisz
        </button>
        <button onClick={() => plik.current?.click()}>Wczytaj</button>
        <input
          ref={plik}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void wczytajPlik(f);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}
