import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nowyPrymityw, opisTypu } from './model/domyslne';
import { znajdzStrefe } from './model/statyka/obciazenia';
import type { KlasaUzytkowania, UstawieniaStatyki } from './model/statyka/typy';
import type { Grupa, PrymitywDef, TypPrymitywu, Vec2 } from './model/typy';

export type TrybWidoku = 'pelny' | 'konstrukcja';
export type Narzedzie = 'wybor' | TypPrymitywu;

export const GRUPY: { id: Grupa; etykieta: string }[] = [
  { id: 'slupy', etykieta: 'Słupy' },
  { id: 'belki', etykieta: 'Belki' },
  { id: 'podesty', etykieta: 'Podesty / tarasy' },
  { id: 'sciany', etykieta: 'Ściany' },
  { id: 'dachy', etykieta: 'Dachy' },
];

const MAKS_HISTORII = 60;
const noweId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

interface Stan {
  nazwa: string;
  prymitywy: PrymitywDef[];
  zaznaczony: string | null;
  narzedzie: Narzedzie;
  /** Wysokość robocza — baza dla nowych belek i dachów. */
  poziomRoboczy: number;
  /** Skok przyciągania w rzucie, w metrach. */
  skokSiatki: number;
  trybWidoku: TrybWidoku;
  widoczneGrupy: Record<Grupa, boolean>;
  pokazSiatke: boolean;
  /** Koloruje przeciążone elementy na rysunku i w 3D. */
  pokazWytezenie: boolean;

  /** Ustawienia orientacyjnej analizy statycznej. */
  statyka: UstawieniaStatyki;

  historia: PrymitywDef[][];
  indeksHistorii: number;

  dodaj: (typ: TypPrymitywu, a: Vec2, b: Vec2) => void;
  aktualizuj: (id: string, zmiany: Partial<PrymitywDef>) => void;
  /** Podgląd zmiany w trakcie przeciągania — nie zaśmieca historii. */
  aktualizujNaZywo: (id: string, zmiany: Partial<PrymitywDef>) => void;
  /** Zamyka przeciąganie jednym wpisem w historii. */
  zatwierdz: () => void;
  usun: (id: string) => void;
  zaznacz: (id: string | null) => void;
  ustawNarzedzie: (n: Narzedzie) => void;
  ustawPoziom: (z: number) => void;
  ustawSkok: (s: number) => void;
  ustawTryb: (t: TrybWidoku) => void;
  przelaczGrupe: (g: Grupa) => void;
  przelaczSiatke: () => void;
  przelaczWytezenie: () => void;
  ustawStrefeSniegu: (strefa: number) => void;
  ustawSniegSk: (sk: number) => void;
  ustawKlaseUzytkowania: (k: KlasaUzytkowania) => void;
  ustawObciazenieUzytkowe: (q: number) => void;
  cofnij: () => void;
  ponow: () => void;
  wczytaj: (nazwa: string, prymitywy: PrymitywDef[]) => void;
  ustawNazwe: (nazwa: string) => void;
  nowy: () => void;
}

