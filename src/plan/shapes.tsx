import type { PrimitiveDef, Vec2 } from '../model/types';
import { bandAlongAxis, distToSegment, toPoints } from './geometry';

const STROKE = { vectorEffect: 'non-scaling-stroke' as const };

/** Rectangular outline of a primitive: [position, size], or null for line members. */
export function rectOutline(def: PrimitiveDef): { position: Vec2; size: Vec2 } | null {
  switch (def.type) {
    case 'deck':
    case 'monoPitchRoof':
    case 'gableRoof':
    case 'slab':
      return { position: def.position, size: def.size };
    case 'post':
      return {
        position: [def.position[0] - def.section[0] / 2, def.position[1] - def.section[1] / 2],
        size: def.section,
      };
    default:
      return null;
  }
}

/** Point where the primitive label is drawn. */
export function primitiveCenter(def: PrimitiveDef): Vec2 {
  const o = rectOutline(def);
  if (o) return [o.position[0] + o.size[0] / 2, o.position[1] + o.size[1] / 2];
  if (def.type === 'wall' || def.type === 'brace')
    return [(def.from[0] + def.to[0]) / 2, (def.from[1] + def.to[1]) / 2];
  if (def.type === 'beam') return [(def.from[0] + def.to[0]) / 2, (def.from[1] + def.to[1]) / 2];
  return [0, 0];
}

/** Outline area — smaller elements take priority when hit-testing. */
export function hitArea(def: PrimitiveDef): number {
  const o = rectOutline(def);
  return o ? o.size[0] * o.size[1] : 0;
}

export function hitTest(def: PrimitiveDef, p: Vec2, tolerance: number): boolean {
  switch (def.type) {
    case 'wall':
      return distToSegment(p, def.from, def.to) < (def.section?.[1] ?? 0.14) / 2 + tolerance;
    case 'beam':
      return (
        distToSegment(p, [def.from[0], def.from[1]], [def.to[0], def.to[1]]) <
        def.section[0] / 2 + tolerance
      );
    case 'brace': {
      const radius = (def.section?.[0] ?? 0.08) / 2 + tolerance;
      const mirrored: Vec2 = [2 * def.from[0] - def.to[0], 2 * def.from[1] - def.to[1]];
      return (
        distToSegment(p, def.from, def.to) < radius ||
        (Boolean(def.bothSides) && distToSegment(p, def.from, mirrored) < radius)
      );
    }
    default: {
      const o = rectOutline(def);
      if (!o) return false;
      return (
        p[0] > o.position[0] - tolerance &&
        p[0] < o.position[0] + o.size[0] + tolerance &&
        p[1] > o.position[1] - tolerance &&
        p[1] < o.position[1] + o.size[1] + tolerance
      );
    }
  }
}

/** Arrow showing the slope direction of a mono-pitch roof. */
function slopeArrow(def: Extract<PrimitiveDef, { type: 'monoPitchRoof' }>) {
  const [x, y] = def.position;
  const [dx, dy] = def.size;
  const sx = x + dx / 2;
  const sy = y + dy / 2;
  const len = Math.min(dx, dy) * 0.3;
  const dirs: Record<string, Vec2> = { '+x': [1, 0], '-x': [-1, 0], '+y': [0, 1], '-y': [0, -1] };
  const [ux, uy] = dirs[def.slopeDirection];
  const a: Vec2 = [sx - ux * len, sy - uy * len];
  const b: Vec2 = [sx + ux * len, sy + uy * len];
  const head = len * 0.35;
  return (
    <g>
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={1.5} {...STROKE} />
      <polyline
        points={toPoints([
          [b[0] - ux * head - uy * head * 0.6, b[1] - uy * head + ux * head * 0.6],
          b,
          [b[0] - ux * head + uy * head * 0.6, b[1] - uy * head - ux * head * 0.6],
        ])}
        fill="none"
        strokeWidth={1.5}
        {...STROKE}
      />
    </g>
  );
}

export type ShapeState = 'normal' | 'hover' | 'selected';
export type UtilStatus = 'warn' | 'over';

