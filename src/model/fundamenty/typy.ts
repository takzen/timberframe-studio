// Orientacyjny dobór fundamentów: stopy pod słupy i płyta fundamentowa.
// Kryterium: nacisk na grunt ≤ nośność gruntu. Bez EC7/EC2 (zbrojenie, przebicie).

import type { Status } from '../statyka/typy';
import type { Element, Vec2 } from '../typy';

export interface UstawieniaFundamentow {
  /** Dopuszczalna nośność gruntu (nacisk) [kPa]. */
  nosnoscGruntu: number;
  /** Id klasy betonu z katalogu. */
  klasaBetonu: string;
  /** Głębokość posadowienia (przemarzania) [m]. */
  glebokoscPrzemarzania: number;
  /** Minimalny bok stopy [m]. */
  minStopa: number;
  /** Grubość bryły stopy [m]. */
  gruboscStopy: number;
}

export interface WynikStopy {
  idSlupa: string;
  punkt: Vec2;
  /** Bok kwadratowej stopy [m]. */
  bok: number;
  grubosc: number;
  /** Siła osiowa obliczeniowa [kN]. */
  Nd: number;
  /** Nacisk na grunt [kPa]. */
  naprezenie: number;
  wykorzystanie: number;
  status: Status;
  objetosc: number;
  koszt: number;
}

export interface WynikPlyty {
  idPrymitywu: string;
  pole: number;
  grubosc: number;
  objetosc: number;
  naprezenie: number;
  wykorzystanie: number;
  status: Status;
  koszt: number;
}

export interface AnalizaFundamentow {
  stopy: WynikStopy[];
  plyty: WynikPlyty[];
  /** Bryły stóp do wyrenderowania (płyty pochodzą z prymitywów). */
  elementyStop: Element[];
  objetoscBetonu: number;
  koszt: number;
}
