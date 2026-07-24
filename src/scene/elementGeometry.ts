import { BufferAttribute, BufferGeometry } from 'three';

type Point = [number, number, number];

const quad = (a: Point, b: Point, c: Point, d: Point) => [...a, ...b, ...c, ...a, ...c, ...d];

/**
 * A box of length `len` with mitred ends.
 *
 * `tanA` / `tanB` are the tangents of the start/end miter angles: they shift the
 * vertices along the axis in proportion to their position in the section, turning
 * a flat end into a sloped one. Positive lengthens the bottom edge. Local X runs
 * along the member, Z is the section height.
 *
 * `sideA` / `sideB` shear the same way but across the width (local Y), which
 * tilts the end face in plan. Both together give a compound cut.
 */
export function mitredGeometry(
  len: number,
  width: number,
  height: number,
  tanA: number,
  tanB: number,
  sideA = 0,
  sideB = 0,
): BufferGeometry {
  const hy = width / 2;
  const hz = height / 2;
  const x = (end: boolean, y: number, z: number) =>
    end ? len / 2 + z * tanB + y * sideB : -len / 2 + z * tanA + y * sideA;
  const p = (end: boolean, sy: number, sz: number): Point => [
    x(end, sy * hy, sz * hz),
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

  const positions = new Float32Array([
    ...quad(E, F, G, H), // end face
    ...quad(B, A, D, C), // start face
    ...quad(A, B, F, E), // bottom
    ...quad(D, H, G, C), // top
    ...quad(A, E, H, D), // side
    ...quad(B, C, G, F), // side
  ]);

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  // unindexed so each face gets its own normal — timber should read flat, not smoothed
  g.computeVertexNormals();
  return g;
}
