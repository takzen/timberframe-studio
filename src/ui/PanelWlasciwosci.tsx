import {
  BETONY,
  GATUNKI,
  POSZYCIA,
  PRZEKROJE,
  type ZastosowaniePrzekroju,
} from '../model/katalog';
import type { OtworDef, PrymitywDef, Vec2 } from '../model/typy';
import { useStore } from '../store';
import { Pole, PoleLiczba, PoleOdczyt, PolePtaszek, PoleWybor } from './pola';

const idPrzekroju = (v: Vec2) => `${Math.round(v[0] * 1000)}x${Math.round(v[1] * 1000)}`;

function WyborPrzekroju({
  etykieta,
  wartosc,
  zastosowanie,
  onZmiana,
}: {
  etykieta: string;
  wartosc: Vec2;
  zastosowanie: ZastosowaniePrzekroju[];
  onZmiana: (v: Vec2) => void;
}) {
  const id = idPrzekroju(wartosc);
  const dostepne = PRZEKROJE.filter((p) => zastosowanie.includes(p.zastosowanie));
  const wKatalogu = dostepne.some((p) => p.id === id);
  return (
    <Pole etykieta={`${etykieta} [mm]`}>
      <select
        value={id}
        onChange={(e) => {
          const p = PRZEKROJE.find((x) => x.id === e.target.value);
          if (p) onZmiana(p.wymiar);
        }}
      >
        {!wKatalogu && <option value={id}>{`${id.replace('x', '×')} (spoza katalogu)`}</option>}
        {dostepne.map((p) => (
          <option key={p.id} value={p.id}>
            {p.etykieta}
          </option>
        ))}
      </select>
    </Pole>
  );
}

function WyborGatunku({
  wartosc,
  etykieta = 'Gatunek drewna',
  onZmiana,
}: {
  wartosc?: string;
  etykieta?: string;
  onZmiana: (v: string) => void;
}) {
  return (
    <PoleWybor
      etykieta={etykieta}
      wartosc={wartosc ?? GATUNKI[0].id}
      opcje={GATUNKI.map((g) => ({ wartosc: g.id, etykieta: `${g.nazwa} · ${g.cenaM3} zł/m³` }))}
      onZmiana={onZmiana}
    />
  );
}

function WyborPoszycia({
  wartosc,
  onZmiana,
  dozwolonyBrak,
}: {
  wartosc?: string;
  onZmiana: (v: string | undefined) => void;
  dozwolonyBrak: boolean;
}) {
  return (
    <PoleWybor
      etykieta="Poszycie"
      wartosc={wartosc ?? 'brak'}
      opcje={[
        ...(dozwolonyBrak ? [{ wartosc: 'brak', etykieta: 'bez poszycia' }] : []),
        ...POSZYCIA.map((p) => ({ wartosc: p.id, etykieta: `${p.nazwa} · ${p.cenaM2} zł/m²` })),
      ]}
      onZmiana={(v) => onZmiana(v === 'brak' ? undefined : v)}
    />
  );
}

function WyborBetonu({ wartosc, onZmiana }: { wartosc?: string; onZmiana: (v: string) => void }) {
  return (
    <PoleWybor
      etykieta="Klasa betonu"
      wartosc={wartosc ?? 'c16-20'}
      opcje={BETONY.map((b) => ({ wartosc: b.id, etykieta: `${b.nazwa} · ${b.cenaM3} zł/m³` }))}
      onZmiana={onZmiana}
    />
  );
}

