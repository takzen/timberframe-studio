import type { Element, PrymitywDef } from './typy';
import { generujBelke } from './generatory/belka';
import { generujDachDwuspadowy } from './generatory/dachDwuspadowy';
import { generujDachJednospadowy } from './generatory/dachJednospadowy';
import { generujPodest } from './generatory/podest';
import { generujSciane } from './generatory/sciana';
import { generujSlup } from './generatory/slup';
import { generujZastrzal } from './generatory/zastrzal';

export function generujPrymityw(def: PrymitywDef): Element[] {
  switch (def.typ) {
    case 'slup':
      return generujSlup(def);
    case 'belka':
      return generujBelke(def);
    case 'zastrzal':
      return generujZastrzal(def);
    case 'podest':
      return generujPodest(def);
    case 'dachJednospadowy':
      return generujDachJednospadowy(def);
    case 'dachDwuspadowy':
      return generujDachDwuspadowy(def);
    case 'sciana':
      return generujSciane(def);
  }
}

export function generujElementy(prymitywy: PrymitywDef[]): Element[] {
  return prymitywy.flatMap(generujPrymityw);
}
