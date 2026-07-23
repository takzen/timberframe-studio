import { useEffect, useMemo } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { znajdzBeton, znajdzGatunek, znajdzPoszycie } from '../model/katalog';
import type { Status } from '../model/statyka/typy';
import type { Element } from '../model/typy';
import { geometriaZeScieciem } from './geometriaElementu';

/** Barwy wytężenia — tylko elementy problematyczne, reszta zostaje drewnem. */
const KOLOR_WYTEZENIA: Partial<Record<Status, { kolor: string; emissive: string }>> = {
  uwaga: { kolor: '#d99a2b', emissive: '#5a3d00' },
  przekroczone: { kolor: '#d9463c', emissive: '#5a0f0a' },
};

/** Barwa i chropowatość z katalogu: beton > poszycie > gatunek drewna. */
export function wygladElementu(element: Element) {
  if (element.beton) return { kolor: znajdzBeton(element.beton).kolor, roughness: 0.9 };
  if (element.material) {
    const m = znajdzPoszycie(element.material);
    return { kolor: m.kolor, roughness: m.roughness };
  }
  const g = znajdzGatunek(element.gatunek);
  return { kolor: g.kolor, roughness: g.roughness };
}

/**
 * Renderuje element jako prostopadłościan wzdłuż osi od→do.
 * Lokalne X = oś elementu, Y = szerokość przekroju, Z = wysokość przekroju
 * (celuje w `gora`, domyślnie pion świata).
 */
export function ElementMesh({
  element,
  podswietlony,
  wytezenie,
  onWybor,
}: {
  element: Element;
  podswietlony: boolean;
  wytezenie?: Status;
  onWybor: (id: string) => void;
}) {
  const { pozycja, kwaternion, dlugosc } = useMemo(() => {
    const od = new Vector3(...element.od);
    const do_ = new Vector3(...element.do);
    const os = new Vector3().subVectors(do_, od);
    const dl = os.length();
    const x = os.clone().normalize();

    const preferowana = element.gora ? new Vector3(...element.gora) : new Vector3(0, 0, 1);
    let z = preferowana.clone().addScaledVector(x, -preferowana.dot(x));
    if (z.lengthSq() < 1e-9) z = new Vector3(1, 0, 0).addScaledVector(x, -x.x);
    z.normalize();
    const y = new Vector3().crossVectors(z, x).normalize();

    return {
      pozycja: new Vector3().addVectors(od, do_).multiplyScalar(0.5),
      kwaternion: new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z)),
      dlugosc: dl,
    };
  }, [element]);

  // elementy ze ściętymi czołami (zastrzały) potrzebują własnej bryły zamiast pudełka
  const geometriaSkosna = useMemo(() => {
    const a = element.scieciePoczatku ?? 0;
    const b = element.sciecieKonca ?? 0;
    if (a === 0 && b === 0) return null;
    const rad = Math.PI / 180;
    return geometriaZeScieciem(
      dlugosc,
      element.przekroj[0],
      element.przekroj[1],
      Math.tan(a * rad),
      Math.tan(b * rad),
    );
  }, [dlugosc, element.przekroj, element.scieciePoczatku, element.sciecieKonca]);

  useEffect(() => () => geometriaSkosna?.dispose(), [geometriaSkosna]);

  const { kolor, roughness } = wygladElementu(element);
  const wyt = wytezenie ? KOLOR_WYTEZENIA[wytezenie] : undefined;

  // pierwszeństwo: zaznaczenie > wytężenie (uwaga/przekroczone) > materiał
  const barwa = podswietlony ? '#ffb861' : (wyt?.kolor ?? kolor);
  const emissive = podswietlony ? '#8a4d00' : (wyt?.emissive ?? '#000000');
  const emissiveIntensity = podswietlony ? 0.45 : wyt ? 0.55 : 0;

  return (
    <mesh
      position={pozycja}
      quaternion={kwaternion}
      castShadow
      receiveShadow
      {...(geometriaSkosna ? { geometry: geometriaSkosna } : {})}
      onClick={(e) => {
        e.stopPropagation();
        onWybor(element.zPrymitywu);
      }}
    >
      {!geometriaSkosna && (
        <boxGeometry args={[dlugosc, element.przekroj[0], element.przekroj[1]]} />
      )}
      <meshStandardMaterial
        color={barwa}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={roughness}
      />
    </mesh>
  );
}
