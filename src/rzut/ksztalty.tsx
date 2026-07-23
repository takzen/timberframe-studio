import type { PrymitywDef, Vec2 } from '../model/typy';
import { doPunktow, odlegloscOdOdcinka, pasWzdluzOsi } from './geometria';

const KRESKA = { vectorEffect: 'non-scaling-stroke' as const };

/** Obrys prymitywu w rzucie: [pozycja, wymiar] lub null dla elementów liniowych. */
export function obrysProstokatny(def: PrymitywDef): { pozycja: Vec2; wymiar: Vec2 } | null {
  switch (def.typ) {
    case 'podest':
    case 'dachJednospadowy':
    case 'dachDwuspadowy':
      return { pozycja: def.pozycja, wymiar: def.wymiar };
    case 'slup':
      return {
        pozycja: [def.pozycja[0] - def.przekroj[0] / 2, def.pozycja[1] - def.przekroj[1] / 2],
        wymiar: def.przekroj,
      };
    default:
      return null;
  }
}

/** Punkt, w którym rysowana jest etykieta prymitywu. */
export function srodekPrymitywu(def: PrymitywDef): Vec2 {
  const o = obrysProstokatny(def);
  if (o) return [o.pozycja[0] + o.wymiar[0] / 2, o.pozycja[1] + o.wymiar[1] / 2];
  if (def.typ === 'sciana' || def.typ === 'zastrzal')
    return [(def.od[0] + def.do[0]) / 2, (def.od[1] + def.do[1]) / 2];
  if (def.typ === 'belka') return [(def.od[0] + def.do[0]) / 2, (def.od[1] + def.do[1]) / 2];
  return [0, 0];
}

/** Powierzchnia obrysu — mniejsze elementy mają pierwszeństwo przy trafianiu. */
export function powierzchniaTrafienia(def: PrymitywDef): number {
  const o = obrysProstokatny(def);
  return o ? o.wymiar[0] * o.wymiar[1] : 0;
}

export function trafienie(def: PrymitywDef, p: Vec2, tolerancja: number): boolean {
  switch (def.typ) {
    case 'sciana':
      return odlegloscOdOdcinka(p, def.od, def.do) < (def.przekroj?.[1] ?? 0.14) / 2 + tolerancja;
    case 'belka':
      return (
        odlegloscOdOdcinka(p, [def.od[0], def.od[1]], [def.do[0], def.do[1]]) <
        def.przekroj[0] / 2 + tolerancja
      );
    case 'zastrzal': {
      const promien = (def.przekroj?.[0] ?? 0.08) / 2 + tolerancja;
      const odbity: Vec2 = [2 * def.od[0] - def.do[0], 2 * def.od[1] - def.do[1]];
      return (
        odlegloscOdOdcinka(p, def.od, def.do) < promien ||
        (Boolean(def.obustronny) && odlegloscOdOdcinka(p, def.od, odbity) < promien)
      );
    }
    default: {
      const o = obrysProstokatny(def);
      if (!o) return false;
      return (
        p[0] > o.pozycja[0] - tolerancja &&
        p[0] < o.pozycja[0] + o.wymiar[0] + tolerancja &&
        p[1] > o.pozycja[1] - tolerancja &&
        p[1] < o.pozycja[1] + o.wymiar[1] + tolerancja
      );
    }
  }
}

/** Strzałka wskazująca kierunek spadku dachu jednospadowego. */
function strzalkaSpadku(def: Extract<PrymitywDef, { typ: 'dachJednospadowy' }>) {
  const [x, y] = def.pozycja;
  const [dx, dy] = def.wymiar;
  const sx = x + dx / 2;
  const sy = y + dy / 2;
  const dl = Math.min(dx, dy) * 0.3;
  const kier: Record<string, Vec2> = {
    '+x': [1, 0],
    '-x': [-1, 0],
    '+y': [0, 1],
    '-y': [0, -1],
  };
  const [ux, uy] = kier[def.kierunekSpadku];
  const a: Vec2 = [sx - ux * dl, sy - uy * dl];
  const b: Vec2 = [sx + ux * dl, sy + uy * dl];
  const grot = dl * 0.35;
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={1.5} {...KRESKA} />
      <polyline
        points={doPunktow([
          [b[0] - ux * grot - uy * grot * 0.6, b[1] - uy * grot + ux * grot * 0.6],
          b,
          [b[0] - ux * grot + uy * grot * 0.6, b[1] - uy * grot - ux * grot * 0.6],
        ])}
        fill="none"
        strokeWidth={1.5}
        {...KRESKA}
      />
    </g>
  );
}

export type StanKsztaltu = 'zwykly' | 'pod-kursorem' | 'zaznaczony';
export type StatusWytezenia = 'uwaga' | 'przekroczone';

