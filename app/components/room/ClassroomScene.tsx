"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  ИЗОЛИРОВАННЫЙ КАБИНЕТ (типовые шаблоны по типу помещения)
//
//  Лёгкая 3D-сцена ОДНОГО помещения — без здания и этажей вокруг. Тип шаблона
//  выбирается по названию кабинета (класс / лаборатория-мастерская / библиотека /
//  столовая / спортзал / актовый зал). В будущем каждый id получит свою реальную
//  отснятую/смоделированную геометрию — достаточно подменить ветку по room.id.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

export type RoomKind = 'class' | 'lab' | 'library' | 'canteen' | 'sport' | 'assembly';

// Тип помещения по названию (числовые кабинеты → обычный класс).
export function resolveKind(id: string): RoomKind {
  const s = id.toLowerCase();
  if (/спортзал|спорт/.test(s)) return 'sport';
  if (/библиотек/.test(s)) return 'library';
  if (/столов/.test(s)) return 'canteen';
  if (/мастерск|лаборат|разд\.|каб\./.test(s)) return 'lab';
  if (/актов/.test(s)) return 'assembly';
  return 'class';
}

// Габариты помещения по типу (метры): [ширина X, глубина Z, высота Y]
function dimsFor(kind: RoomKind): [number, number, number] {
  if (kind === 'sport') return [14, 9, 5.4];
  if (kind === 'assembly') return [12, 9.5, 4.8];
  if (kind === 'canteen') return [11, 8, 3.6];
  if (kind === 'library') return [9.4, 7, 3.4];
  return [8.4, 6.2, 3.25]; // class / lab
}

// Рекомендуемая камера/орбита под размер помещения.
export function cameraForKind(kind: RoomKind) {
  const [w, d] = dimsFor(kind);
  const r = Math.max(w, d);
  return {
    position: [r * 0.78, r * 0.5, r * 0.92] as [number, number, number],
    target: [0, 1.2, 0] as [number, number, number],
    min: r * 0.5,
    max: r * 1.7,
  };
}

const T = 0.16; // толщина стен

function useMaterials() {
  return useMemo(() => ({
    floor: new THREE.MeshStandardMaterial({ color: '#b58a5a', roughness: 0.72, metalness: 0.04 }),
    sportFloor: new THREE.MeshStandardMaterial({ color: '#c98b3f', roughness: 0.5 }),
    wall: new THREE.MeshStandardMaterial({ color: '#eef2f6', roughness: 0.94 }),
    wallAccent: new THREE.MeshStandardMaterial({ color: '#dfe7ee', roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#f7fafc', roughness: 1 }),
    board: new THREE.MeshStandardMaterial({ color: '#1f5e46', roughness: 0.6 }),
    frame: new THREE.MeshStandardMaterial({ color: '#cfd6dd', roughness: 0.5, metalness: 0.3 }),
    deskTop: new THREE.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.55 }),
    deskLeg: new THREE.MeshStandardMaterial({ color: '#8a9099', roughness: 0.4, metalness: 0.5 }),
    chair: new THREE.MeshStandardMaterial({ color: '#2f6fb0', roughness: 0.6 }),
    seat: new THREE.MeshStandardMaterial({ color: '#7a2f3a', roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: '#bfe3ef', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.34 }),
    mullion: new THREE.MeshStandardMaterial({ color: '#e7edf1', roughness: 0.5 }),
    door: new THREE.MeshStandardMaterial({ color: '#9c6b3f', roughness: 0.6 }),
    teacher: new THREE.MeshStandardMaterial({ color: '#7d5230', roughness: 0.55 }),
    shelf: new THREE.MeshStandardMaterial({ color: '#6f4a2c', roughness: 0.65 }),
    metal: new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: 0.35, metalness: 0.6 }),
    stage: new THREE.MeshStandardMaterial({ color: '#5a3320', roughness: 0.6 }),
    curtain: new THREE.MeshStandardMaterial({ color: '#7a1f2b', roughness: 0.85 }),
    counter: new THREE.MeshStandardMaterial({ color: '#c0c7cd', roughness: 0.4, metalness: 0.4 }),
  }), []);
}
type Mats = ReturnType<typeof useMaterials>;

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

