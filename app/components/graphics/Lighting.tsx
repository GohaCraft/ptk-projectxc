"use client";

import React from "react";
import * as THREE from "three";

/**
 * Дополнительное искусственное освещение.
 * - Тёплые лампы под козырьком главного входа.
 * - Уличные фонари вдоль дорожки (с видимыми светящимися плафонами,
 *   которые подхватываются Bloom-проходом для эффекта свечения).
 */
export function Lighting() {
  return (
    <>
      {/* ───────── Лампы под козырьком главного входа ───────── */}
      {/* Козырёк тамбура на юге (z ≈ +15.8). Лампы освещают вход и крыльцо. */}
      {[-3.0, -1.0, 1.0, 3.0].map((x, i) => (
        <group key={`canopy-${i}`} position={[x, 4.4, 16.0]}>
          {/* Светящийся плафон (виден глазом, ловится Bloom) */}
          <mesh>
            <boxGeometry args={[0.45, 0.06, 0.45]} />
            <meshStandardMaterial
              color="#FFE9B0"
              emissive="#FFE4A0"
              emissiveIntensity={3.0}
              toneMapped={false}
            />
          </mesh>
          {/* Сам источник света */}
          <pointLight position={[0, -0.2, 0]} intensity={2.2} distance={9} decay={2} color="#ffd9a0" />
        </group>
      ))}

    </>
  );
}

export default Lighting;
