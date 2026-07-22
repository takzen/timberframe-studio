import { BufferAttribute, BufferGeometry } from 'three';

type Punkt = [number, number, number];

const kwadrat = (a: Punkt, b: Punkt, c: Punkt, d: Punkt) => [...a, ...b, ...c, ...a, ...c, ...d];

/**
 * Prostopadłościan o długości `dl` ze ściętymi czołami.
 *
 * `tanA` / `tanB` to tangensy kątów ścięcia początku i końca: przesuwają
 * wierzchołki wzdłuż osi proporcjonalnie do ich położenia w przekroju, więc
 * płaskie czoło staje się ukośne. Dodatnia wartość wydłuża dolną krawędź.
 * Oś lokalna X biegnie wzdłuż elementu, Z jest wysokością przekroju.
 */
export function geometriaZeScieciem(
  dl: number,
  szer: number,
  wys: number,
  tanA: number,
  tanB: number,
): BufferGeometry {
  const hy = szer / 2;
  const hz = wys / 2;
  const x = (koniec: boolean, z: number) => (koniec ? dl / 2 + z * tanB : -dl / 2 + z * tanA);
  const p = (koniec: boolean, sy: number, sz: number): Punkt => [
    x(koniec, sz * hz),
    sy * hy,
    sz * hz,
  ];

  const A = p(false, -1, -1);
  const B = p(false, 1, -1);
  const C = p(false, 1, 1);
  const D = p(false, -1, 1);
  const E = p(true, -1, -1);
  const F = p(true, 1, -1);
  const G = p(true, 1, 1);
  const H = p(true, -1, 1);

  const pozycje = new Float32Array([
    ...kwadrat(E, F, G, H), // czoło końcowe
    ...kwadrat(B, A, D, C), // czoło początkowe
    ...kwadrat(A, B, F, E), // spód
    ...kwadrat(D, H, G, C), // wierzch
    ...kwadrat(A, E, H, D), // bok
    ...kwadrat(B, C, G, F), // bok
  ]);

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pozycje, 3));
  // bez indeksowania każda ściana dostaje własną normalną — drewno ma być płaskie, nie gładzone
  g.computeVertexNormals();
  return g;
}