// ── Общие элементы ──
function Shell({ w, d, h, mats, floorMat }: { w: number; d: number; h: number; mats: Mats; floorMat?: THREE.Material }) {
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat || mats.floor} receiveShadow>
        <planeGeometry args={[w, d]} />
      </mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceiling}>
        <planeGeometry args={[w, d]} />
      </mesh>
      <Box args={[w, h, T]} position={[0, h / 2, -d / 2]} material={mats.wallAccent} />
      <Box args={[T, h, d]} position={[-w / 2, h / 2, 0]} material={mats.wall} />
      <Box args={[T, h, d]} position={[w / 2, h / 2, 0]} material={mats.wall} />
    </group>
  );
}

function WindowsLeft({ w, d, h, mats }: { w: number; d: number; h: number; mats: Mats }) {
  const zs = d > 7 ? [-2.2, 0, 2.2] : [-1.4, 1.4];
  return (
    <>
      {zs.map((z) => (
        <group key={z} position={[-w / 2 + T / 2 + 0.02, h * 0.5, z]}>
          <Box args={[0.04, 1.5, 1.7]} position={[0, 0, 0]} material={mats.glass} />
          <Box args={[0.06, 1.62, 0.07]} position={[0, 0, -0.85]} material={mats.mullion} />
          <Box args={[0.06, 1.62, 0.07]} position={[0, 0, 0.85]} material={mats.mullion} />
          <Box args={[0.06, 0.07, 1.7]} position={[0, 0.75, 0]} material={mats.mullion} />
          <Box args={[0.06, 0.07, 1.7]} position={[0, -0.75, 0]} material={mats.mullion} />
        </group>
      ))}
    </>
  );
}

function Door({ w, d, mats }: { w: number; d: number; mats: Mats }) {
  return (
    <group position={[w / 2 - T / 2 - 0.02, 1.05, d / 2 - 1.2]}>
      <Box args={[0.05, 2.1, 0.95]} position={[0, 0, 0]} material={mats.door} />
      <mesh position={[-0.06, 0, 0.32]} material={mats.frame}>
        <sphereGeometry args={[0.05, 12, 12]} />
      </mesh>
    </group>
  );
}

function Board({ d, mats }: { d: number; mats: Mats }) {
  return (
    <group position={[0, 1.55, -d / 2 + T / 2 + 0.03]}>
      <Box args={[3.8, 1.4, 0.06]} position={[0, 0, 0]} material={mats.frame} />
      <Box args={[3.6, 1.22, 0.04]} position={[0, 0, 0.03]} material={mats.board} />
    </group>
  );
}

function DeskUnit({ position, mats, tall }: { position: [number, number, number]; mats: Mats; tall?: boolean }) {
  const top = tall ? 0.92 : 0.74;
  return (
    <group position={position}>
      <Box args={[1.3, 0.05, 0.6]} position={[0, top, 0]} material={tall ? mats.counter : mats.deskTop} />
      <Box args={[1.3, top - 0.42, 0.04]} position={[0, (top - 0.21), -0.28]} material={tall ? mats.counter : mats.deskTop} />
      <Box args={[0.05, top, 0.05]} position={[-0.6, top / 2, 0.25]} material={mats.deskLeg} />
      <Box args={[0.05, top, 0.05]} position={[0.6, top / 2, 0.25]} material={mats.deskLeg} />
      {!tall && [-0.33, 0.33].map((dx) => (
        <group key={dx} position={[dx, 0, 0.42]}>
          <Box args={[0.4, 0.04, 0.4]} position={[0, 0.46, 0]} material={mats.chair} />
          <Box args={[0.4, 0.42, 0.04]} position={[0, 0.67, 0.18]} material={mats.chair} />
        </group>
      ))}
      {tall && [-0.33, 0.33].map((dx) => (
        <group key={dx} position={[dx, 0, 0.5]}>
          <Box args={[0.34, 0.05, 0.34]} position={[0, 0.6, 0]} material={mats.metal} />
          <Box args={[0.04, 0.6, 0.04]} position={[0, 0.3, 0]} material={mats.metal} />
        </group>
      ))}
    </group>
  );
}

