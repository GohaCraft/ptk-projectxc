"use client";
import { useEffect, useState } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────
// Подложка чертежа БТИ, привязанная ОТДЕЛЬНО по каждому крылу
// (Б, Б1, Б2). Каждое крыло — своя обрезка страницы плана,
// растянутая на габарит блока в модели. Это устраняет глобальное
// расхождение «план ≠ модель»: чертёж точно ложится на каждое крыло.
//
// Данные раскладки: /plan_manifest.json (генерируется trace-скриптом).
//   { floor, block, image, origin:[x,z], size:[w(X), d(Z)] }
// ─────────────────────────────────────────────────────────────

interface PlanEntry {
  floor: number;
  block: 'B' | 'B1' | 'B2';
  image: string;
  origin: [number, number];
  size: [number, number];
}

function WingPlane({
  entry, floorY, opacity,
}: { entry: PlanEntry; floorY: number; opacity: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(entry.image, (t) => {
      if (cancelled) { t.dispose(); return; }
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      setTex(t);
    });
    return () => { cancelled = true; };
  }, [entry.image]);

  if (!tex) return null;

  return (
    <mesh
      position={[entry.origin[0], floorY, entry.origin[1]]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={2}
    >
      <planeGeometry args={[entry.size[0], entry.size[1]]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        color={0xffffff}
      />
    </mesh>
  );
}

export function PlanUnderlay({
  activeFloor,
  visible = true,
  opacity = 0.82,
}: {
  activeFloor: number;
  visible?: boolean;
  opacity?: number;
}) {
  const [manifest, setManifest] = useState<PlanEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/plan_manifest.json')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setManifest(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;
  if (!Number.isInteger(activeFloor) || activeFloor < 1 || activeFloor > 4) return null;

  const entries = manifest.filter((e) => e.floor === activeFloor);

  return (
    <group>
      {entries.map((e) => {
        // Высота межэтажки разная: блок Б = 2.9 м, крылья Б1/Б2 = 3.3 м.
        // Кладём подложку чуть выше плиты перекрытия (top плиты = база + 0.2).
        const floorH = e.block === 'B' ? 2.9 : 3.3;
        const floorY = 1.5 + (activeFloor - 1) * floorH + 0.26;
        return (
          <WingPlane key={`${e.floor}-${e.block}`} entry={e} floorY={floorY} opacity={opacity} />
        );
      })}
    </group>
  );
}

export default PlanUnderlay;
