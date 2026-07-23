import { znajdzBeton } from '../katalog';
import { obciazenieElementu } from '../statyka/obciazenia';
import { rozwiazSciezke } from '../statyka/sciezka';
import type { Status, UstawieniaStatyki } from '../statyka/typy';
import type { Element, PlytaDef, PrymitywDef, Vec2 } from '../typy';
import type { AnalizaFundamentow, UstawieniaFundamentow, WynikPlyty, WynikStopy } from './typy';

const CIEZAR_BETONU = 24; // kN/m³
const zaokr = (v: number, m = 100) => Math.round(v * m) / m;
const statusOf = (u: number): Status => (u > 1 ? 'przekroczone' : u > 0.9 ? 'uwaga' : 'ok');
/** Zaokrągla bok stopy w górę do 5 cm. */
const doModulu = (a: number) => Math.ceil(a / 0.05) * 0.05;

/** Dobiera stopę fundamentową pod pojedynczy słup: bok z nośności gruntu. */
function dobierzStope(
  idSlupa: string,
  punkt: Vec2,
  Nd: number,
  f: UstawieniaFundamentow,
  cenaM3: number,
): WynikStopy {
  const aWymagane = Math.sqrt(Math.max(Nd, 0) / f.nosnoscGruntu); // A = N/q
  const bok = Math.max(f.minStopa, doModulu(aWymagane));
  const naprezenie = Nd / (bok * bok); // kPa
  const objetosc = bok * bok * f.gruboscStopy;
  return {
    idSlupa,
    punkt,
    bok: zaokr(bok),
    grubosc: f.gruboscStopy,
    Nd: zaokr(Nd),
    naprezenie: zaokr(naprezenie),
    wykorzystanie: naprezenie / f.nosnoscGruntu,
    status: statusOf(naprezenie / f.nosnoscGruntu),
    objetosc: zaokr(objetosc, 1000),
    koszt: zaokr(objetosc * cenaM3),
  };
}

/** Bryła stopy do wizualizacji — kwadratowy blok pod osią słupa. */
function bryłaStopy(w: WynikStopy, betonId: string): Element {
  const [x, y] = w.punkt;
  return {
    id: `stopa-${w.idSlupa}`,
    zPrymitywu: w.idSlupa, // zaznaczenie słupa podświetla jego stopę
    nazwa: 'stopa fundamentowa',
    grupa: 'fundamenty',
    kategoria: 'fundament',
    od: [x, y, -w.grubosc],
    do: [x, y, 0],
    przekroj: [w.bok, w.bok],
    gora: [1, 0, 0],
    beton: betonId,
  };
}

const wProstokacie = (p: Vec2, poz: Vec2, wym: Vec2) =>
  p[0] >= poz[0] && p[0] <= poz[0] + wym[0] && p[1] >= poz[1] && p[1] <= poz[1] + wym[1];

/** Sprawdza płytę: nacisk = (obciążenie dachu nad płytą + ciężar własny) / pole. */
function sprawdzPlyte(
  def: PlytaDef,
  elementy: Element[],
  u: UstawieniaStatyki,
  f: UstawieniaFundamentow,
  cenaM3: number,
): WynikPlyty {
  const [dx, dy] = def.wymiar;
  const pole = dx * dy;
  const objetosc = pole * def.grubosc;

  // obciążenie obliczeniowe dachów, których podpory rzutują się na płytę
  let Nd = 0;
  for (const el of elementy) {
    const s = el.statyka;
    if (!s?.podpory || s.uzytkowe) continue;
    const wnetrze = s.podpory.some((p) => wProstokacie(p, def.pozycja, def.wymiar));
    if (!wnetrze) continue;
    const o = obciazenieElementu(el, u);
    if (o) Nd += 1.35 * o.gk * o.rozpietosc + 1.5 * o.qk * o.rozpietosc;
  }
  Nd += 1.35 * CIEZAR_BETONU * objetosc; // ciężar własny płyty

  const naprezenie = Nd / pole;
  return {
    idPrymitywu: def.id,
    pole: zaokr(pole),
    grubosc: def.grubosc,
    objetosc: zaokr(objetosc, 1000),
    naprezenie: zaokr(naprezenie),
    wykorzystanie: naprezenie / f.nosnoscGruntu,
    status: statusOf(naprezenie / f.nosnoscGruntu),
    koszt: zaokr(objetosc * cenaM3),
  };
}

/** Pełny dobór fundamentów: stopy pod słupy + sprawdzenie płyt. */
export function analizaFundamentow(
  prymitywy: PrymitywDef[],
  elementy: Element[],
  statyka: UstawieniaStatyki,
  f: UstawieniaFundamentow,
): AnalizaFundamentow {
  const beton = znajdzBeton(f.klasaBetonu);
  const { slupy } = rozwiazSciezke(elementy, statyka);

  // stopy tylko pod wolnostojącymi słupami; słupki ścian stoją na podwalinie/płycie
  const stopy = slupy
    .filter((s) => !s.nazwa.startsWith('słupek'))
    .map((s) => dobierzStope(s.id, s.punkt, s.Nd, f, beton.cenaM3));
  const elementyStop = stopy.map((w) => bryłaStopy(w, beton.id));

  const plyty = prymitywy
    .filter((p): p is PlytaDef => p.typ === 'plyta')
    .map((p) => sprawdzPlyte(p, elementy, statyka, f, beton.cenaM3));

  const objetosc =
    stopy.reduce((v, s) => v + s.objetosc, 0) + plyty.reduce((v, p) => v + p.objetosc, 0);
  const koszt = stopy.reduce((k, s) => k + s.koszt, 0) + plyty.reduce((k, p) => k + p.koszt, 0);

  return {
    stopy,
    plyty,
    elementyStop,
    objetoscBetonu: zaokr(objetosc, 1000),
    koszt: zaokr(koszt),
  };
}