// ── Тип: класс / лаборатория ──
function ClassRoom({ kind, mats }: { kind: RoomKind; mats: Mats }) {
  const [w, d, h] = dimsFor(kind);
  const tall = kind === 'lab';
  const desks = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const z of [-0.4, 1.6, 3.4]) for (const x of [-2.0, 0, 2.0]) out.push([x, 0, z]);
    return out;
  }, []);
  return (
    <group>
      <Shell w={w} d={d} h={h} mats={mats} />
      <Board d={d} mats={mats} />
      <group position={[-2.4, 0, -d / 2 + 1.1]}>
        <Box args={[1.5, 0.05, 0.7]} position={[0, 0.76, 0]} material={mats.teacher} />
        <Box args={[1.5, 0.7, 0.04]} position={[0, 0.4, -0.31]} material={mats.teacher} />
      </group>
      <WindowsLeft w={w} d={d} h={h} mats={mats} />
      <Door w={w} d={d} mats={mats} />
      {desks.map((p, i) => <DeskUnit key={i} position={p} mats={mats} tall={tall} />)}
    </group>
  );
}

// ── Тип: библиотека ──
function Library({ mats }: { mats: Mats }) {
  const [w, d, h] = dimsFor('library');
  const spineColors = ['#a23b3b', '#3b6ea2', '#3b8a4f', '#b08a2e', '#7a4ea2', '#a2643b'];
  const Bookshelf = ({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) => (
    <group position={position} rotation={rotation}>
      <Box args={[2.2, 2.0, 0.4]} position={[0, 1.0, 0]} material={mats.shelf} />
      {[0.5, 1.05, 1.6].map((y) => (
        <group key={y}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Box key={i} args={[0.18, 0.34, 0.3]} position={[-0.95 + i * 0.22, y, 0.06]}
              material={new THREE.MeshStandardMaterial({ color: spineColors[(i + Math.round(y * 10)) % spineColors.length], roughness: 0.8 })} />
          ))}
        </group>
      ))}
    </group>
  );
  return (
    <group>
      <Shell w={w} d={d} h={h} mats={mats} />
      <WindowsLeft w={w} d={d} h={h} mats={mats} />
      <Door w={w} d={d} mats={mats} />
      {/* стеллажи у задней стены */}
      {[-2.6, 0, 2.6].map((x) => <Bookshelf key={x} position={[x, 0, -d / 2 + 0.32]} />)}
      {/* стеллажи у правой стены */}
      {[-1.4, 1.4].map((z) => <Bookshelf key={z} position={[w / 2 - 0.32, 0, z]} rotation={[0, -Math.PI / 2, 0]} />)}
      {/* читальные столы */}
      {[[-1.6, 1.2], [1.6, 1.2], [-1.6, 2.8], [1.6, 2.8]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Box args={[1.6, 0.05, 0.9]} position={[0, 0.74, 0]} material={mats.deskTop} />
          <Box args={[0.05, 0.74, 0.05]} position={[-0.7, 0.37, 0.35]} material={mats.deskLeg} />
          <Box args={[0.05, 0.74, 0.05]} position={[0.7, 0.37, 0.35]} material={mats.deskLeg} />
        </group>
      ))}
    </group>
  );
}

// ── Тип: столовая ──
function Canteen({ mats }: { mats: Mats }) {
  const [w, d, h] = dimsFor('canteen');
  return (
    <group>
      <Shell w={w} d={d} h={h} mats={mats} />
      <WindowsLeft w={w} d={d} h={h} mats={mats} />
      <Door w={w} d={d} mats={mats} />
      {/* раздаточная стойка у задней стены */}
      <Box args={[6, 1.0, 0.9]} position={[0, 0.5, -d / 2 + 0.7]} material={mats.counter} />
      <Box args={[6, 0.1, 1.0]} position={[0, 1.02, -d / 2 + 0.7]} material={mats.metal} />
      {/* длинные обеденные столы + лавки */}
      {[-3, 0, 3].map((x) => (
        <group key={x} position={[x, 0, 1.2]}>
          <Box args={[1.4, 0.06, 4.2]} position={[0, 0.75, 0]} material={mats.deskTop} />
          <Box args={[0.08, 0.75, 4.0]} position={[-0.55, 0.37, 0]} material={mats.deskLeg} />
          <Box args={[0.08, 0.75, 4.0]} position={[0.55, 0.37, 0]} material={mats.deskLeg} />
          <Box args={[0.4, 0.05, 4.0]} position={[-1.1, 0.45, 0]} material={mats.chair} />
          <Box args={[0.4, 0.05, 4.0]} position={[1.1, 0.45, 0]} material={mats.chair} />
        </group>
      ))}
    </group>
  );
}

