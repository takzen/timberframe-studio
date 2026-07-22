import type { Element, PodestDef, Vec3 } from '../typy';
import { rozmiesc } from './util';

/**
 * Podest: legary co N cm wzdłuż `kierunekLegarow`, deski prostopadle do legarów,
 * układane ze szczeliną. `wysokosc` = poziom góry desek.
 */
export function generujPodest(def: PodestDef): Element[] {
  const [x0, y0] = def.pozycja;
  const [dx, dy] = def.wymiar;
  const legar = def.przekrojLegara ?? [0.045, 0.145];
  const rozstaw = def.rozstawLegarow ?? 0.5;
  const kier = def.kierunekLegarow ?? 'y';
  const szer = def.deska?.szerokosc ?? 0.14;
  const grub = def.deska?.grubosc ?? 0.025;
  const szczelina = def.deska?.szczelina ?? 0.006;
  const nazwaDeski = def.nazwaDeski ?? 'deska tarasowa';
  const gatunekDeski = def.gatunekDeski ?? def.gatunek;

  const zOsLegara = def.wysokosc - grub - legar[1] / 2;
  const zOsDeski = def.wysokosc - grub / 2;

  // `wzdluz` — współrzędna wzdłuż osi legarów, `wpoprzek` — prostopadle do nich
  const dlWzdluz = kier === 'y' ? dy : dx;
  const dlWpoprzek = kier === 'y' ? dx : dy;
  const pkt = (wpoprzek: number, wzdluz: number, z: number): Vec3 =>
    kier === 'y' ? [x0 + wpoprzek, y0 + wzdluz, z] : [x0 + wzdluz, y0 + wpoprzek, z];

  const el: Element[] = [];

  rozmiesc(legar[0] / 2, dlWpoprzek - legar[0] / 2, rozstaw).forEach((p, i) => {
    el.push({
      id: `${def.id}-legar-${i}`,
      zPrymitywu: def.id,
      nazwa: 'legar',
      grupa: 'podesty',
      kategoria: 'konstrukcja',
      od: pkt(p, 0, zOsLegara),
      do: pkt(p, dlWzdluz, zOsLegara),
      przekroj: [legar[0], legar[1]],
      gatunek: def.gatunek,
    });
  });

  const krok = szer + szczelina;
  const ileDesek = Math.max(1, Math.floor((dlWzdluz + szczelina + 1e-9) / krok));
  for (let i = 0; i < ileDesek; i++) {
    const s = szer / 2 + i * krok;
    el.push({
      id: `${def.id}-deska-${i}`,
      zPrymitywu: def.id,
      nazwa: nazwaDeski,
      grupa: 'podesty',
      kategoria: 'poszycie',
      od: pkt(0, s, zOsDeski),
      do: pkt(dlWpoprzek, s, zOsDeski),
      przekroj: [szer, grub],
      gatunek: gatunekDeski,
    });
  }

  return el;
}
