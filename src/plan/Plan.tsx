import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { typeInfo } from '../model/defaults';
import type { FootingResult } from '../model/foundations/types';
import type { Status } from '../model/structural/types';
import type { PrimitiveDef, Vec2 } from '../model/types';
import { useStore } from '../store';
import { useT } from '../useT';
import {
  anchor,
  handles,
  moveBy,
  moveHandle,
  smartSnap,
  snapPoints,
} from './editing';
import {
  dist,
  groupTransform,
  rectFromPoints,
  snapToGrid,
  toScreen,
  toWorld,
  type Size,
  type View,
} from './geometry';
import { hitArea, hitTest, PlanShape, primitiveCenter } from './shapes';

const SCALE_MIN = 8;
const SCALE_MAX = 400;
/** Pointer movement above this many pixels counts as a drag, not a click. */
const DRAG_THRESHOLD = 4;
/** Handle-grab and geometry-snap radius, in pixels. */
const HANDLE_RADIUS = 9;
const SNAP_RADIUS = 12;

const FOOTING_COLOR: Record<Status, string> = { ok: '#8f9296', warn: '#e0b04a', over: '#e0645a' };

type Action =
  | { kind: 'pan'; cxStart: number; cyStart: number }
  | { kind: 'move'; original: PrimitiveDef; worldStart: Vec2 }
  | { kind: 'handle'; original: PrimitiveDef; handle: string }
  | { kind: 'draw'; start: Vec2 };

interface Pointer {
  screenX: number;
  screenY: number;
  action: Action;
  moved: boolean;
}