// ── Тип: спортзал ──
function Sport({ mats }: { mats: Mats }) {
  const [w, d, h] = dimsFor('sport');
  const Hoop = ({ x, dir }: { x: number; dir: 1 | -1 }) => (
    <group position={[x, 0, 0]}>
      <Box args={[0.16, 3.05, 0.16]} position={[0, 1.52, 0]} material={mats.metal} />
      <Box args={[0.1, 1.05, 1.8]} position={[dir * 0.5, 2.9, 0]} material={mats.frame} />
      <mesh position={[dir * 0.62, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.metal}>
        <torusGeometry args={[0.23, 0.03, 8, 20]} />
      </mesh>
    </group>
  );
  return (
    <group>
      <Shell w={w} d={d} h={h} mats={mats} floorMat={mats.sportFloor} />
      {/* разметка площадки */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.5, 48]} />
        <meshStandardMaterial color="#f4f6f8" />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.1, d - 1]} />
        <meshStandardMaterial color="#f4f6f8" />
      </mesh>
      <WindowsLeft w={w} d={d} h={h} mats={mats} />
      <Door w={w} d={d} mats={mats} />
      <Hoop x={-w / 2 + 0.6} dir={1} />
      <Hoop x={w / 2 - 0.6} dir={-1} />
      {/* скамьи вдоль задней стены */}
      {[-3.5, 0, 3.5].map((x) => (
        <Box key={x} args={[2.6, 0.45, 0.4]} position={[x, 0.22, -d / 2 + 0.5]} material={mats.shelf} />
      ))}
    </group>
  );
}

// ── Тип: актовый зал ──
function Assembly({ mats }: { mats: Mats }) {
  const [w, d, h] = dimsFor('assembly');
  const rows = [0.0, 1.0, 2.0, 3.0];
  const cols = [-3.6, -2.4, -1.2, 0, 1.2, 2.4, 3.6];
  return (
    <group>
      <Shell w={w} d={d} h={h} mats={mats} />
      {/* сцена + занавес */}
      <Box args={[w - 1, 0.5, 2.4]} position={[0, 0.25, -d / 2 + 1.4]} material={mats.stage} />
      <Box args={[w - 1, h - 0.6, 0.2]} position={[0, (h - 0.6) / 2 + 0.3, -d / 2 + 0.3]} material={mats.curtain} />
      <WindowsLeft w={w} d={d} h={h} mats={mats} />
      <Door w={w} d={d} mats={mats} />
      {/* ряды кресел */}
      {rows.map((rz) => cols.map((cx) => (
        <group key={`${rz}-${cx}`} position={[cx, 0, rz]}>
          <Box args={[0.9, 0.06, 0.5]} position={[0, 0.46, 0]} material={mats.seat} />
          <Box args={[0.9, 0.55, 0.06]} position={[0, 0.73, 0.22]} material={mats.seat} />
        </group>
      )))}
    </group>
  );
}

function RoomLabel({ id, floor, kind }: { id: string; floor: number; kind: RoomKind }) {
  const [, d] = dimsFor(kind);
  return (
    <group>
      <Text position={[0, 2.7, -d / 2 + T / 2 + 0.06]} fontSize={0.34} color="#0f2540" anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor="#ffffff">
        {`Кабинет ${id}`}
      </Text>
      <Text position={[0, 2.34, -d / 2 + T / 2 + 0.06]} fontSize={0.17} color="#3b7a8c" anchorX="center" anchorY="middle">
        {`${floor} этаж`}
      </Text>
    </group>
  );
}

export default function RoomScene({ id, floor }: { id: string; floor: number }) {
  const mats = useMaterials();
  const kind = resolveKind(id);
  let body: React.ReactNode;
  if (kind === 'library') body = <Library mats={mats} />;
  else if (kind === 'canteen') body = <Canteen mats={mats} />;
  else if (kind === 'sport') body = <Sport mats={mats} />;
  else if (kind === 'assembly') body = <Assembly mats={mats} />;
  else body = <ClassRoom kind={kind} mats={mats} />;
  return (
    <group>
      {body}
      {kind !== 'sport' && kind !== 'assembly' && <RoomLabel id={id} floor={floor} kind={kind} />}
    </group>
  );
}
