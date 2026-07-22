import type { ReactNode } from 'react';

export function Pole({ etykieta, children }: { etykieta: string; children: ReactNode }) {
  return (
    <label className="pole">
      <span>{etykieta}</span>
      {children}
    </label>
  );
}

export function PoleLiczba({
  etykieta,
  wartosc,
  onZmiana,
  krok = 0.05,
  min,
  max,
  jednostka = 'm',
}: {
  etykieta: string;
  wartosc: number;
  onZmiana: (v: number) => void;
  krok?: number;
  min?: number;
  max?: number;
  jednostka?: string;
}) {
  return (
    <Pole etykieta={`${etykieta}${jednostka ? ` [${jednostka}]` : ''}`}>
      <input
        type="number"
        value={Number(wartosc.toFixed(4))}
        step={krok}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onZmiana(v);
        }}
      />
    </Pole>
  );
}

export function PoleWybor<T extends string>({
  etykieta,
  wartosc,
  opcje,
  onZmiana,
}: {
  etykieta: string;
  wartosc: T;
  opcje: { wartosc: T; etykieta: string }[];
  onZmiana: (v: T) => void;
}) {
  return (
    <Pole etykieta={etykieta}>
      <select value={wartosc} onChange={(e) => onZmiana(e.target.value as T)}>
        {opcje.map((o) => (
          <option key={o.wartosc} value={o.wartosc}>
            {o.etykieta}
          </option>
        ))}
      </select>
    </Pole>
  );
}

export function PolePtaszek({
  etykieta,
  wartosc,
  onZmiana,
}: {
  etykieta: string;
  wartosc: boolean;
  onZmiana: (v: boolean) => void;
}) {
  return (
    <label className="ptaszek w-polach">
      <input type="checkbox" checked={wartosc} onChange={(e) => onZmiana(e.target.checked)} />
      {etykieta}
    </label>
  );
}

export function PoleOdczyt({ etykieta, wartosc }: { etykieta: string; wartosc: string }) {
  return (
    <Pole etykieta={etykieta}>
      <output>{wartosc}</output>
    </Pole>
  );
}
