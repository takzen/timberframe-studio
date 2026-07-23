// Orkiestracja analizy: elementy zginane (krokwie, legary) + ścieżka obciążeń
// (belki, słupy). Osobny plik, żeby uniknąć cyklu importów sprawdzenia↔sciezka.

import { znajdzGatunek } from '../katalog';
import type { Element } from '../typy';
import { obciazenieElementu } from './obciazenia';
import { analizaSciezki } from './sciezka';
import { sprawdzZginany, zbudujWynik } from './sprawdzenia';
import type { UstawieniaStatyki, WynikElementu } from './typy';

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
 * Pełna analiza projektu. Zwraca zgrupowane wyniki (krokwie, legary, belki,
 * słupy) posortowane od najbardziej wytężonych.
 */
export function analiza(elementy: Element[], u: UstawieniaStatyki): WynikElementu[] {
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

  const scalone = scalGrupy(surowe);
  scalone.sort((a, b) => b.maksWykorzystanie - a.maksWykorzystanie);
  return scalone;
}
