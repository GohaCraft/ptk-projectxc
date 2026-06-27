"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  ИЗОЛИРОВАННЫЙ КАБИНЕТ (типовой шаблон)
//
//  Лёгкая 3D-сцена ОДНОГО кабинета — без здания и этажей вокруг. Сейчас это
//  обобщённая «болванка» класса (пол, стены, доска, окна, ряды парт). В будущем
//  каждый id кабинета получит свою реальную отснятую/смоделированную геометрию —
//  достаточно подменить содержимое <Classroom/> по room.id.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// Габариты типового класса (метры)
const W = 8.4;   // ширина (X)
const D = 6.2;   // глубина (Z)
const H = 3.25;  // высота (Y)
const T = 0.16;  // толщина стен

// ── Простые материалы (тёплый, «учебный» интерьер) ──
function useMaterials() {
  return useMemo(() => ({
    floor: new THREE.MeshStandardMaterial({ color: '#b58a5a', roughness: 0.72, metalness: 0.04 }),
    wall: new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.94 }),
    wallAccent: new THREE.MeshStandardMaterial({ color: '#dfe7ee', roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f7fafc', roughness: 1 }),
    board: new THREE.MeshStandardMaterial({ color: '#1f5e46', roughness: 0.6 }),
    frame: new THREE.MeshStandardMaterial({ color: '#cfd6dd', roughness: 0.5, metalness: 0.3 }),
    deskTop: new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.55 }),
    deskLeg: new THREE.MeshStandardMaterial({ color: '#8a9099', roughness: 0.4, metalness: 0.5 }),
    chair: new THREE.MeshStandardMaterial({ color: '#2f6fb0', roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: '#bfe3ef', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.34 }),
    mullion: new THREE.MeshStandardMaterial({ color: '#e7edf1', roughness: 0.5 }),
    door: new THREE.MeshStandardMaterial({ color: '#9c6b3f', roughness: 0.6 }),
    teacher: new THREE.MeshStandardMaterial({ color: '#7d5230', roughness: 0.55 }),
  }), []);
}

function Box({ args, position, rotation, material }: {
  args: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.Material;
}) {
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow receiveShadow>
      <boxGeometry args={args} />
    </mesh>
  );
}

// Одна парта на двоих + два стула
function DeskUnit({ position, mats }: { position: [number, number, number]; mats: ReturnType<typeof useMaterials> }) {
  return (
    <group position={position}>
      {/* столешница */}
      <Box args={[1.3, 0.05, 0.6]} position={[0, 0.74, 0]} material={mats.deskTop} />
      {/* передняя панель */}
      <Box args={[1.3, 0.32, 0.04]} position={[0, 0.56, -0.28]} material={mats.deskTop} />
      {/* ножки */}
      <Box args={[0.05, 0.74, 0.05]} position={[-0.6, 0.37, 0.25]} material={mats.deskLeg} />
      <Box args={[0.05, 0.74, 0.05]} position={[0.6, 0.37, 0.25]} material={mats.deskLeg} />
      {/* два стула */}
      {[-0.33, 0.33].map((dx) => (
        <group key={dx} position={[dx, 0, 0.42]}>
          <Box args={[0.4, 0.04, 0.4]} position={[0, 0.46, 0]} material={mats.chair} />
          <Box args={[0.4, 0.42, 0.04]} position={[0, 0.67, 0.18]} material={mats.chair} />
          <Box args={[0.04, 0.46, 0.04]} position={[-0.17, 0.23, -0.16]} material={mats.deskLeg} />
          <Box args={[0.04, 0.46, 0.04]} position={[0.17, 0.23, -0.16]} material={mats.deskLeg} />
        </group>
      ))}
    </group>
  );
}

function Classroom({ id, floor }: { id: string; floor: number }) {
  const mats = useMaterials();

  // 3 ряда × 2 парты — обращены к доске (доска на стене -Z)
  const desks = useMemo(() => {
    const out: [number, number, number][] = [];
    const cols = [-2.0, 0, 2.0];
    const rows = [-0.4, 1.6, 3.4]; // ближе к зрителю → дальше от доски
    for (const z of rows) for (const x of cols) out.push([x, 0, z]);
    return out;
  }, []);

  return (
    <group>
      {/* Пол / потолок */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.floor} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>

      {/* Задняя стена (с доской), за ней доска */}
      <Box args={[W, H, T]} position={[0, H / 2, -D / 2]} material={mats.wallAccent} />
      {/* Левая / правая стены */}
      <Box args={[T, H, D]} position={[-W / 2, H / 2, 0]} material={mats.wall} />
      <Box args={[T, H, D]} position={[W / 2, H / 2, 0]} material={mats.wall} />

      {/* Школьная доска на задней стене */}
      <group position={[0, 1.55, -D / 2 + T / 2 + 0.03]}>
        <Box args={[3.8, 1.4, 0.06]} position={[0, 0, 0]} material={mats.frame} />
        <Box args={[3.6, 1.22, 0.04]} position={[0, 0, 0.03]} material={mats.board} />
      </group>

      {/* Учительский стол у доски */}
      <group position={[-2.4, 0, -D / 2 + 1.1]}>
        <Box args={[1.5, 0.05, 0.7]} position={[0, 0.76, 0]} material={mats.teacher} />
        <Box args={[1.5, 0.7, 0.04]} position={[0, 0.4, -0.31]} material={mats.teacher} />
        <Box args={[0.05, 0.76, 0.05]} position={[0.7, 0.38, 0.3]} material={mats.deskLeg} />
        <Box args={[0.05, 0.76, 0.05]} position={[-0.7, 0.38, 0.3]} material={mats.deskLeg} />
      </group>

      {/* Окна на левой стене */}
      {[-1.4, 1.4].map((z) => (
        <group key={z} position={[-W / 2 + T / 2 + 0.02, 1.6, z]}>
          <Box args={[0.04, 1.5, 1.7]} position={[0, 0, 0]} material={mats.glass} />
          <Box args={[0.06, 1.62, 0.07]} position={[0, 0, -0.85]} material={mats.mullion} />
          <Box args={[0.06, 1.62, 0.07]} position={[0, 0, 0.85]} material={mats.mullion} />
          <Box args={[0.06, 0.07, 1.7]} position={[0, 0.75, 0]} material={mats.mullion} />
          <Box args={[0.06, 0.07, 1.7]} position={[0, -0.75, 0]} material={mats.mullion} />
          <Box args={[0.06, 0.07, 1.7]} position={[0, 0, 0]} material={mats.mullion} />
        </group>
      ))}

      {/* Дверь на правой стене */}
      <group position={[W / 2 - T / 2 - 0.02, 1.05, 2.0]}>
        <Box args={[0.05, 2.1, 0.95]} position={[0, 0, 0]} material={mats.door} />
        <mesh position={[-0.06, 0, 0.32]} material={mats.frame}>
          <sphereGeometry args={[0.05, 12, 12]} />
        </mesh>
      </group>

      {/* Парты */}
      {desks.map((p, i) => <DeskUnit key={i} position={p} mats={mats} />)}

      {/* Табличка с номером над доской */}
      <Text
        position={[0, 2.7, -D / 2 + T / 2 + 0.05]}
        fontSize={0.34}
        color="#0f2540"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor="#ffffff"
      >
        {`Кабинет ${id}`}
      </Text>
      <Text
        position={[0, 2.34, -D / 2 + T / 2 + 0.05]}
        fontSize={0.17}
        color="#3b7a8c"
        anchorX="center"
        anchorY="middle"
      >
        {`${floor} этаж`}
      </Text>
    </group>
  );
}

export default Classroom;
