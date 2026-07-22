import { znajdzPoszycie } from '../katalog';
import type { Element, Kategoria, ScianaDef, Vec2, Vec3 } from '../typy';

/**
 * Ściana szkieletowa: podwalina, oczep, słupki co N cm, otwory (okna/drzwi)
 * z nadprożami, ryglami podokiennymi i słupkami skróconymi. Opcjonalne
 * poszycie płytowe z wycięciami na otwory.
 */
export function generujSciane(def: ScianaDef): Element[] {
  const z = def.z ?? 0;
  const H = def.wysokosc;
  const [gr, szer] = def.przekroj ?? [0.06, 0.14];
  const rozstaw = def.rozstawSlupkow ?? 0.6;

  const ux = def.do[0] - def.od[0];
  const uy = def.do[1] - def.od[1];
  const L = Math.hypot(ux, uy);
  const u: Vec2 = [ux / L, uy / L];
  const n: Vec2 = [-u[1], u[0]];
  const pos = (t: number): Vec2 => [def.od[0] + u[0] * t, def.od[1] + u[1] * t];

  const el: Element[] = [];
  let lp = 0;
  const dodajElement = (
    nazwa: string,
    kategoria: Kategoria,
    od: Vec3,
    do_: Vec3,
    przekroj: Vec2,
    dodatki: Partial<Element> = {},
  ) =>
    el.push({
      id: `${def.id}-${lp++}`,
      zPrymitywu: def.id,
      nazwa,
      grupa: 'sciany',
      kategoria,
      od,
      do: do_,
      przekroj,
      gatunek: def.gatunek,
      ...dodatki,
    });

  const poziomy = (nazwa: string, t0: number, t1: number, zOs: number, wys: number) =>
    dodajElement(nazwa, 'konstrukcja', [...pos(t0), zOs], [...pos(t1), zOs], [szer, wys]);
  const slupek = (t: number, z0: number, z1: number) =>
    dodajElement('słupek', 'konstrukcja', [...pos(t), z0], [...pos(t), z1], [gr, szer], {
      gora: [n[0], n[1], 0],
    });

  poziomy('podwalina', 0, L, z + gr / 2, gr);
  poziomy('oczep', 0, L, z + H - gr / 2, gr);

  const zDol = z + gr;
  const zGora = z + H - gr;
  const otwory = [...(def.otwory ?? [])].sort((a, b) => a.odleglosc - b.odleglosc);
  const parapetOtworu = (o: (typeof otwory)[number]) =>
    o.parapet ?? (o.typ === 'drzwi' ? 0 : 0.9);

  // siatka słupków: skrajne w licu końców ściany + pośrednie co `rozstaw`
  const kandydaci: number[] = [gr / 2];
  for (let t = rozstaw; t < L - gr; t += rozstaw) kandydaci.push(t);
  kandydaci.push(L - gr / 2);

  const wOtworze = (t: number) =>
    otwory.some((o) => t > o.odleglosc - gr && t < o.odleglosc + o.szerokosc + gr);
  const pelne = kandydaci.filter((t) => !wOtworze(t));
  // słupki przyościeżnicowe po obu stronach każdego otworu
  for (const o of otwory) {
    for (const t of [o.odleglosc - gr / 2, o.odleglosc + o.szerokosc + gr / 2]) {
      if (t > gr / 4 && t < L - gr / 4) pelne.push(t);
    }
  }
  pelne.sort((a, b) => a - b);
  const slupkiPelne = pelne.filter((t, i) => i === 0 || t - pelne[i - 1] > gr * 0.9);
  for (const t of slupkiPelne) slupek(t, zDol, zGora);

  for (const o of otwory) {
    const a = o.odleglosc;
    const b = a + o.szerokosc;
    const parapet = parapetOtworu(o);
    const zOtworGora = z + parapet + o.wysokosc;
    const hNadproza = Math.min(0.14, Math.max(0, z + H - gr - zOtworGora));
    if (hNadproza > 0.02) {
      poziomy('nadproże', a, b, zOtworGora + hNadproza / 2, hNadproza);
      if (zGora - (zOtworGora + hNadproza) > 0.08) {
        for (const t of kandydaci) {
          if (t > a + gr && t < b - gr) slupek(t, zOtworGora + hNadproza, zGora);
        }
      }
    }
    if (parapet > gr + 0.05) {
      const zRygla = z + parapet - gr / 2;
      poziomy('rygiel', a, b, zRygla, gr);
      if (z + parapet - gr - zDol > 0.08) {
        for (const t of kandydaci) {
          if (t > a + gr && t < b - gr) slupek(t, zDol, z + parapet - gr);
        }
      }
    }
  }

  if (def.poszycie) {
    const material = znajdzPoszycie(def.poszycie);
    const grubP = material.grubosc;
    const strona = def.stronaPoszycia ?? 1;
    const odsun = (szer / 2 + grubP / 2) * strona;
    const przes = (t: number): Vec2 => {
      const [x, y] = pos(t);
      return [x + n[0] * odsun, y + n[1] * odsun];
    };
    const panel = (t0: number, t1: number, z0: number, z1: number) => {
      if (t1 - t0 < 0.01 || z1 - z0 < 0.01) return;
      const zc = z + (z0 + z1) / 2;
      dodajElement(
        'poszycie ściany',
        'poszycie',
        [...przes(t0), zc],
        [...przes(t1), zc],
        [grubP, z1 - z0],
        { gatunek: undefined, material: material.id },
      );
    };
    let t = 0;
    for (const o of otwory) {
      const a = o.odleglosc;
      const b = a + o.szerokosc;
      const parapet = parapetOtworu(o);
      panel(t, a, 0, H);
      panel(a, b, parapet + o.wysokosc, H);
      panel(a, b, 0, parapet);
      t = b;
    }
    panel(t, L, 0, H);
  }

  return el;
}