export const useStore = create<Stan>()(
  persist(
    (set, get) => {
      /** Zapisuje nowy stan prymitywów wraz z wpisem w historii. */
      const zHistoria = (prymitywy: PrymitywDef[], reszta: Partial<Stan> = {}) => {
        const { historia, indeksHistorii } = get();
        const przycieta = historia.slice(0, indeksHistorii + 1);
        przycieta.push(prymitywy);
        const nadmiar = Math.max(0, przycieta.length - MAKS_HISTORII);
        set({
          prymitywy,
          historia: przycieta.slice(nadmiar),
          indeksHistorii: przycieta.length - nadmiar - 1,
          ...reszta,
        });
      };

      return {
        nazwa: 'Nowy projekt',
        prymitywy: [],
        zaznaczony: null,
        narzedzie: 'wybor',
        poziomRoboczy: 2.6,
        skokSiatki: 0.1,
        trybWidoku: 'pelny',
        widoczneGrupy: { slupy: true, belki: true, podesty: true, dachy: true, sciany: true },
        pokazSiatke: true,
        pokazWytezenie: true,
        statyka: { strefaSniegu: 2, sniegSk: 0.9, klasaUzytkowania: 2, obciazenieUzytkowe: 2.0 },
        historia: [[]],
        indeksHistorii: 0,

        dodaj: (typ, a, b) => {
          const { prymitywy, poziomRoboczy } = get();
          const { prefiks, etykieta } = opisTypu(typ);
          const uzyte = prymitywy.filter((p) => opisTypu(p.typ).prefiks === prefiks).length;
          const id = noweId();
          const def = nowyPrymityw(
            typ,
            id,
            `${etykieta} ${prefiks}-${uzyte + 1}`,
            a,
            b,
            poziomRoboczy,
          );
          zHistoria([...prymitywy, def], { zaznaczony: id, narzedzie: 'wybor' });
        },

        aktualizuj: (id, zmiany) => {
          const prymitywy = get().prymitywy.map((p) =>
            p.id === id ? ({ ...p, ...zmiany } as PrymitywDef) : p,
          );
          zHistoria(prymitywy);
        },

        aktualizujNaZywo: (id, zmiany) =>
          set({
            prymitywy: get().prymitywy.map((p) =>
              p.id === id ? ({ ...p, ...zmiany } as PrymitywDef) : p,
            ),
          }),

        zatwierdz: () => {
          const { prymitywy, historia, indeksHistorii } = get();
          // bez zmian względem ostatniego wpisu nie ma czego zapisywać
          if (historia[indeksHistorii] === prymitywy) return;
          zHistoria(prymitywy);
        },

        usun: (id) => {
          zHistoria(
            get().prymitywy.filter((p) => p.id !== id),
            { zaznaczony: null },
          );
        },

        zaznacz: (zaznaczony) => set({ zaznaczony }),
        ustawNarzedzie: (narzedzie) =>
          set({ narzedzie, zaznaczony: narzedzie === 'wybor' ? get().zaznaczony : null }),
        ustawPoziom: (poziomRoboczy) => set({ poziomRoboczy }),
        ustawSkok: (skokSiatki) => set({ skokSiatki }),
        ustawTryb: (trybWidoku) => set({ trybWidoku }),
        przelaczGrupe: (g) =>
          set((s) => ({ widoczneGrupy: { ...s.widoczneGrupy, [g]: !s.widoczneGrupy[g] } })),
        przelaczSiatke: () => set((s) => ({ pokazSiatke: !s.pokazSiatke })),
        przelaczWytezenie: () => set((s) => ({ pokazWytezenie: !s.pokazWytezenie })),
        ustawStrefeSniegu: (strefa) =>
          set((s) => ({
            statyka: { ...s.statyka, strefaSniegu: strefa, sniegSk: znajdzStrefe(strefa).sk },
          })),
        ustawSniegSk: (sniegSk) => set((s) => ({ statyka: { ...s.statyka, sniegSk } })),
        ustawKlaseUzytkowania: (klasaUzytkowania) =>
          set((s) => ({ statyka: { ...s.statyka, klasaUzytkowania } })),
        ustawObciazenieUzytkowe: (obciazenieUzytkowe) =>
          set((s) => ({ statyka: { ...s.statyka, obciazenieUzytkowe } })),

        cofnij: () => {
          const { historia, indeksHistorii } = get();
          if (indeksHistorii <= 0) return;
          set({
            indeksHistorii: indeksHistorii - 1,
            prymitywy: historia[indeksHistorii - 1],
            zaznaczony: null,
          });
        },
        ponow: () => {
          const { historia, indeksHistorii } = get();
          if (indeksHistorii >= historia.length - 1) return;
          set({
            indeksHistorii: indeksHistorii + 1,
            prymitywy: historia[indeksHistorii + 1],
            zaznaczony: null,
          });
        },

        wczytaj: (nazwa, prymitywy) => {
          set({ nazwa, zaznaczony: null, narzedzie: 'wybor', historia: [[]], indeksHistorii: 0 });
          zHistoria(prymitywy);
        },
        ustawNazwe: (nazwa) => set({ nazwa }),
        nowy: () => {
          set({
            nazwa: 'Nowy projekt',
            zaznaczony: null,
            narzedzie: 'wybor',
            historia: [[]],
            indeksHistorii: 0,
          });
          zHistoria([]);
        },
      };
    },
    {
      name: 'timberframe-studio',
      partialize: (s) => ({
        nazwa: s.nazwa,
        prymitywy: s.prymitywy,
        poziomRoboczy: s.poziomRoboczy,
        skokSiatki: s.skokSiatki,
        trybWidoku: s.trybWidoku,
        widoczneGrupy: s.widoczneGrupy,
        pokazSiatke: s.pokazSiatke,
        pokazWytezenie: s.pokazWytezenie,
        statyka: s.statyka,
      }),
      onRehydrateStorage: () => (stan) => {
        // historia startuje od wczytanego projektu, nie od pustego
        if (stan) {
          stan.historia = [stan.prymitywy];
          stan.indeksHistorii = 0;
        }
      },
    },
  ),
);
