import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { opisTypu } from '../model/domyslne';
import type { WynikStopy } from '../model/fundamenty/typy';
import type { Status } from '../model/statyka/typy';
import type { PrymitywDef, Vec2 } from '../model/typy';
import { useStore } from '../store';
import {
  przesun,
  przyciagnijInteligentnie,
  punktyZaczepienia,
  uchwyty,
  ustawUchwyt,
  zaczep,
} from './edycja';
import {
  dlugosc,
  naEkran,
  naSwiat,
  prostokatZPunktow,
  przyciagnij,
  transformGrupy,
  type Rozmiar,
  type Widok,
} from './geometria';
import { KsztaltRzutu, powierzchniaTrafienia, srodekPrymitywu, trafienie } from './ksztalty';

const SKALA_MIN = 8;
const SKALA_MAKS = 400;
/** Ruch myszy powyżej tylu pikseli traktujemy jako przeciąganie, nie kliknięcie. */
const PROG_PRZECIAGANIA = 4;
/** Promień łapania uchwytu i przyciągania do punktów geometrii, w pikselach. */
const PROMIEN_UCHWYTU = 9;
const PROMIEN_DOCZEPIENIA = 12;

type Akcja =
  | { rodzaj: 'widok'; cxStart: number; cyStart: number }
  | { rodzaj: 'przesun'; oryginal: PrymitywDef; swiatStart: Vec2 }
  | { rodzaj: 'uchwyt'; oryginal: PrymitywDef; uchwyt: string }
  | { rodzaj: 'rysuj'; poczatek: Vec2 };

interface Wskaznik {
  ekranX: number;
  ekranY: number;
  akcja: Akcja;
  ruszony: boolean;
}

const BARWA_STOPY: Record<Status, string> = {
  ok: '#8f9296',
  uwaga: '#e0b04a',
  przekroczone: '#e0645a',
};