function EdytorOtworow({
  otwory,
  dlugoscSciany,
  onZmiana,
}: {
  otwory: OtworDef[];
  dlugoscSciany: number;
  onZmiana: (o: OtworDef[]) => void;
}) {
  const zmien = (i: number, zmiany: Partial<OtworDef>) =>
    onZmiana(otwory.map((o, j) => (i === j ? { ...o, ...zmiany } : o)));

  const dodaj = (typ: 'okno' | 'drzwi') =>
    onZmiana([
      ...otwory,
      typ === 'drzwi'
        ? { typ, odleglosc: Math.max(0.2, dlugoscSciany / 2 - 0.45), szerokosc: 0.9, wysokosc: 2.05, parapet: 0 }
        : { typ, odleglosc: Math.max(0.2, dlugoscSciany / 2 - 0.6), szerokosc: 1.2, wysokosc: 1.2, parapet: 0.9 },
    ]);

  return (
    <div className="otwory">
      <div className="otwory-naglowek">
        <span>Otwory ({otwory.length})</span>
        <span>
          <button className="mini" onClick={() => dodaj('okno')}>
            + okno
          </button>
          <button className="mini" onClick={() => dodaj('drzwi')}>
            + drzwi
          </button>
        </span>
      </div>
      {otwory.map((o, i) => (
        <div key={i} className="otwor">
          <div className="otwor-tytul">
            <strong>{o.typ === 'drzwi' ? 'Drzwi' : 'Okno'}</strong>
            <button className="mini usun" onClick={() => onZmiana(otwory.filter((_, j) => j !== i))}>
              usuń
            </button>
          </div>
          <div className="siatka-pol">
            <PoleLiczba
              etykieta="od początku"
              wartosc={o.odleglosc}
              min={0}
              max={dlugoscSciany}
              onZmiana={(v) => zmien(i, { odleglosc: v })}
            />
            <PoleLiczba
              etykieta="szerokość"
              wartosc={o.szerokosc}
              min={0.2}
              onZmiana={(v) => zmien(i, { szerokosc: v })}
            />
            <PoleLiczba
              etykieta="wysokość"
              wartosc={o.wysokosc}
              min={0.2}
              onZmiana={(v) => zmien(i, { wysokosc: v })}
            />
            <PoleLiczba
              etykieta="parapet"
              wartosc={o.parapet ?? (o.typ === 'drzwi' ? 0 : 0.9)}
              min={0}
              onZmiana={(v) => zmien(i, { parapet: v })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PanelWlasciwosci() {
  const zaznaczony = useStore((s) => s.zaznaczony);
  const prymitywy = useStore((s) => s.prymitywy);
  const aktualizuj = useStore((s) => s.aktualizuj);
  const usun = useStore((s) => s.usun);

  const def = prymitywy.find((p) => p.id === zaznaczony);
  if (!def) {
    return (
      <section>
        <h2>Właściwości</h2>
        <p className="opis">
          Zaznacz element w rzucie, żeby zmienić jego wymiary, przekrój i materiał.
        </p>
      </section>
    );
  }

  const zm = (zmiany: Partial<PrymitywDef>) => aktualizuj(def.id, zmiany);

  return (
    <section className="wlasciwosci">
      <h2>
        {def.etykieta ?? 'Element'}
        <button className="mini usun" onClick={() => usun(def.id)}>
          usuń
        </button>
      </h2>
      <div className="siatka-pol">{poleWgTypu(def, zm)}</div>
      {def.typ === 'sciana' && (
        <EdytorOtworow
          otwory={def.otwory ?? []}
          dlugoscSciany={Math.hypot(def.do[0] - def.od[0], def.do[1] - def.od[1])}
          onZmiana={(otwory) => zm({ otwory })}
        />
      )}
    </section>
  );
}

function poleWgTypu(def: PrymitywDef, zm: (z: Partial<PrymitywDef>) => void) {
  switch (def.typ) {
    case 'sciana': {
      const L = Math.hypot(def.do[0] - def.od[0], def.do[1] - def.od[1]);
      return (
        <>
          <PoleOdczyt etykieta="Długość [m]" wartosc={L.toFixed(2)} />
          <PoleLiczba
            etykieta="Wysokość"
            wartosc={def.wysokosc}
            min={0.3}
            onZmiana={(v) => zm({ wysokosc: v })}
          />
          <PoleLiczba
            etykieta="Poziom bazy"
            wartosc={def.z ?? 0}
            onZmiana={(v) => zm({ z: v })}
          />
          <PoleLiczba
            etykieta="Rozstaw słupków"
            wartosc={def.rozstawSlupkow ?? 0.6}
            krok={0.05}
            min={0.2}
            onZmiana={(v) => zm({ rozstawSlupkow: v })}
          />
          <WyborPrzekroju
            etykieta="Przekrój słupka"
            wartosc={def.przekroj ?? [0.06, 0.14]}
            zastosowanie={['tarcica']}
            onZmiana={(przekroj) => zm({ przekroj })}
          />
          <WyborGatunku wartosc={def.gatunek} onZmiana={(gatunek) => zm({ gatunek })} />
          <WyborPoszycia
            wartosc={def.poszycie}
            dozwolonyBrak
            onZmiana={(poszycie) => zm({ poszycie })}
          />
          <PoleWybor
            etykieta="Strona poszycia"
            wartosc={String(def.stronaPoszycia ?? 1)}
            opcje={[
              { wartosc: '1', etykieta: 'lewa (od→do)' },
              { wartosc: '-1', etykieta: 'prawa (od→do)' },
            ]}
            onZmiana={(v) => zm({ stronaPoszycia: Number(v) as 1 | -1 })}
          />
        </>
      );
    }
    case 'belka': {
      const L = Math.hypot(def.do[0] - def.od[0], def.do[1] - def.od[1]);
      return (
        <>
          <PoleOdczyt etykieta="Długość w rzucie [m]" wartosc={L.toFixed(2)} />
          <PoleLiczba
            etykieta="Poziom początku"
            wartosc={def.od[2]}
            onZmiana={(v) => zm({ od: [def.od[0], def.od[1], v] })}
          />
          <PoleLiczba
            etykieta="Poziom końca"
            wartosc={def.do[2]}
            onZmiana={(v) => zm({ do: [def.do[0], def.do[1], v] })}
          />
          <WyborPrzekroju
            etykieta="Przekrój"
            wartosc={def.przekroj}
            zastosowanie={['tarcica', 'slup']}
            onZmiana={(przekroj) => zm({ przekroj })}
          />
          <WyborGatunku wartosc={def.gatunek} onZmiana={(gatunek) => zm({ gatunek })} />
        </>
      );
    }
    case 'zastrzal': {
      const wysieg = Math.hypot(def.do[0] - def.od[0], def.do[1] - def.od[1]);
      const ramie = def.ramiePionowe ?? 0.6;
      const wys = (def.przekroj ?? [0.08, 0.12])[1];
      const dlOsi = Math.hypot(wysieg, ramie);
      const kat = (Math.atan2(ramie, wysieg) * 180) / Math.PI;
      // czoła: dolne pionowo do słupa, górne poziomo do belki
      const rad = Math.PI / 180;
      const dlMaterialu =
        dlOsi + (wys / 2) * Math.abs(Math.tan(kat * rad) - Math.tan((kat - 90) * rad));
      return (
        <>
          <PoleOdczyt etykieta="Długość osi [m]" wartosc={dlOsi.toFixed(3)} />
          <PoleOdczyt etykieta="Materiał na docięcie [m]" wartosc={dlMaterialu.toFixed(3)} />
          <PoleOdczyt etykieta="Kąt do poziomu [°]" wartosc={kat.toFixed(1)} />
          <PoleOdczyt
            etykieta="Ukos czół [°]"
            wartosc={`${kat.toFixed(1)} / ${(90 - kat).toFixed(1)}`}
          />
          <PoleLiczba
            etykieta="Wysięg poziomy"
            wartosc={wysieg}
            min={0.1}
            onZmiana={(v) => {
              const skala = v / (wysieg || 1);
              zm({
                do: [
                  def.od[0] + (def.do[0] - def.od[0]) * skala,
                  def.od[1] + (def.do[1] - def.od[1]) * skala,
                ],
              });
            }}
          />
          <PoleLiczba
            etykieta="Zejście po słupie"
            wartosc={ramie}
            min={0.1}
            onZmiana={(ramiePionowe) => zm({ ramiePionowe })}
          />
          <PoleLiczba
            etykieta="Poziom przy belce"
            wartosc={def.zGora}
            onZmiana={(zGora) => zm({ zGora })}
          />
          <WyborPrzekroju
            etykieta="Przekrój"
            wartosc={def.przekroj ?? [0.08, 0.12]}
            zastosowanie={['tarcica', 'slup']}
            onZmiana={(przekroj) => zm({ przekroj })}
          />
          <WyborGatunku wartosc={def.gatunek} onZmiana={(gatunek) => zm({ gatunek })} />
          <PolePtaszek
            etykieta="Para — po obu stronach słupa"
            wartosc={def.obustronny ?? false}
            onZmiana={(obustronny) => zm({ obustronny })}
          />
        </>
      );
    }
    case 'slup':
      return (
        <>
          <PoleLiczba
            etykieta="Wysokość"
            wartosc={def.wysokosc}
            min={0.2}
            onZmiana={(v) => zm({ wysokosc: v })}
          />
          <PoleLiczba etykieta="Poziom podstawy" wartosc={def.z ?? 0} onZmiana={(v) => zm({ z: v })} />
          <PoleLiczba
            etykieta="Pozycja X"
            wartosc={def.pozycja[0]}
            onZmiana={(v) => zm({ pozycja: [v, def.pozycja[1]] })}
          />
          <PoleLiczba
            etykieta="Pozycja Y"
            wartosc={def.pozycja[1]}
            onZmiana={(v) => zm({ pozycja: [def.pozycja[0], v] })}
          />
          <WyborPrzekroju
            etykieta="Przekrój"
            wartosc={def.przekroj}
            zastosowanie={['slup', 'tarcica']}
            onZmiana={(przekroj) => zm({ przekroj })}
          />
          <WyborGatunku wartosc={def.gatunek} onZmiana={(gatunek) => zm({ gatunek })} />
        </>
      );
    case 'podest':
      return (
        <>
          <PoleLiczba
            etykieta="Szerokość X"
            wartosc={def.wymiar[0]}
            min={0.2}
            onZmiana={(v) => zm({ wymiar: [v, def.wymiar[1]] })}
          />
          <PoleLiczba
            etykieta="Głębokość Y"
            wartosc={def.wymiar[1]}
            min={0.2}
            onZmiana={(v) => zm({ wymiar: [def.wymiar[0], v] })}
          />
          <PoleLiczba
            etykieta="Poziom góry desek"
            wartosc={def.wysokosc}
            onZmiana={(v) => zm({ wysokosc: v })}
          />
          <PoleWybor
            etykieta="Kierunek legarów"
            wartosc={def.kierunekLegarow ?? 'y'}
            opcje={[
              { wartosc: 'y', etykieta: 'wzdłuż Y (deski wzdłuż X)' },
              { wartosc: 'x', etykieta: 'wzdłuż X (deski wzdłuż Y)' },
            ]}
            onZmiana={(v) => zm({ kierunekLegarow: v })}
          />
          <PoleLiczba
            etykieta="Rozstaw legarów"
            wartosc={def.rozstawLegarow ?? 0.5}
            krok={0.05}
            min={0.2}
            onZmiana={(v) => zm({ rozstawLegarow: v })}
          />
          <WyborPrzekroju
            etykieta="Przekrój legara"
            wartosc={def.przekrojLegara ?? [0.045, 0.145]}
            zastosowanie={['tarcica']}
            onZmiana={(przekrojLegara) => zm({ przekrojLegara })}
          />
          <WyborGatunku
            etykieta="Gatunek legarów"
            wartosc={def.gatunek}
            onZmiana={(gatunek) => zm({ gatunek })}
          />
          <WyborGatunku
            etykieta="Gatunek desek"
            wartosc={def.gatunekDeski}
            onZmiana={(gatunekDeski) => zm({ gatunekDeski })}
          />
          <PoleLiczba
            etykieta="Szerokość deski"
            wartosc={def.deska?.szerokosc ?? 0.14}
            krok={0.005}
            min={0.05}
            onZmiana={(v) => zm({ deska: { ...def.deska, szerokosc: v } })}
          />
          <PoleLiczba
            etykieta="Szczelina"
            wartosc={def.deska?.szczelina ?? 0.006}
            krok={0.001}
            min={0}
            onZmiana={(v) => zm({ deska: { ...def.deska, szczelina: v } })}
          />
        </>
      );
    case 'dachJednospadowy':
      return (
        <>
          <PoleLiczba
            etykieta="Szerokość X"
            wartosc={def.wymiar[0]}
            min={0.5}
            onZmiana={(v) => zm({ wymiar: [v, def.wymiar[1]] })}
          />
          <PoleLiczba
            etykieta="Głębokość Y"
            wartosc={def.wymiar[1]}
            min={0.5}
            onZmiana={(v) => zm({ wymiar: [def.wymiar[0], v] })}
          />
          <PoleLiczba
            etykieta="Kąt"
            wartosc={def.kat}
            krok={1}
            min={1}
            max={60}
            jednostka="°"
            onZmiana={(kat) => zm({ kat })}
          />
          <PoleWybor
            etykieta="Spadek w stronę"
            wartosc={def.kierunekSpadku}
            opcje={[
              { wartosc: '-x', etykieta: '−X' },
              { wartosc: '+x', etykieta: '+X' },
              { wartosc: '-y', etykieta: '−Y' },
              { wartosc: '+y', etykieta: '+Y' },
            ]}
            onZmiana={(kierunekSpadku) => zm({ kierunekSpadku })}
          />
          <PoleLiczba
            etykieta="Poziom niskiej krawędzi"
            wartosc={def.z}
            onZmiana={(z) => zm({ z })}
          />
          <PoleLiczba etykieta="Okap" wartosc={def.okap ?? 0.3} onZmiana={(okap) => zm({ okap })} />
          <PoleLiczba
            etykieta="Okap przy ścianie"
            wartosc={def.okapGora ?? def.okap ?? 0.3}
            onZmiana={(okapGora) => zm({ okapGora })}
          />
          <PoleLiczba
            etykieta="Rozstaw krokwi"
            wartosc={def.rozstawKrokwi ?? 0.6}
            krok={0.05}
            min={0.2}
            onZmiana={(rozstawKrokwi) => zm({ rozstawKrokwi })}
          />
          <WyborPrzekroju
            etykieta="Przekrój krokwi"
            wartosc={def.przekrojKrokwi ?? [0.06, 0.16]}
            zastosowanie={['tarcica']}
            onZmiana={(przekrojKrokwi) => zm({ przekrojKrokwi })}
          />
          <WyborGatunku wartosc={def.gatunek} onZmiana={(gatunek) => zm({ gatunek })} />
          <WyborPoszycia
            wartosc={def.poszycie ?? 'osb22'}
            dozwolonyBrak={false}
            onZmiana={(poszycie) => zm({ poszycie })}
          />
        </>
      );
    case 'dachDwuspadowy':
      return (
        <>
          <PoleLiczba
            etykieta="Szerokość X"
            wartosc={def.wymiar[0]}
            min={0.5}
            onZmiana={(v) => zm({ wymiar: [v, def.wymiar[1]] })}
          />
          <PoleLiczba
            etykieta="Głębokość Y"
            wartosc={def.wymiar[1]}
            min={0.5}
            onZmiana={(v) => zm({ wymiar: [def.wymiar[0], v] })}
          />
          <PoleLiczba
            etykieta="Kąt"
            wartosc={def.kat}
            krok={1}
            min={5}
            max={70}
            jednostka="°"
            onZmiana={(kat) => zm({ kat })}
          />
          <PoleWybor
            etykieta="Kalenica wzdłuż"
            wartosc={def.kierunekKalenicy}
            opcje={[
              { wartosc: 'y', etykieta: 'osi Y' },
              { wartosc: 'x', etykieta: 'osi X' },
            ]}
            onZmiana={(kierunekKalenicy) => zm({ kierunekKalenicy })}
          />
          <PoleLiczba etykieta="Poziom okapu" wartosc={def.z} onZmiana={(z) => zm({ z })} />
          <PoleLiczba etykieta="Okap" wartosc={def.okap ?? 0.4} onZmiana={(okap) => zm({ okap })} />
          <PoleLiczba
            etykieta="Rozstaw krokwi"
            wartosc={def.rozstawKrokwi ?? 0.6}
            krok={0.05}
            min={0.2}
            onZmiana={(rozstawKrokwi) => zm({ rozstawKrokwi })}
          />
          <WyborPrzekroju
            etykieta="Przekrój krokwi"
            wartosc={def.przekrojKrokwi ?? [0.06, 0.18]}
            zastosowanie={['tarcica']}
            onZmiana={(przekrojKrokwi) => zm({ przekrojKrokwi })}
          />
          <WyborPrzekroju
            etykieta="Przekrój kalenicy"
            wartosc={def.przekrojKalenicy ?? [0.08, 0.18]}
            zastosowanie={['tarcica', 'slup']}
            onZmiana={(przekrojKalenicy) => zm({ przekrojKalenicy })}
          />
          <WyborGatunku wartosc={def.gatunek} onZmiana={(gatunek) => zm({ gatunek })} />
          <WyborPoszycia
            wartosc={def.poszycie ?? 'osb22'}
            dozwolonyBrak={false}
            onZmiana={(poszycie) => zm({ poszycie })}
          />
        </>
      );
    case 'plyta':
      return (
        <>
          <PoleLiczba
            etykieta="Szerokość X"
            wartosc={def.wymiar[0]}
            min={0.3}
            onZmiana={(v) => zm({ wymiar: [v, def.wymiar[1]] })}
          />
          <PoleLiczba
            etykieta="Głębokość Y"
            wartosc={def.wymiar[1]}
            min={0.3}
            onZmiana={(v) => zm({ wymiar: [def.wymiar[0], v] })}
          />
          <PoleLiczba
            etykieta="Grubość"
            wartosc={def.grubosc}
            krok={0.05}
            min={0.1}
            onZmiana={(grubosc) => zm({ grubosc })}
          />
          <PoleLiczba
            etykieta="Poziom góry"
            wartosc={def.z ?? 0}
            onZmiana={(z) => zm({ z })}
          />
          <WyborBetonu wartosc={def.klasaBetonu} onZmiana={(klasaBetonu) => zm({ klasaBetonu })} />
        </>
      );
  }
}
