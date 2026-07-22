import { useEffect, useMemo } from 'react';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { znajdzGatunek, znajdzPoszycie } from '../model/katalog';
import type { Element } from '../model/typy';
import { geometriaZeScieciem } from './geometriaElementu';

/** Barwa i chropowatość z katalogu: materiał poszycia ma pierwszeństwo przed gatunkiem. */
export function wygladElementu(element: Element) {
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
  onWybor,
}: {
  element: Element;
  podswietlony: boolean;
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
        color={podswietlony ? '#ffb861' : kolor}
        emissive={podswietlony ? '#8a4d00' : '#000000'}
        emissiveIntensity={podswietlony ? 0.45 : 0}
        roughness={roughness}
      />
    </mesh>
  );
}
