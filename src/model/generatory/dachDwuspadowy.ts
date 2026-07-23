import { znajdzPoszycie } from '../katalog';
import type { DachDwuspadowyDef, Element, Vec3 } from '../typy';
import { przesunNadOs, rozmiesc } from './util';

/**
 * Dach dwuspadowy: belka kalenicowa + pary krokwi co N cm + poszycie dwóch połaci.
 * `z` = poziom spodu krokwi na krawędziach okapowych obrysu.
 */
export function generujDachDwuspadowy(def: DachDwuspadowyDef): Element[] {
  const [x0, y0] = def.pozycja;
  const [dx, dy] = def.wymiar;
  const okap = def.okap ?? 0.4;
  const rozstaw = def.rozstawKrokwi ?? 0.6;
  const [kw, kh] = def.przekrojKrokwi ?? [0.06, 0.18];
  const poszycie = znajdzPoszycie(def.poszycie ?? 'osb22');
  const grub = poszycie.grubosc;
  const [bw, bh] = def.przekrojKalenicy ?? [0.08, 0.18];
  const tg = Math.tan((def.kat * Math.PI) / 180);

  // `k` — współrzędna wzdłuż kalenicy, `s` — w poprzek (kierunek spadku)
  const osK = def.kierunekKalenicy;
  const [k0, k1] = osK === 'x' ? [x0, x0 + dx] : [y0, y0 + dy];
  const [s0, s1] = osK === 'x' ? [y0, y0 + dy] : [x0, x0 + dx];
  const sSrodek = (s0 + s1) / 2;
  const zSpodu = (s: number) => def.z + ((s1 - s0) / 2 - Math.abs(s - sSrodek)) * tg;
  const zKalenicy = zSpodu(sSrodek);
  const pkt = (k: number, s: number, z: number): Vec3 =>
    osK === 'x' ? [k, s, z] : [s, k, z];

  const el: Element[] = [];

  el.push({
    id: `${def.id}-kalenica`,
    zPrymitywu: def.id,
    nazwa: 'belka kalenicowa',
    grupa: 'dachy',
    kategoria: 'konstrukcja',
    od: pkt(k0 - okap, sSrodek, zKalenicy - bh / 2),
    do: pkt(k1 + okap, sSrodek, zKalenicy - bh / 2),
    przekroj: [bw, bh],
    gatunek: def.gatunek,
  });

  const pozycjeKrokwi = rozmiesc(k0 + kw / 2, k1 - kw / 2, rozstaw);
  const kSrodek = (k0 + k1) / 2;

  // statyka: rozpiętość krokwi = od okapu (krawędź obrysu) do kalenicy, po połaci
  const cosA = Math.cos((def.kat * Math.PI) / 180) || 1;
  const rozpietoscKrokwi = (s1 - s0) / 2 / cosA;

  // dwie połacie: od okapu do kalenicy (krokwie dobijają do belki kalenicowej)
  const polacie = [
    { sOkap: s0 - okap, sKalenica: sSrodek - bw / 2 },
    { sOkap: s1 + okap, sKalenica: sSrodek + bw / 2 },
  ];
  polacie.forEach(({ sOkap, sKalenica }, nrPolaci) => {
    pozycjeKrokwi.forEach((k, i) => {
      const [od, do_] = przesunNadOs(
        pkt(k, sOkap, zSpodu(sOkap)),
        pkt(k, sKalenica, zSpodu(sKalenica)),
        kh / 2,
      );
      el.push({
        id: `${def.id}-krokiew-${nrPolaci}-${i}`,
        zPrymitywu: def.id,
        nazwa: 'krokiew',
        grupa: 'dachy',
        kategoria: 'konstrukcja',
        od,
        do: do_,
        przekroj: [kw, kh],
        gatunek: def.gatunek,
        statyka: {
          rozpietosc: rozpietoscKrokwi,
          szerokoscObciazenia: rozstaw,
          kat: def.kat,
          pokrycie: poszycie.id,
        },
      });
    });

    const [od, do_] = przesunNadOs(
      pkt(kSrodek, sOkap, zSpodu(sOkap)),
      pkt(kSrodek, sSrodek, zKalenicy),
      kh + grub / 2,
    );
    el.push({
      id: `${def.id}-poszycie-${nrPolaci}`,
      zPrymitywu: def.id,
      nazwa: 'poszycie dachu',
      grupa: 'dachy',
      kategoria: 'poszycie',
      od,
      do: do_,
      przekroj: [k1 - k0 + 2 * okap, grub],
      material: poszycie.id,
    });
  });

  return el;
}
