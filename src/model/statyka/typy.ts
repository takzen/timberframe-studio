// Typy warstwy statyki. Orientacyjne sprawdzenie wg PN-EN 1995-1-1.

export type KlasaUzytkowania = 1 | 2 | 3;

/** Czas działania obciążenia — decyduje o k_mod i k_def. */
export type CzasDzialania = 'stale' | 'dlugotrwale' | 'srednie' | 'krotkie' | 'chwilowe';

export interface UstawieniaStatyki {
  /** Strefa śniegowa PL 1–5. */
  strefaSniegu: number;
  /** Charakterystyczne obciążenie śniegiem gruntu s_k [kN/m²]. */
  sniegSk: number;
  /** Klasa użytkowania konstrukcji (wilgotność środowiska). */
  klasaUzytkowania: KlasaUzytkowania;
  /** Obciążenie użytkowe stropów/podestów q_k [kN/m²]. */
  obciazenieUzytkowe: number;
}

export type Status = 'ok' | 'uwaga' | 'przekroczone';

/** Wynik pojedynczego sprawdzenia (wykorzystanie = efekt / nośność). */
export interface Sprawdzenie {
  nazwa: string;
  wykorzystanie: number;
}

export interface WynikElementu {
  /** Id elementu (przed grupowaniem) — do kolorowania rysunku i wizualizacji. */
  id?: string;
  /** Reprezentatywny opis, np. "krokiew 60×160". */
  opis: string;
  nazwa: string;
  przekrojMm: string;
  gatunek: string;
  rozpietosc: number;
  /** Liczba elementów tego typu (najgorszy przypadek reprezentuje grupę). */
  sztuk: number;
  sprawdzenia: Sprawdzenie[];
  /** Największe wykorzystanie ze wszystkich sprawdzeń. */
  maksWykorzystanie: number;
  /** Sprawdzenie, które decyduje (zginanie / ścinanie / ugięcie). */
  miarodajne: string;
  status: Status;
  /** Krótka nota o obciążeniu, np. "śnieg strefa 3 · C24". */
  opisObciazenia: string;
}
