import type { Element, ZastrzalDef } from '../typy';

const STOPNIE = 180 / Math.PI;

/**
 * Zastrzał: od punktu na słupie (niżej) skośnie do spodu belki (wyżej).
 *
 * Czoła są ścięte tak, żeby przylegały płasko: dolne pionowo do lica słupa,
 * górne poziomo do spodu belki. Przy nachyleniu 45° oba wychodzą po 45°.
 * `obustronny` odbija drugi egzemplarz na przeciwną stronę słupa.
 */
export function generujZastrzal(def: ZastrzalDef): Element[] {
  const ramie = def.ramiePionowe ?? 0.6;
  const przekroj = def.przekroj ?? [0.08, 0.12];
  const zDol = def.zGora - ramie;
  const wx = def.do[0] - def.od[0];
  const wy = def.do[1] - def.od[1];

  const wysieg = Math.hypot(wx, wy);
  const alfa = Math.atan2(ramie, wysieg); // nachylenie osi nad poziomem
  const scieciePoczatku = alfa * STOPNIE; // czoło pionowe — przylega do słupa
  const sciecieKonca = (alfa - Math.PI / 2) * STOPNIE; // czoło poziome — przylega do belki

  return (def.obustronny ? [1, -1] : [1]).map((zwrot, i) => ({
    id: `${def.id}-${i}`,
    zPrymitywu: def.id,
    nazwa: 'zastrzał',
    grupa: 'belki' as const,
    kategoria: 'konstrukcja' as const,
    od: [def.od[0], def.od[1], zDol] as [number, number, number],
    do: [def.od[0] + wx * zwrot, def.od[1] + wy * zwrot, def.zGora] as [number, number, number],
    przekroj,
    gatunek: def.gatunek,
    scieciePoczatku,
    sciecieKonca,
  }));
}
