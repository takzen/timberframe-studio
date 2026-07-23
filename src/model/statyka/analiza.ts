// Orkiestracja analizy: elementy zginane (krokwie, legary) + ścieżka obciążeń
// (belki, słupy). Osobny plik, żeby uniknąć cyklu importów sprawdzenia↔sciezka.

import { znajdzGatunek } from '../katalog';
import type { Element } from '../typy';
import { obciazenieElementu } from './obciazenia';
import { analizaSciezki } from './sciezka';
import { sprawdzZginany, zbudujWynik } from './sprawdzenia';
import type { Status, UstawieniaStatyki, WynikElementu } from './typy';

const kluczGrupy = (w: WynikElementu) => `${w.nazwa}|${w.przekrojMm}|${w.rozpietosc.toFixed(2)}`;

/** Scala identyczne elementy (typ+przekrój+rozpiętość): najgorszy reprezentuje grupę. */
function scalGrupy(surowe: WynikElementu[]): WynikElementu[] {
  const grupy = new Map<string, WynikElementu>();
  for (const w of surowe) {
    const istn = grupy.get(kluczGrupy(w));
    if (!istn) {
      grupy.set(kluczGrupy(w), { ...w });
    } else {
      istn.sztuk += w.sztuk;
      if (w.maksWykorzystanie > istn.maksWykorzystanie) {
        istn.maksWykorzystanie = w.maksWykorzystanie;
        istn.sprawdzenia = w.sprawdzenia;
        istn.miarodajne = w.miarodajne;
        istn.status = w.status;
        istn.opisObciazenia = w.opisObciazenia;
      }
    }
  }
  return [...grupy.values()];
}

/**
 * Wynik per element (przed grupowaniem) — z zachowanym id, do kolorowania
 * rysunku i wizualizacji.
 */
export function analizaSurowa(elementy: Element[], u: UstawieniaStatyki): WynikElementu[] {
  const surowe: WynikElementu[] = [];

  for (const el of elementy) {
    if (!el.statyka) continue;
    const o = obciazenieElementu(el, u);
    if (!o) continue;
    const mech = znajdzGatunek(el.gatunek).mech;
    const spr = sprawdzZginany({
      L: o.rozpietosc,
      gk: o.gk,
      qk: o.qk,
      b: el.przekroj[0],
      h: el.przekroj[1],
      mech,
      klasa: u.klasaUzytkowania,
    });
    surowe.push(zbudujWynik(el, spr, o.rozpietosc, `${o.opis} · ${mech.klasa}`));
  }

  surowe.push(...analizaSciezki(elementy, u));
  return surowe;
}

/** Grupuje i sortuje surowe wyniki do tabeli w panelu. */
export function grupuj(surowe: WynikElementu[]): WynikElementu[] {
  const scalone = scalGrupy(surowe);
  scalone.sort((a, b) => b.maksWykorzystanie - a.maksWykorzystanie);
  return scalone;
}

/** Pełna analiza projektu — zgrupowane wyniki posortowane od najbardziej wytężonych. */
export function analiza(elementy: Element[], u: UstawieniaStatyki): WynikElementu[] {
  return grupuj(analizaSurowa(elementy, u));
}

const RANGA: Record<Status, number> = { ok: 0, uwaga: 1, przekroczone: 2 };

/** Status wytężenia per element (klucz = id elementu). */
export function statusyElementow(surowe: WynikElementu[]): Map<string, Status> {
  const m = new Map<string, Status>();
  for (const w of surowe) if (w.id) m.set(w.id, w.status);
  return m;
}

/** Najgorszy status wytężenia per prymityw (klucz = zPrymitywu). */
export function statusyPrymitywow(
  elementy: Element[],
  statusEl: Map<string, Status>,
): Map<string, Status> {
  const m = new Map<string, Status>();
  for (const el of elementy) {
    const s = statusEl.get(el.id);
    if (!s) continue;
    const obecny = m.get(el.zPrymitywu);
    if (!obecny || RANGA[s] > RANGA[obecny]) m.set(el.zPrymitywu, s);
  }
  return m;
}
