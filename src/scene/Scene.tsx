import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, OrbitControls } from '@react-three/drei';
import type { Status } from '../model/structural/types';
import type { Element } from '../model/types';
import { ElementMesh } from './ElementMesh';
import { useStore } from '../store';

/** Centre of the elements' plan outline — the camera target. */
function planCenter(elements: Element[]): [number, number, number] {
  if (elements.length === 0) return [0, 0, 8];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const el of elements) {
    for (const p of [el.from, el.to]) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]);
      maxY = Math.max(maxY, p[1]);
    }
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2, Math.max(maxX - minX, maxY - minY, 4)];
}

export function Scene({
  elements,
  util,
}: {
  elements: Element[];
  util: Map<string, Status> | null;
}) {
  const showGrid = useStore((s) => s.showGrid);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);

  // camera position applies only on mount; OrbitControls target follows the project
  const [cx, cy, reach] = useMemo(() => planCenter(elements), [elements]);
  const d = Math.max(reach, 4);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [cx + d * 1.4, cy - d * 1.6, d * 1.05], up: [0, 0, 1], fov: 45, near: 0.1, far: 400 }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#e8eaed']} />
      <hemisphereLight args={['#dfe6f0', '#6b5c4a', 1.1]} />
      <directionalLight
        position={[cx + d, cy - d * 1.2, d * 2]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-d * 2}
        shadow-camera-right={d * 2}
        shadow-camera-top={d * 2}
        shadow-camera-bottom={-d * 2}
        shadow-camera-near={0.5}
        shadow-camera-far={d * 6}
      />

      {elements.map((el) => (
        <ElementMesh
          key={el.id}
          element={el}
          highlighted={el.fromPrimitive === selected}
          util={util?.get(el.id)}
          onSelect={select}
        />
      ))}

      <mesh receiveShadow position={[cx, cy, -0.005]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#cfd4cb" roughness={1} />
      </mesh>

      {showGrid && (
        <Grid
          position={[cx, cy, 0.004]}
          rotation={[Math.PI / 2, 0, 0]}
          args={[60, 60]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#8d9788"
          sectionSize={5}
          sectionThickness={1.2}
          sectionColor="#4d5a49"
          fadeDistance={80}
          fadeStrength={1.5}
          infiniteGrid
        />
      )}

      <Suspense fallback={null}>
        <Environment preset="city" />
      </Suspense>

      <OrbitControls makeDefault target={[cx, cy, 1.2]} maxPolarAngle={Math.PI / 2 - 0.02} />
    </Canvas>
  );
}