export function Rzut({
  wytezenie,
  stopy,
}: {
  wytezenie: Map<string, Status> | null;
  stopy: WynikStopy[];
}) {
  const kontener = useRef<HTMLDivElement>(null);
  const [rozmiar, setRozmiar] = useState<Rozmiar>({ w: 800, h: 600 });
  const [widok, setWidok] = useState<Widok>({ cx: 3, cy: 3, skala: 55 });
  const [start, setStart] = useState<Vec2 | null>(null);
  const [kursor, setKursor] = useState<Vec2 | null>(null);
  const [doczepiony, setDoczepiony] = useState(false);
  const [nadElementem, setNadElementem] = useState<string | null>(null);
  const wskaznik = useRef<Wskaznik | null>(null);

  const prymitywy = useStore((s) => s.prymitywy);
  const zaznaczony = useStore((s) => s.zaznaczony);
  const narzedzie = useStore((s) => s.narzedzie);
  const skokSiatki = useStore((s) => s.skokSiatki);
  const pokazSiatke = useStore((s) => s.pokazSiatke);
  const dodaj = useStore((s) => s.dodaj);
  const zaznacz = useStore((s) => s.zaznacz);
  const usun = useStore((s) => s.usun);
  const aktualizujNaZywo = useStore((s) => s.aktualizujNaZywo);
  const zatwierdz = useStore((s) => s.zatwierdz);
  const ustawNarzedzie = useStore((s) => s.ustawNarzedzie);

  const defZaznaczony = useMemo(
    () => prymitywy.find((p) => p.id === zaznaczony),
    [prymitywy, zaznaczony],
  );

  useLayoutEffect(() => {
    const el = kontener.current;
    if (!el) return;
    const obs = new ResizeObserver(([w]) =>
      setRozmiar({ w: w.contentRect.width, h: w.contentRect.height }),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const swiatZeZdarzenia = useCallback(
    (e: { clientX: number; clientY: number }): Vec2 => {
      const r = kontener.current!.getBoundingClientRect();
      return naSwiat([e.clientX - r.left, e.clientY - r.top], widok, rozmiar);
    },
    [widok, rozmiar],
  );

  const znajdzTrafiony = useCallback(
    (p: Vec2): PrymitywDef | undefined => {
      const tol = 6 / widok.skala;
      return prymitywy
        .filter((def) => trafienie(def, p, tol))
        .sort((a, b) => powierzchniaTrafienia(a) - powierzchniaTrafienia(b))[0];
    },
    [prymitywy, widok.skala],
  );

  /** Uchwyt zaznaczonego elementu pod kursorem, jeśli jest w zasięgu. */
  const znajdzUchwyt = useCallback(
    (p: Vec2): string | null => {
      if (!defZaznaczony) return null;
      const promien = PROMIEN_UCHWYTU / widok.skala;
      for (const u of uchwyty(defZaznaczony)) {
        if (dlugosc(u.punkt, p) < promien) return u.id;
      }
      return null;
    },
    [defZaznaczony, widok.skala],
  );

  const zaczepy = useCallback(
    (pomijajId?: string) => punktyZaczepienia(prymitywy, pomijajId),
    [prymitywy],
  );

  const przyciagnijZDoczepieniem = useCallback(
    (p: Vec2, pomijajId?: string) =>
      przyciagnijInteligentnie(
        p,
        zaczepy(pomijajId),
        skokSiatki,
        PROMIEN_DOCZEPIENIA,
        widok.skala,
      ),
    [zaczepy, skokSiatki, widok.skala],
  );

  const anuluj = useCallback(() => {
    setStart(null);
    ustawNarzedzie('wybor');
  }, [ustawNarzedzie]);

  useEffect(() => {
    const naKlawisz = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, select, textarea')) return;
      if (e.key === 'Escape') anuluj();
      if ((e.key === 'Delete' || e.key === 'Backspace') && zaznaczony) {
        e.preventDefault();
        usun(zaznaczony);
      }
    };
    window.addEventListener('keydown', naKlawisz);
    return () => window.removeEventListener('keydown', naKlawisz);
  }, [anuluj, usun, zaznaczony]);

  useEffect(() => setStart(null), [narzedzie]);

  const zoom = (e: React.WheelEvent) => {
    const przed = swiatZeZdarzenia(e);
    const skala = Math.min(
      SKALA_MAKS,
      Math.max(SKALA_MIN, widok.skala * (e.deltaY < 0 ? 1.12 : 1 / 1.12)),
    );
    const r = kontener.current!.getBoundingClientRect();
    const po = naSwiat([e.clientX - r.left, e.clientY - r.top], { ...widok, skala }, rozmiar);
    setWidok({ skala, cx: widok.cx + (przed[0] - po[0]), cy: widok.cy + (przed[1] - po[1]) });
  };

  const wcisniety = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const r = kontener.current!.getBoundingClientRect();
    const swiat = swiatZeZdarzenia(e);
    const ekranX = e.clientX - r.left;
    const ekranY = e.clientY - r.top;

    let akcja: Akcja;
    if (narzedzie !== 'wybor') {
      akcja = { rodzaj: 'rysuj', poczatek: przyciagnijZDoczepieniem(swiat).punkt };
    } else {
      const uchwyt = e.button === 0 ? znajdzUchwyt(swiat) : null;
      const trafiony = e.button === 0 && !uchwyt ? znajdzTrafiony(swiat) : undefined;
      if (uchwyt && defZaznaczony) {
        akcja = { rodzaj: 'uchwyt', oryginal: defZaznaczony, uchwyt };
      } else if (trafiony) {
        if (trafiony.id !== zaznaczony) zaznacz(trafiony.id);
        akcja = { rodzaj: 'przesun', oryginal: trafiony, swiatStart: swiat };
      } else {
        akcja = { rodzaj: 'widok', cxStart: widok.cx, cyStart: widok.cy };
      }
    }
    wskaznik.current = { ekranX, ekranY, akcja, ruszony: false };
  };

  const ruch = (e: React.PointerEvent) => {
    const swiat = swiatZeZdarzenia(e);
    const w = wskaznik.current;

    if (!w) {
      // bez wciśniętego przycisku: podpowiadamy kursorem, co da się złapać
      setKursor(przyciagnij(swiat, skokSiatki));
      setNadElementem(narzedzie === 'wybor' ? (znajdzTrafiony(swiat)?.id ?? null) : null);
      return;
    }

    const r = kontener.current!.getBoundingClientRect();
    const dx = e.clientX - r.left - w.ekranX;
    const dy = e.clientY - r.top - w.ekranY;
    if (!w.ruszony && Math.hypot(dx, dy) > PROG_PRZECIAGANIA) w.ruszony = true;
    if (!w.ruszony) return;

    switch (w.akcja.rodzaj) {
      case 'widok': {
        const { cxStart, cyStart } = w.akcja;
        setWidok((v) => ({ ...v, cx: cxStart - dx / v.skala, cy: cyStart + dy / v.skala }));
        break;
      }
      case 'przesun': {
        const { oryginal, swiatStart } = w.akcja;
        const zaczepOryg = zaczep(oryginal);
        const docelowy: Vec2 = [
          zaczepOryg[0] + (swiat[0] - swiatStart[0]),
          zaczepOryg[1] + (swiat[1] - swiatStart[1]),
        ];
        const { punkt, doczepiony: d } = przyciagnijZDoczepieniem(docelowy, oryginal.id);
        setDoczepiony(d);
        setKursor(punkt);
        aktualizujNaZywo(
          oryginal.id,
          przesun(oryginal, punkt[0] - zaczepOryg[0], punkt[1] - zaczepOryg[1]),
        );
        break;
      }
      case 'uchwyt': {
        const { oryginal, uchwyt } = w.akcja;
        const { punkt, doczepiony: d } = przyciagnijZDoczepieniem(swiat, oryginal.id);
        setDoczepiony(d);
        setKursor(punkt);
        const zmiany = ustawUchwyt(oryginal, uchwyt, punkt);
        if (zmiany) aktualizujNaZywo(oryginal.id, zmiany);
        break;
      }
      case 'rysuj':
        setKursor(przyciagnijZDoczepieniem(swiat).punkt);
        break;
    }
  };

  const puszczony = (e: React.PointerEvent) => {
    const w = wskaznik.current;
    wskaznik.current = null;
    setDoczepiony(false);
    if (!w) return;

    const { punkt: koniec } = przyciagnijZDoczepieniem(swiatZeZdarzenia(e));

    if (w.akcja.rodzaj === 'przesun' || w.akcja.rodzaj === 'uchwyt') {
      if (w.ruszony) zatwierdz();
      return;
    }
    if (w.akcja.rodzaj === 'widok') {
      if (!w.ruszony) zaznacz(null);
      return;
    }
    if (w.akcja.rodzaj !== 'rysuj' || narzedzie === 'wybor') return;

    const { rysowanie } = opisTypu(narzedzie);
    if (rysowanie === 'punkt') {
      dodaj(narzedzie, koniec, koniec);
      return;
    }
    if (start) {
      if (dlugosc(start, koniec) > 1e-6) dodaj(narzedzie, start, koniec);
      setStart(null);
    } else if (dlugosc(w.akcja.poczatek, koniec) > 0.2) {
      dodaj(narzedzie, w.akcja.poczatek, koniec); // przeciągnięcie
    } else {
      setStart(w.akcja.poczatek);
    }
  };

  /** Zakres świata widoczny w oknie rzutu, zaokrąglony do wielokrotności kroku. */
  const zakresWidoku = (krok: number) => {
    const polSzer = rozmiar.w / 2 / widok.skala;
    const polWys = rozmiar.h / 2 / widok.skala;
    return {
      x0: Math.floor((widok.cx - polSzer) / krok) * krok,
      x1: Math.ceil((widok.cx + polSzer) / krok) * krok,
      y0: Math.floor((widok.cy - polWys) / krok) * krok,
      y1: Math.ceil((widok.cy + polWys) / krok) * krok,
    };
  };

  const linieSiatki = () => {
    if (!pokazSiatke) return null;
    const krok = widok.skala < 20 ? 5 : 1;
    const { x0, x1, y0, y1 } = zakresWidoku(krok);
    const kolor = (v: number) =>
      v === 0 ? '#6f7f6a' : Math.abs(v % 5) < 1e-9 ? '#3c434b' : '#2b3037';
    const grubosc = (v: number) => (v === 0 || Math.abs(v % 5) < 1e-9 ? 1.2 : 0.8);
    const linie = [];
    for (let x = x0; x <= x1; x += krok)
      linie.push(
        <line
          key={`x${x}`}
          x1={x}
          y1={y0}
          x2={x}
          y2={y1}
          stroke={kolor(x)}
          strokeWidth={grubosc(x)}
          vectorEffect="non-scaling-stroke"
        />,
      );
    for (let y = y0; y <= y1; y += krok)
      linie.push(
        <line
          key={`y${y}`}
          x1={x0}
          y1={y}
          x2={x1}
          y2={y}
          stroke={kolor(y)}
          strokeWidth={grubosc(y)}
          vectorEffect="non-scaling-stroke"
        />,
      );
    return linie;
  };

  const podglad = () => {
    if (narzedzie === 'wybor' || !kursor) return null;
    const { rysowanie } = opisTypu(narzedzie);
    if (rysowanie === 'punkt')
      return <circle cx={kursor[0]} cy={kursor[1]} r={0.09} fill="#e0a75c" />;
    if (!start) return null;
    if (rysowanie === 'linia')
      return (
        <line
          x1={start[0]}
          y1={start[1]}
          x2={kursor[0]}
          y2={kursor[1]}
          stroke="#e0a75c"
          strokeWidth={2.5}
          strokeDasharray="8 4"
          vectorEffect="non-scaling-stroke"
        />
      );
    const r = prostokatZPunktow(start, kursor);
    return (
      <rect
        x={r.pozycja[0]}
        y={r.pozycja[1]}
        width={r.wymiar[0]}
        height={r.wymiar[1]}
        fill="rgba(224,167,92,0.2)"
        stroke="#e0a75c"
        strokeWidth={2.5}
        strokeDasharray="8 4"
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  /**
   * Punkt zerowy (0,0) — układ odniesienia całego projektu. Wszystkie współrzędne
   * elementów, siatka i przyciąganie liczą się względem niego.
   */
  const punktZerowy = () => {
    const [ex, ey] = naEkran([0, 0], widok, rozmiar);
    if (ex < -80 || ex > rozmiar.w + 80 || ey < -80 || ey > rozmiar.h + 80) return null;
    const r = 26; // długość ramion osi w pikselach
    return (
      <g className="punkt-zerowy" pointerEvents="none">
        <line x1={ex} y1={ey} x2={ex + r} y2={ey} className="os os-x" />
        <line x1={ex} y1={ey} x2={ex} y2={ey - r} className="os os-y" />
        <polygon points={`${ex + r},${ey} ${ex + r - 6},${ey - 3.5} ${ex + r - 6},${ey + 3.5}`} className="grot os-x" />
        <polygon points={`${ex},${ey - r} ${ex - 3.5},${ey - r + 6} ${ex + 3.5},${ey - r + 6}`} className="grot os-y" />
        <circle cx={ex} cy={ey} r={5.5} className="oko" />
        <circle cx={ex} cy={ey} r={1.8} className="srodek" />
        <text x={ex + r + 5} y={ey + 4} className="opis-osi os-x">X</text>
        <text x={ex + 5} y={ey - r - 3} className="opis-osi os-y">Y</text>
        <text x={ex - 7} y={ey + 16} className="opis-osi zero">0,0</text>
      </g>
    );
  };

  /** Liczby metrów na krawędziach okna — żeby dało się odczytać położenie bez kursora. */
  const podzialka = () => {
    const krok = widok.skala >= 45 ? 1 : widok.skala >= 18 ? 5 : 10;
    const { x0, x1, y0, y1 } = zakresWidoku(krok);
    const opisy = [];
    for (let x = x0; x <= x1 + 1e-9; x += krok) {
      const [ex] = naEkran([x, 0], widok, rozmiar);
      if (ex < 20 || ex > rozmiar.w - 10) continue;
      opisy.push(
        <text key={`px${x}`} x={ex} y={rozmiar.h - 7} className="podzialka poziomo">
          {Math.round(x * 100) / 100}
        </text>,
      );
    }
    for (let y = y0; y <= y1 + 1e-9; y += krok) {
      const [, ey] = naEkran([0, y], widok, rozmiar);
      if (ey < 12 || ey > rozmiar.h - 22) continue;
      opisy.push(
        <text key={`py${y}`} x={5} y={ey + 3.5} className="podzialka">
          {Math.round(y * 100) / 100}
        </text>,
      );
    }
    return opisy;
  };

  const naZero = () => setWidok((v) => ({ ...v, cx: 0, cy: 0 }));

  /** Dopasowuje widok do projektu, zawsze zostawiając w kadrze punkt 0,0. */
  const dopasujWidok = () => {
    const punkty = punktyZaczepienia(prymitywy);
    if (punkty.length === 0) return setWidok({ cx: 0, cy: 0, skala: 55 });
    const xs = [0, ...punkty.map((p) => p[0])];
    const ys = [0, ...punkty.map((p) => p[1])];
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const margines = 1.5;
    const skala = Math.min(
      rozmiar.w / Math.max(maxX - minX + margines * 2, 1),
      rozmiar.h / Math.max(maxY - minY + margines * 2, 1),
    );
    setWidok({
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      skala: Math.min(SKALA_MAKS, Math.max(SKALA_MIN, skala)),
    });
  };

  /** Kwadraciki uchwytów — poza przeskalowaną grupą, żeby miały stały rozmiar. */
  const uchwytyEkranowe = () => {
    if (!defZaznaczony || narzedzie !== 'wybor') return null;
    return uchwyty(defZaznaczony).map((u) => {
      const [ex, ey] = naEkran(u.punkt, widok, rozmiar);
      return (
        <rect
          key={u.id}
          x={ex - 4}
          y={ey - 4}
          width={8}
          height={8}
          className="uchwyt"
          pointerEvents="none"
        />
      );
    });
  };

  const opisPodPodgladem = () => {
    if (narzedzie !== 'wybor' || !kursor) return null;
    const w = wskaznik.current;
    if (!w?.ruszony || (w.akcja.rodzaj !== 'przesun' && w.akcja.rodzaj !== 'uchwyt')) return null;
    const [ex, ey] = naEkran(kursor, widok, rozmiar);
    return (
      <text x={ex + 14} y={ey - 12} className="wymiar-podgladu">
        {`${kursor[0].toFixed(2)} ; ${kursor[1].toFixed(2)}`}
        {doczepiony ? ' ⌖' : ''}
      </text>
    );
  };

  const wymiarPodgladu = () => {
    if (!start || !kursor || narzedzie === 'wybor') return null;
    const { rysowanie } = opisTypu(narzedzie);
    const r = prostokatZPunktow(start, kursor);
    const tekst =
      rysowanie === 'linia'
        ? `${dlugosc(start, kursor).toFixed(2)} m`
        : `${r.wymiar[0].toFixed(2)} × ${r.wymiar[1].toFixed(2)} m`;
    const [ex, ey] = naEkran(kursor, widok, rozmiar);
    return (
      <text x={ex + 14} y={ey - 12} className="wymiar-podgladu">
        {tekst}
      </text>
    );
  };

  const kursorCSS = (() => {
    if (narzedzie !== 'wybor') return 'crosshair';
    const w = wskaznik.current;
    if (w?.ruszony && w.akcja.rodzaj !== 'widok') return 'grabbing';
    if (kursor && znajdzUchwyt(kursor)) return 'nwse-resize';
    return nadElementem ? 'move' : 'default';
  })();

  return (
    <div className="rzut" ref={kontener}>
      <svg
        width={rozmiar.w}
        height={rozmiar.h}
        style={{ cursor: kursorCSS, touchAction: 'none' }}
        onPointerDown={wcisniety}
        onPointerMove={ruch}
        onPointerUp={puszczony}
        onPointerLeave={() => {
          setKursor(null);
          setNadElementem(null);
        }}
        onWheel={zoom}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={transformGrupy(widok, rozmiar)}>
          {linieSiatki()}
          {stopy.map((s) => (
            <rect
              key={`stopa-${s.idSlupa}`}
              x={s.punkt[0] - s.bok / 2}
              y={s.punkt[1] - s.bok / 2}
              width={s.bok}
              height={s.bok}
              fill="rgba(140,144,150,0.22)"
              stroke={BARWA_STOPY[s.status]}
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {prymitywy.map((def) => {
            const st = wytezenie?.get(def.id);
            return (
              <KsztaltRzutu
                key={def.id}
                def={def}
                stan={
                  def.id === zaznaczony
                    ? 'zaznaczony'
                    : def.id === nadElementem
                      ? 'pod-kursorem'
                      : 'zwykly'
                }
                wytezenie={st === 'uwaga' || st === 'przekroczone' ? st : undefined}
              />
            );
          })}
          {podglad()}
        </g>

        {/* etykiety, uchwyty i wymiary — poza przeskalowaną grupą, żeby nie były odbite */}
        {(() => {
          const zajete = new Map<string, number>();
          return prymitywy.map((def) => {
            const [ex, ey] = naEkran(srodekPrymitywu(def), widok, rozmiar);
            const klucz = `${Math.round(ex / 40)}:${Math.round(ey / 14)}`;
            const nr = zajete.get(klucz) ?? 0;
            zajete.set(klucz, nr + 1);
            return (
              <text
                key={def.id}
                x={ex}
                y={ey + nr * 13}
                className={`etykieta-rzutu${def.id === zaznaczony ? ' zaznaczona' : ''}`}
              >
                {def.etykieta}
              </text>
            );
          });
        })()}
        {punktZerowy()}
        {podzialka()}
        {uchwytyEkranowe()}
        {wymiarPodgladu()}
        {opisPodPodgladem()}
      </svg>

      <div className="rzut-narzedzia">
        <button onClick={naZero} title="Wyśrodkuj widok na punkcie zerowym">
          ⌖ 0,0
        </button>
        <button onClick={dopasujWidok} title="Dopasuj widok do całego projektu">
          Dopasuj
        </button>
      </div>

      <div className="rzut-info">
        {kursor ? `X ${kursor[0].toFixed(2)} · Y ${kursor[1].toFixed(2)} m` : '—'}
        <span>{Math.round(widok.skala)} px/m</span>
      </div>

      {narzedzie !== 'wybor' ? (
        <div className="rzut-podpowiedz">
          {opisTypu(narzedzie).rysowanie === 'punkt'
            ? 'Kliknij, aby postawić słup'
            : start
              ? 'Kliknij drugi punkt · Esc anuluje'
              : 'Kliknij pierwszy punkt lub przeciągnij · Esc anuluje'}
        </div>
      ) : (
        defZaznaczony && (
          <div className="rzut-podpowiedz cicha">
            Przeciągnij element, aby przesunąć · złap kwadracik, aby zmienić kształt · Delete usuwa
          </div>
        )
      )}
    </div>
  );
}
