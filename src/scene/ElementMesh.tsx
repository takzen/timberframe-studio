import { useEffect, useMemo } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { findConcrete, findSheathing, findSpecies } from '../model/catalog';
import type { Status } from '../model/structural/types';
import type { Element } from '../model/types';
import { mitredGeometry } from './elementGeometry';

/** Utilisation colours — problem members only, the rest stay timber. */
const UTIL_COLOR: Partial<Record<Status, { color: string; emissive: string }>> = {
  warn: { color: '#d99a2b', emissive: '#5a3d00' },
  over: { color: '#d9463c', emissive: '#5a0f0a' },
};

/** Colour and roughness from the catalog: concrete > sheathing > timber species. */
export function elementLook(element: Element) {
  if (element.concrete) return { color: findConcrete(element.concrete).color, roughness: 0.9 };
  if (element.material) {
    const m = findSheathing(element.material);
    return { color: m.color, roughness: m.roughness };
  }
  const s = findSpecies(element.species);
  return { color: s.color, roughness: s.roughness };
}

/**
 * Renders an element as a box along the from→to axis. Local X = member axis,
 * Y = section width, Z = section height (points towards `up`, default world up).
 */
export function ElementMesh({
  element,
  highlighted,
  util,
  onSelect,
}: {
  element: Element;
  highlighted: boolean;
  util?: Status;
  onSelect: (id: string) => void;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const from = new Vector3(...element.from);
    const to = new Vector3(...element.to);
    const axis = new Vector3().subVectors(to, from);
    const len = axis.length();
    const x = axis.clone().normalize();

    const preferred = element.up ? new Vector3(...element.up) : new Vector3(0, 0, 1);
    let z = preferred.clone().addScaledVector(x, -preferred.dot(x));
    if (z.lengthSq() < 1e-9) z = new Vector3(1, 0, 0).addScaledVector(x, -x.x);
    z.normalize();
    const y = new Vector3().crossVectors(z, x).normalize();

    return {
      position: new Vector3().addVectors(from, to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)),
      length: len,
    };
  }, [element]);

  // members with mitred ends (braces) need their own solid instead of a box
  const mitred = useMemo(() => {
    const a = element.startMiter ?? 0;
    const b = element.endMiter ?? 0;
    if (a === 0 && b === 0) return null;
    const rad = Math.PI / 180;
    return mitredGeometry(length, element.section[0], element.section[1], Math.tan(a * rad), Math.tan(b * rad));
  }, [length, element.section, element.startMiter, element.endMiter]);

  useEffect(() => () => mitred?.dispose(), [mitred]);

  const { color, roughness } = elementLook(element);
  const u = util ? UTIL_COLOR[util] : undefined;

  // priority: selection > utilisation (warn/over) > material
  const shade = highlighted ? '#ffb861' : (u?.color ?? color);
  const emissive = highlighted ? '#8a4d00' : (u?.emissive ?? '#000000');
  const emissiveIntensity = highlighted ? 0.45 : u ? 0.55 : 0;

  return (
    <mesh
      position={position}
      quaternion={quaternion}
      castShadow
      receiveShadow
      {...(mitred ? { geometry: mitred } : {})}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.fromPrimitive);
      }}
    >
      {!mitred && <boxGeometry args={[length, element.section[0], element.section[1]]} />}
      <meshStandardMaterial color={shade} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={roughness} />
    </mesh>
  );
}
