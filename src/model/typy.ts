// Jednostki: metry. Układ osi: X/Y podłoże, Z wysokość.

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export type Kategoria = 'konstrukcja' | 'poszycie';
export type Grupa = 'slupy' | 'belki' | 'podesty' | 'dachy' | 'sciany';

/** Pojedynczy fizyczny element konstrukcji (belka / słupek / deska / płyta). */
export interface Element {
  id: string;
  /** Id prymitywu, z którego element powstał — do zaznaczania w rzucie. */
  zPrymitywu: string;
  nazwa: string;
  grupa: Grupa;
  kategoria: Kategoria;
  /** Oś elementu — dowolna orientacja w przestrzeni. */
  od: Vec3;
  do: Vec3;
  /** [szerokość, wysokość] przekroju w m; wysokość celuje w `gora` (domyślnie pion). */
  przekroj: Vec2;
  /** Wskazówka orientacji: kierunek, w który ma celować wysokość przekroju. */
  gora?: Vec3;
  /**
   * Ścięcie czoła w stopniach, mierzone od płaszczyzny prostopadłej do osi.
   * 0 = czoło proste. Dodatnia wartość wydłuża dolną krawędź elementu.
   */
  scieciePoczatku?: number;
  sciecieKonca?: number;
  /** Id gatunku drewna z katalogu (elementy konstrukcyjne i deski). */
  gatunek?: string;
  /** Id materiału poszycia z katalogu (płyty, blacha, papa). */
  material?: string;
}

/** Pola wspólne wszystkich prymitywów. */
export interface BazaPrymitywu {
  /** Stabilny identyfikator — nadawany przy dodaniu w edytorze. */
  id: string;
  /** Etykieta widoczna w rzucie i na liście, np. "Ściana S-1". */
  etykieta?: string;
  /** Id gatunku drewna z katalogu. */
  gatunek?: string;
}

export interface SlupDef extends BazaPrymitywu {
  typ: 'slup';
  nazwa?: string;
  /** Środek przekroju w rzucie. */
  pozycja: Vec2;
  /** [wymiar wzdłuż X, wymiar wzdłuż Y]. */
  przekroj: Vec2;
  wysokosc: number;
  /** Poziom podstawy (domyślnie 0). */
  z?: number;
}

export interface BelkaDef extends BazaPrymitywu {
  typ: 'belka';
  nazwa?: string;
  od: Vec3;
  do: Vec3;
  przekroj: Vec2;
}

export interface PodestDef extends BazaPrymitywu {
  typ: 'podest';
  /** Narożnik min-X / min-Y. */
  pozycja: Vec2;
  wymiar: Vec2;
  /** Poziom góry desek. */
  wysokosc: number;
  /** Oś legarów (domyślnie 'y'); deski biegną prostopadle. */
  kierunekLegarow?: 'x' | 'y';
  /** Rozstaw nominalny legarów (domyślnie 0.5). */
  rozstawLegarow?: number;
  /** Domyślnie [0.045, 0.145]. */
  przekrojLegara?: Vec2;
  deska?: { szerokosc?: number; grubosc?: number; szczelina?: number };
  /** Gatunek desek tarasowych (odrębny od legarów). */
  gatunekDeski?: string;
  /** Domyślnie "deska tarasowa". */
  nazwaDeski?: string;
}

/**
 * Zastrzał (miecz) usztywniający połączenie słupa z belką. W rzucie rysowany
 * linią od słupa w stronę belki; w przestrzeni biegnie skośnie od punktu na
 * słupie do spodu belki.
 */
export interface ZastrzalDef extends BazaPrymitywu {
  typ: 'zastrzal';
  /** Punkt przy słupie (rzut). */
  od: Vec2;
  /** Punkt przy belce (rzut) — zarazem kierunek i wysięg poziomy. */
  do: Vec2;
  /** Poziom, na którym zastrzał dochodzi do belki. */
  zGora: number;
  /** Zejście po słupie w dół od `zGora`. Domyślnie 0.6. */
  ramiePionowe?: number;
  /** Domyślnie [0.08, 0.12]. */
  przekroj?: Vec2;
  /** Drugi zastrzał po przeciwnej stronie słupa (typowe dla wiat). */
  obustronny?: boolean;
}

export type KierunekSpadku = '+x' | '-x' | '+y' | '-y';

export interface DachJednospadowyDef extends BazaPrymitywu {
  typ: 'dachJednospadowy';
  /** Narożnik obrysu wsparcia (rzut, bez okapu). */
  pozycja: Vec2;
  wymiar: Vec2;
  /** Kąt nachylenia w stopniach. */
  kat: number;
  /** Strona, w którą opada połać (niższa krawędź). */
  kierunekSpadku: KierunekSpadku;
  /** Poziom spodu krokwi nad niską krawędzią obrysu. */
  z: number;
  /** Domyślnie 0.3. */
  okap?: number;
  /** Okap przy górnej krawędzi — 0 dla dachu dostawionego do ściany. Domyślnie = `okap`. */
  okapGora?: number;
  /** Domyślnie 0.6. */
  rozstawKrokwi?: number;
  /** Domyślnie [0.06, 0.16]. */
  przekrojKrokwi?: Vec2;
  /** Id materiału poszycia z katalogu. */
  poszycie?: string;
}

export interface DachDwuspadowyDef extends BazaPrymitywu {
  typ: 'dachDwuspadowy';
  pozycja: Vec2;
  wymiar: Vec2;
  kat: number;
  kierunekKalenicy: 'x' | 'y';
  /** Poziom spodu krokwi na krawędziach okapowych obrysu. */
  z: number;
  okap?: number;
  rozstawKrokwi?: number;
  /** Domyślnie [0.06, 0.18]. */
  przekrojKrokwi?: Vec2;
  poszycie?: string;
  /** Przekrój belki kalenicowej, domyślnie [0.08, 0.18]. */
  przekrojKalenicy?: Vec2;
}

export interface OtworDef {
  typ: 'okno' | 'drzwi';
  /** Odległość początku otworu od początku ściany (wzdłuż od→do). */
  odleglosc: number;
  szerokosc: number;
  wysokosc: number;
  /** Poziom dołu otworu nad bazą ściany (drzwi: 0, okno domyślnie 0.9). */
  parapet?: number;
}

export interface ScianaDef extends BazaPrymitywu {
  typ: 'sciana';
  /** Oś ściany w rzucie. */
  od: Vec2;
  do: Vec2;
  /** Całkowita wysokość (z podwaliną i oczepem). */
  wysokosc: number;
  z?: number;
  /** [grubość elementu wzdłuż ściany, głębokość ściany] — domyślnie [0.06, 0.14]. */
  przekroj?: Vec2;
  /** Domyślnie 0.6. */
  rozstawSlupkow?: number;
  otwory?: OtworDef[];
  /** Id materiału poszycia z katalogu (brak = bez poszycia). */
  poszycie?: string;
  /** Strona poszycia względem kierunku od→do: 1 = lewa (+90°), -1 = prawa. */
  stronaPoszycia?: 1 | -1;
}

export type PrymitywDef =
  | SlupDef
  | BelkaDef
  | ZastrzalDef
  | PodestDef
  | DachJednospadowyDef
  | DachDwuspadowyDef
  | ScianaDef;

export type TypPrymitywu = PrymitywDef['typ'];

export interface Projekt {
  id: string;
  nazwa: string;
  opis?: string;
  prymitywy: PrymitywDef[];
}