export function PlanShape({
  def,
  state,
  util,
}: {
  def: PrimitiveDef;
  state: ShapeState;
  util?: UtilStatus;
}) {
  const sel = state === 'selected';
  const hover = state === 'hover';
  // priority: selection > utilisation (warn/over) > normal state
  const utilStroke = util === 'over' ? '#e0645a' : util === 'warn' ? '#e0b04a' : null;
  const stroke = sel ? '#e0a75c' : (utilStroke ?? (hover ? '#b9c3cd' : '#7d8791'));
  const fill = sel
    ? 'rgba(224,167,92,0.28)'
    : util === 'over'
      ? 'rgba(224,100,90,0.26)'
      : util === 'warn'
        ? 'rgba(224,176,74,0.24)'
        : hover
          ? 'rgba(185,195,205,0.24)'
          : 'rgba(125,135,145,0.16)';
  const width = sel ? 2.4 : utilStroke ? 2.2 : hover ? 1.9 : 1.4;

  switch (def.type) {
    case 'wall': {
      const th = def.section?.[1] ?? 0.14;
      const dx = def.to[0] - def.from[0];
      const dy = def.to[1] - def.from[1];
      const L = Math.hypot(dx, dy) || 1;
      const u: Vec2 = [dx / L, dy / L];
      return (
        <g stroke={stroke} strokeWidth={width}>
          <polygon points={toPoints(bandAlongAxis(def.from, def.to, th))} fill={fill} {...STROKE} />
          {(def.openings ?? []).map((o, i) => {
            const a: Vec2 = [def.from[0] + u[0] * o.offset, def.from[1] + u[1] * o.offset];
            const b: Vec2 = [
              def.from[0] + u[0] * (o.offset + o.width),
              def.from[1] + u[1] * (o.offset + o.width),
            ];
            return (
              <polygon
                key={i}
                points={toPoints(bandAlongAxis(a, b, th * 1.02))}
                fill="#1c1f24"
                stroke={o.type === 'door' ? '#e0a75c' : '#9fd0e8'}
                strokeWidth={1.6}
                {...STROKE}
              />
            );
          })}
        </g>
      );
    }
    case 'beam': {
      const a: Vec2 = [def.from[0], def.from[1]];
      const b: Vec2 = [def.to[0], def.to[1]];
      return (
        <polygon
          points={toPoints(bandAlongAxis(a, b, def.section[0]))}
          fill={fill}
          stroke={stroke}
          strokeWidth={width}
          strokeDasharray="6 3"
          {...STROKE}
        />
      );
    }
    case 'brace': {
      const mirrored: Vec2 = [2 * def.from[0] - def.to[0], 2 * def.from[1] - def.to[1]];
      const arms: Vec2[] = def.bothSides ? [def.to, mirrored] : [def.to];
      const w = def.section?.[0] ?? 0.08;
      return (
        <g stroke={stroke} fill={fill}>
          {arms.map((end, i) => (
            <polygon key={i} points={toPoints(bandAlongAxis(def.from, end, w))} strokeWidth={width} {...STROKE} />
          ))}
          <circle cx={def.from[0]} cy={def.from[1]} r={w * 0.9} fill={stroke} stroke="none" />
        </g>
      );
    }
    case 'post': {
      const o = rectOutline(def)!;
      return (
        <rect
          x={o.position[0]}
          y={o.position[1]}
          width={o.size[0]}
          height={o.size[1]}
          fill={sel ? '#e0a75c' : (utilStroke ?? '#9aa3ad')}
          stroke={stroke}
          strokeWidth={width}
          {...STROKE}
        />
      );
    }
    case 'deck': {
      const [x, y] = def.position;
      const [dx, dy] = def.size;
      const dir = def.joistDirection ?? 'y';
      const spacing = def.joistSpacing ?? 0.5;
      const count = Math.max(1, Math.floor((dir === 'y' ? dx : dy) / spacing));
      const joists = Array.from({ length: count + 1 }, (_, i) => {
        const t = ((dir === 'y' ? dx : dy) * i) / count;
        return dir === 'y'
          ? { x1: x + t, y1: y, x2: x + t, y2: y + dy }
          : { x1: x, y1: y + t, x2: x + dx, y2: y + t };
      });
      return (
        <g stroke={stroke}>
          <rect x={x} y={y} width={dx} height={dy} fill={fill} strokeWidth={width} {...STROKE} />
          {joists.map((l, i) => (
            <line key={i} {...l} strokeWidth={0.6} opacity={0.5} {...STROKE} />
          ))}
        </g>
      );
    }
    case 'monoPitchRoof': {
      const [x, y] = def.position;
      const [dx, dy] = def.size;
      return (
        <g stroke={stroke} fill="none">
          <rect x={x} y={y} width={dx} height={dy} fill={fill} strokeWidth={width} strokeDasharray="8 4" {...STROKE} />
          {slopeArrow(def)}
        </g>
      );
    }
    case 'gableRoof': {
      const [x, y] = def.position;
      const [dx, dy] = def.size;
      const ridge =
        def.ridgeDirection === 'y'
          ? { x1: x + dx / 2, y1: y, x2: x + dx / 2, y2: y + dy }
          : { x1: x, y1: y + dy / 2, x2: x + dx, y2: y + dy / 2 };
      return (
        <g stroke={stroke} fill="none">
          <rect x={x} y={y} width={dx} height={dy} fill={fill} strokeWidth={width} strokeDasharray="8 4" {...STROKE} />
          <line {...ridge} strokeWidth={2.2} {...STROKE} />
        </g>
      );
    }
    case 'slab': {
      const [x, y] = def.position;
      const [dx, dy] = def.size;
      const color = sel ? stroke : (utilStroke ?? '#8f9296');
      return (
        <rect
          x={x}
          y={y}
          width={dx}
          height={dy}
          fill={sel ? fill : 'rgba(140,144,150,0.20)'}
          stroke={color}
          strokeWidth={width}
          {...STROKE}
        />
      );
    }
  }
}