export function Plan({
  util,
  footings,
}: {
  util: Map<string, Status> | null;
  footings: FootingResult[];
}) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ w: 800, h: 600 });
  const [view, setView] = useState<View>({ cx: 3, cy: 3, scale: 55 });
  const [start, setStart] = useState<Vec2 | null>(null);
  const [cursor, setCursor] = useState<Vec2 | null>(null);
  const [snapped, setSnapped] = useState(false);
  const [overElement, setOverElement] = useState<string | null>(null);
  const pointer = useRef<Pointer | null>(null);

  const primitives = useStore((s) => s.primitives);
  const selected = useStore((s) => s.selected);
  const tool = useStore((s) => s.tool);
  const gridStep = useStore((s) => s.gridStep);
  const showGrid = useStore((s) => s.showGrid);
  const add = useStore((s) => s.add);
  const select = useStore((s) => s.select);
  const remove = useStore((s) => s.remove);
  const updateLive = useStore((s) => s.updateLive);
  const commit = useStore((s) => s.commit);
  const setTool = useStore((s) => s.setTool);

  const selectedDef = useMemo(
    () => primitives.find((p) => p.id === selected),
    [primitives, selected],
  );

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const worldFromEvent = useCallback(
    (e: { clientX: number; clientY: number }): Vec2 => {
      const r = box.current!.getBoundingClientRect();
      return toWorld([e.clientX - r.left, e.clientY - r.top], view, size);
    },
    [view, size],
  );

  const hitAt = useCallback(
    (p: Vec2): PrimitiveDef | undefined => {
      const tol = 6 / view.scale;
      return primitives
        .filter((def) => hitTest(def, p, tol))
        .sort((a, b) => hitArea(a) - hitArea(b))[0];
    },
    [primitives, view.scale],
  );

  const handleAt = useCallback(
    (p: Vec2): string | null => {
      if (!selectedDef) return null;
      const radius = HANDLE_RADIUS / view.scale;
      for (const h of handles(selectedDef)) if (dist(h.point, p) < radius) return h.id;
      return null;
    },
    [selectedDef, view.scale],
  );

  const anchors = useCallback((skipId?: string) => snapPoints(primitives, skipId), [primitives]);

  const snap = useCallback(
    (p: Vec2, skipId?: string) => smartSnap(p, anchors(skipId), gridStep, SNAP_RADIUS, view.scale),
    [anchors, gridStep, view.scale],
  );

  const cancel = useCallback(() => {
    setStart(null);
    setTool('select');
  }, [setTool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, select, textarea')) return;
      if (e.key === 'Escape') cancel();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        remove(selected);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cancel, remove, selected]);

  useEffect(() => setStart(null), [tool]);

  const zoom = (e: React.WheelEvent) => {
    const before = worldFromEvent(e);
    const scale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, view.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    const r = box.current!.getBoundingClientRect();
    const after = toWorld([e.clientX - r.left, e.clientY - r.top], { ...view, scale }, size);
    setView({ scale, cx: view.cx + (before[0] - after[0]), cy: view.cy + (before[1] - after[1]) });
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const r = box.current!.getBoundingClientRect();
    const world = worldFromEvent(e);
    const screenX = e.clientX - r.left;
    const screenY = e.clientY - r.top;

    let action: Action;
    if (tool !== 'select') {
      action = { kind: 'draw', start: snap(world).point };
    } else {
      const handle = e.button === 0 ? handleAt(world) : null;
      const hit = e.button === 0 && !handle ? hitAt(world) : undefined;
      if (handle && selectedDef) {
        action = { kind: 'handle', original: selectedDef, handle };
      } else if (hit) {
        if (hit.id !== selected) select(hit.id);
        action = { kind: 'move', original: hit, worldStart: world };
      } else {
        action = { kind: 'pan', cxStart: view.cx, cyStart: view.cy };
      }
    }
    pointer.current = { screenX, screenY, action, moved: false };
  };

  const onMove = (e: React.PointerEvent) => {
    const world = worldFromEvent(e);
    const pt = pointer.current;

    if (!pt) {
      setCursor(snapToGrid(world, gridStep));
      setOverElement(tool === 'select' ? (hitAt(world)?.id ?? null) : null);
      return;
    }

    const r = box.current!.getBoundingClientRect();
    const dx = e.clientX - r.left - pt.screenX;
    const dy = e.clientY - r.top - pt.screenY;
    if (!pt.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) pt.moved = true;
    if (!pt.moved) return;

    switch (pt.action.kind) {
      case 'pan': {
        const { cxStart, cyStart } = pt.action;
        setView((v) => ({ ...v, cx: cxStart - dx / v.scale, cy: cyStart + dy / v.scale }));
        break;
      }
      case 'move': {
        const { original, worldStart } = pt.action;
        const a0 = anchor(original);
        const target: Vec2 = [a0[0] + (world[0] - worldStart[0]), a0[1] + (world[1] - worldStart[1])];
        const { point, snapped: s } = snap(target, original.id);
        setSnapped(s);
        setCursor(point);
        updateLive(original.id, moveBy(original, point[0] - a0[0], point[1] - a0[1]));
        break;
      }
      case 'handle': {
        const { original, handle } = pt.action;
        const { point, snapped: s } = snap(world, original.id);
        setSnapped(s);
        setCursor(point);
        const changes = moveHandle(original, handle, point);
        if (changes) updateLive(original.id, changes);
        break;
      }
      case 'draw':
        setCursor(snap(world).point);
        break;
    }
  };

  const onUp = (e: React.PointerEvent) => {
    const pt = pointer.current;
    pointer.current = null;
    setSnapped(false);
    if (!pt) return;

    const { point: end } = snap(worldFromEvent(e));

    if (pt.action.kind === 'move' || pt.action.kind === 'handle') {
      if (pt.moved) commit();
      return;
    }
    if (pt.action.kind === 'pan') {
      if (!pt.moved) select(null);
      return;
    }
    if (pt.action.kind !== 'draw' || tool === 'select') return;

    const { draw } = typeInfo(tool);
    if (draw === 'point') {
      add(tool, end, end);
      return;
    }
    if (start) {
      if (dist(start, end) > 1e-6) add(tool, start, end);
      setStart(null);
    } else if (dist(pt.action.start, end) > 0.2) {
      add(tool, pt.action.start, end); // drag
    } else {
      setStart(pt.action.start);
    }
  };

  const viewBounds = (step: number) => {
    const halfW = size.w / 2 / view.scale;
    const halfH = size.h / 2 / view.scale;
    return {
      x0: Math.floor((view.cx - halfW) / step) * step,
      x1: Math.ceil((view.cx + halfW) / step) * step,
      y0: Math.floor((view.cy - halfH) / step) * step,
      y1: Math.ceil((view.cy + halfH) / step) * step,
    };
  };

  const gridLines = () => {
    if (!showGrid) return null;
    const step = view.scale < 20 ? 5 : 1;
    const { x0, x1, y0, y1 } = viewBounds(step);
    const color = (v: number) => (v === 0 ? '#6f7f6a' : Math.abs(v % 5) < 1e-9 ? '#3c434b' : '#2b3037');
    const w = (v: number) => (v === 0 || Math.abs(v % 5) < 1e-9 ? 1.2 : 0.8);
    const lines = [];
    for (let x = x0; x <= x1; x += step)
      lines.push(<line key={`x${x}`} x1={x} y1={y0} x2={x} y2={y1} stroke={color(x)} strokeWidth={w(x)} vectorEffect="non-scaling-stroke" />);
    for (let y = y0; y <= y1; y += step)
      lines.push(<line key={`y${y}`} x1={x0} y1={y} x2={x1} y2={y} stroke={color(y)} strokeWidth={w(y)} vectorEffect="non-scaling-stroke" />);
    return lines;
  };

  const preview = () => {
    if (tool === 'select' || !cursor) return null;
    const { draw } = typeInfo(tool);
    if (draw === 'point') return <circle cx={cursor[0]} cy={cursor[1]} r={0.09} fill="#e0a75c" />;
    if (!start) return null;
    if (draw === 'line')
      return <line x1={start[0]} y1={start[1]} x2={cursor[0]} y2={cursor[1]} stroke="#e0a75c" strokeWidth={2.5} strokeDasharray="8 4" vectorEffect="non-scaling-stroke" />;
    const r = rectFromPoints(start, cursor);
    return <rect x={r.position[0]} y={r.position[1]} width={r.size[0]} height={r.size[1]} fill="rgba(224,167,92,0.2)" stroke="#e0a75c" strokeWidth={2.5} strokeDasharray="8 4" vectorEffect="non-scaling-stroke" />;
  };

  /** Origin (0,0) — the reference frame of the whole project. */
  const origin = () => {
    const [ex, ey] = toScreen([0, 0], view, size);
    if (ex < -80 || ex > size.w + 80 || ey < -80 || ey > size.h + 80) return null;
    const r = 26;
    return (
      <g className="origin" pointerEvents="none">
        <line x1={ex} y1={ey} x2={ex + r} y2={ey} className="axis axis-x" />
        <line x1={ex} y1={ey} x2={ex} y2={ey - r} className="axis axis-y" />
        <polygon points={`${ex + r},${ey} ${ex + r - 6},${ey - 3.5} ${ex + r - 6},${ey + 3.5}`} className="head axis-x" />
        <polygon points={`${ex},${ey - r} ${ex - 3.5},${ey - r + 6} ${ex + 3.5},${ey - r + 6}`} className="head axis-y" />
        <circle cx={ex} cy={ey} r={5.5} className="eye" />
        <circle cx={ex} cy={ey} r={1.8} className="dot" />
        <text x={ex + r + 5} y={ey + 4} className="axis-label axis-x">X</text>
        <text x={ex + 5} y={ey - r - 3} className="axis-label axis-y">Y</text>
        <text x={ex - 7} y={ey + 16} className="axis-label zero">0,0</text>
      </g>
    );
  };

  const ruler = () => {
    const step = view.scale >= 45 ? 1 : view.scale >= 18 ? 5 : 10;
    const { x0, x1, y0, y1 } = viewBounds(step);
    const marks = [];
    for (let x = x0; x <= x1 + 1e-9; x += step) {
      const [ex] = toScreen([x, 0], view, size);
      if (ex < 20 || ex > size.w - 10) continue;
      marks.push(<text key={`px${x}`} x={ex} y={size.h - 7} className="ruler horizontal">{Math.round(x * 100) / 100}</text>);
    }
    for (let y = y0; y <= y1 + 1e-9; y += step) {
      const [, ey] = toScreen([0, y], view, size);
      if (ey < 12 || ey > size.h - 22) continue;
      marks.push(<text key={`py${y}`} x={5} y={ey + 3.5} className="ruler">{Math.round(y * 100) / 100}</text>);
    }
    return marks;
  };

  const toOrigin = () => setView((v) => ({ ...v, cx: 0, cy: 0 }));

  const fitAll = () => {
    const pts = snapPoints(primitives);
    if (pts.length === 0) return setView({ cx: 0, cy: 0, scale: 55 });
    const xs = [0, ...pts.map((p) => p[0])];
    const ys = [0, ...pts.map((p) => p[1])];
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const margin = 1.5;
    const scale = Math.min(size.w / Math.max(maxX - minX + margin * 2, 1), size.h / Math.max(maxY - minY + margin * 2, 1));
    setView({ cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale: Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale)) });
  };

  const handleSquares = () => {
    if (!selectedDef || tool !== 'select') return null;
    return handles(selectedDef).map((h) => {
      const [ex, ey] = toScreen(h.point, view, size);
      return <rect key={h.id} x={ex - 4} y={ey - 4} width={8} height={8} className="handle" pointerEvents="none" />;
    });
  };

  const dragNote = () => {
    if (tool !== 'select' || !cursor) return null;
    const pt = pointer.current;
    if (!pt?.moved || (pt.action.kind !== 'move' && pt.action.kind !== 'handle')) return null;
    const [ex, ey] = toScreen(cursor, view, size);
    return (
      <text x={ex + 14} y={ey - 12} className="preview-dim">
        {`${cursor[0].toFixed(2)} ; ${cursor[1].toFixed(2)}`}
        {snapped ? ' ⌖' : ''}
      </text>
    );
  };

  const previewDim = () => {
    if (!start || !cursor || tool === 'select') return null;
    const { draw } = typeInfo(tool);
    const r = rectFromPoints(start, cursor);
    const text = draw === 'line' ? `${dist(start, cursor).toFixed(2)} m` : `${r.size[0].toFixed(2)} × ${r.size[1].toFixed(2)} m`;
    const [ex, ey] = toScreen(cursor, view, size);
    return <text x={ex + 14} y={ey - 12} className="preview-dim">{text}</text>;
  };

  const cssCursor = (() => {
    if (tool !== 'select') return 'crosshair';
    const pt = pointer.current;
    if (pt?.moved && pt.action.kind !== 'pan') return 'grabbing';
    if (cursor && handleAt(cursor)) return 'nwse-resize';
    return overElement ? 'move' : 'default';
  })();

  return (
    <div className="plan" ref={box}>
      <svg
        width={size.w}
        height={size.h}
        style={{ cursor: cssCursor, touchAction: 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => {
          setCursor(null);
          setOverElement(null);
        }}
        onWheel={zoom}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={groupTransform(view, size)}>
          {gridLines()}
          {footings.map((s) => (
            <rect
              key={`footing-${s.postId}`}
              x={s.point[0] - s.side / 2}
              y={s.point[1] - s.side / 2}
              width={s.side}
              height={s.side}
              fill="rgba(140,144,150,0.22)"
              stroke={FOOTING_COLOR[s.status]}
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {primitives.map((def) => {
            const st = util?.get(def.id);
            return (
              <PlanShape
                key={def.id}
                def={def}
                state={def.id === selected ? 'selected' : def.id === overElement ? 'hover' : 'normal'}
                util={st === 'warn' || st === 'over' ? st : undefined}
              />
            );
          })}
          {preview()}
        </g>

        {(() => {
          const taken = new Map<string, number>();
          return primitives.map((def) => {
            const [ex, ey] = toScreen(primitiveCenter(def), view, size);
            const k = `${Math.round(ex / 40)}:${Math.round(ey / 14)}`;
            const nr = taken.get(k) ?? 0;
            taken.set(k, nr + 1);
            const name = `${t(typeInfo(def.type).labelKey)} ${def.label ?? ''}`.trim();
            return (
              <text key={def.id} x={ex} y={ey + nr * 13} className={`plan-label${def.id === selected ? ' selected' : ''}`}>
                {name}
              </text>
            );
          });
        })()}
        {origin()}
        {ruler()}
        {handleSquares()}
        {previewDim()}
        {dragNote()}
      </svg>

      <div className="plan-tools">
        <button onClick={toOrigin} title={t('plan.fitToOrigin')}>⌖ 0,0</button>
        <button onClick={fitAll} title={t('plan.fitAll')}>{t('plan.fit')}</button>
      </div>

      <div className="plan-info">
        {cursor ? `X ${cursor[0].toFixed(2)} · Y ${cursor[1].toFixed(2)} m` : '—'}
        <span>{Math.round(view.scale)} px/m</span>
      </div>

      {tool !== 'select' ? (
        <div className="plan-hint">
          {typeInfo(tool).draw === 'point'
            ? t('plan.hintPoint')
            : start
              ? t('plan.hintSecond')
              : t('plan.hintFirst')}
        </div>
      ) : (
        selectedDef && <div className="plan-hint quiet">{t('plan.hintSelected')}</div>
      )}
    </div>
  );
}