export function KsztaltRzutu({
  def,
  stan,
  wytezenie,
}: {
  def: PrymitywDef;
  stan: StanKsztaltu;
  wytezenie?: StatusWytezenia;
}) {
  const z = stan === 'zaznaczony';
  const pod = stan === 'pod-kursorem';
  // pierwszeństwo: zaznaczenie > wytężenie (uwaga/przekroczone) > stan zwykły
  const barwaWyt = wytezenie === 'przekroczone' ? '#e0645a' : wytezenie === 'uwaga' ? '#e0b04a' : null;
  const obrys = z ? '#e0a75c' : (barwaWyt ?? (pod ? '#b9c3cd' : '#7d8791'));
  const wypelnienie = z
    ? 'rgba(224,167,92,0.28)'
    : wytezenie === 'przekroczone'
      ? 'rgba(224,100,90,0.26)'
      : wytezenie === 'uwaga'
        ? 'rgba(224,176,74,0.24)'
        : pod
          ? 'rgba(185,195,205,0.24)'
          : 'rgba(125,135,145,0.16)';
  const gruboscObrysu = z ? 2.4 : barwaWyt ? 2.2 : pod ? 1.9 : 1.4;

  switch (def.typ) {
    case 'sciana': {
      const szer = def.przekroj?.[1] ?? 0.14;
      const dx = def.do[0] - def.od[0];
      const dy = def.do[1] - def.od[1];
      const L = Math.hypot(dx, dy) || 1;
      const u: Vec2 = [dx / L, dy / L];
      return (
        <g stroke={obrys} strokeWidth={gruboscObrysu}>
          <polygon points={doPunktow(pasWzdluzOsi(def.od, def.do, szer))} fill={wypelnienie} {...KRESKA} />
          {(def.otwory ?? []).map((o, i) => {
            const a: Vec2 = [def.od[0] + u[0] * o.odleglosc, def.od[1] + u[1] * o.odleglosc];
            const b: Vec2 = [
              def.od[0] + u[0] * (o.odleglosc + o.szerokosc),
              def.od[1] + u[1] * (o.odleglosc + o.szerokosc),
            ];
            return (
              <polygon
                key={i}
                points={doPunktow(pasWzdluzOsi(a, b, szer * 1.02))}
                fill="#1c1f24"
                stroke={o.typ === 'drzwi' ? '#e0a75c' : '#9fd0e8'}
                strokeWidth={1.6}
                {...KRESKA}
              />
            );
          })}
        </g>
      );
    }
    case 'belka': {
      const a: Vec2 = [def.od[0], def.od[1]];
      const b: Vec2 = [def.do[0], def.do[1]];
      return (
        <polygon
          points={doPunktow(pasWzdluzOsi(a, b, def.przekroj[0]))}
          fill={wypelnienie}
          stroke={obrys}
          strokeWidth={gruboscObrysu}
          strokeDasharray="6 3"
          {...KRESKA}
        />
      );
    }
    case 'zastrzal': {
      const odbity: Vec2 = [2 * def.od[0] - def.do[0], 2 * def.od[1] - def.do[1]];
      const ramiona: Vec2[] = def.obustronny ? [def.do, odbity] : [def.do];
      const szer = def.przekroj?.[0] ?? 0.08;
      return (
        <g stroke={obrys} fill={wypelnienie}>
          {ramiona.map((koniec, i) => (
            <polygon
              key={i}
              points={doPunktow(pasWzdluzOsi(def.od, koniec, szer))}
              strokeWidth={gruboscObrysu}
              {...KRESKA}
            />
          ))}
          {/* kropka w miejscu styku ze słupem */}
          <circle cx={def.od[0]} cy={def.od[1]} r={szer * 0.9} fill={obrys} stroke="none" />
        </g>
      );
    }
    case 'slup': {
      const o = obrysProstokatny(def)!;
      return (
        <rect
          x={o.pozycja[0]}
          y={o.pozycja[1]}
          width={o.wymiar[0]}
          height={o.wymiar[1]}
          fill={z ? '#e0a75c' : '#9aa3ad'}
          stroke={obrys}
          strokeWidth={gruboscObrysu}
          {...KRESKA}
        />
      );
    }
    case 'podest': {
      const [x, y] = def.pozycja;
      const [dx, dy] = def.wymiar;
      const kier = def.kierunekLegarow ?? 'y';
      const rozstaw = def.rozstawLegarow ?? 0.5;
      const ile = Math.max(1, Math.floor((kier === 'y' ? dx : dy) / rozstaw));
      const legary = Array.from({ length: ile + 1 }, (_, i) => {
        const t = ((kier === 'y' ? dx : dy) * i) / ile;
        return kier === 'y'
          ? { x1: x + t, y1: y, x2: x + t, y2: y + dy }
          : { x1: x, y1: y + t, x2: x + dx, y2: y + t };
      });
      return (
        <g stroke={obrys}>
          <rect x={x} y={y} width={dx} height={dy} fill={wypelnienie} strokeWidth={gruboscObrysu} {...KRESKA} />
          {legary.map((l, i) => (
            <line key={i} {...l} strokeWidth={0.6} opacity={0.5} {...KRESKA} />
          ))}
        </g>
      );
    }
    case 'dachJednospadowy': {
      const [x, y] = def.pozycja;
      const [dx, dy] = def.wymiar;
      return (
        <g stroke={obrys} fill="none">
          <rect
            x={x}
            y={y}
            width={dx}
            height={dy}
            fill={wypelnienie}
            strokeWidth={gruboscObrysu}
            strokeDasharray="8 4"
            {...KRESKA}
          />
          {strzalkaSpadku(def)}
        </g>
      );
    }
    case 'dachDwuspadowy': {
      const [x, y] = def.pozycja;
      const [dx, dy] = def.wymiar;
      const kalenica =
        def.kierunekKalenicy === 'y'
          ? { x1: x + dx / 2, y1: y, x2: x + dx / 2, y2: y + dy }
          : { x1: x, y1: y + dy / 2, x2: x + dx, y2: y + dy / 2 };
      return (
        <g stroke={obrys} fill="none">
          <rect
            x={x}
            y={y}
            width={dx}
            height={dy}
            fill={wypelnienie}
            strokeWidth={gruboscObrysu}
            strokeDasharray="8 4"
            {...KRESKA}
          />
          <line {...kalenica} strokeWidth={2.2} {...KRESKA} />
        </g>
      );
    }
  }
}
