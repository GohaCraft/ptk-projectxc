"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  ТИПОВОЙ КАБИНЕТ «ПО ФОТО» (учебный класс колледжа)
//
//  Собран по реальным фотографиям кабинета: мятные стены, подвесной потолок,
//  рыжий ламинат, светло-бежевые парты рядами, КРАСНЫЕ стулья на чёрных ножках,
//  зелёная меловая доска + белая интерактивная доска с проектором, окна с
//  красными вертикальными жалюзи и батареями, пробковый фото-стенд (мутный
//  коллаж без читаемых деталей), плакаты-схемы в рамках, шкаф, папки на столах.
//
//  Оптимизация: вся повторяющаяся геометрия «запечена» через mergeBoxes в
//  единые меши по материалу (дерево / красный пластик / чёрный металл / белый /
//  тёмный) — весь кабинет рисуется за ~25 draw call'ов.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeBoxes, BoxPart } from '../graphics/geometryMerge';
import { getClassroomTextures } from './classroomTextures';

const W = 8.4;   // ширина (X)
const D = 6.2;   // глубина (Z), доска на стене -Z
const H = 3.25;  // высота
const T = 0.16;  // толщина стен

export default function PhotoClassroom() {
  const tex = getClassroomTextures();

  const { mats, geos } = useMemo(() => {
    // ── Материалы ──
    const mats = {
      wall: new THREE.MeshStandardMaterial({ color: '#aadcc6', roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ color: '#d3aa74', roughness: 0.6 }),
      red: new THREE.MeshStandardMaterial({ color: '#d23f33', roughness: 0.55 }),
      black: new THREE.MeshStandardMaterial({ color: '#2c2f34', roughness: 0.4, metalness: 0.5 }),
      white: new THREE.MeshStandardMaterial({ color: '#edf0f2', roughness: 0.6 }),
      dark: new THREE.MeshStandardMaterial({ color: '#5a4a3c', roughness: 0.7 }),
      door: new THREE.MeshStandardMaterial({ color: '#a97b4d', roughness: 0.6 }),
      teal: new THREE.MeshStandardMaterial({ color: '#3fbfae', roughness: 0.7 }),
      blue: new THREE.MeshStandardMaterial({ color: '#2f5fc9', roughness: 0.7 }),
      light: new THREE.MeshBasicMaterial({ color: '#f7fafc' }),
    };

    // ── Наборы боксов по материалам ──
    const wood: BoxPart[] = [];
    const red: BoxPart[] = [];
    const black: BoxPart[] = [];
    const white: BoxPart[] = [];
    const dark: BoxPart[] = [];
    const teal: BoxPart[] = [];
    const blue: BoxPart[] = [];
    const light: BoxPart[] = [];

    // Парта (столешница + боковины + царга)
    const desk = (x: number, z: number) => {
      wood.push(
        { args: [1.35, 0.05, 0.55], pos: [x, 0.76, z] },
        { args: [0.05, 0.74, 0.5], pos: [x - 0.63, 0.37, z] },
        { args: [0.05, 0.74, 0.5], pos: [x + 0.63, 0.37, z] },
        { args: [1.2, 0.42, 0.04], pos: [x, 0.52, z - 0.23] },
      );
    };
    // Красный стул на чёрных ножках; dir=1 — лицом к доске (-Z)
    const chair = (x: number, z: number, dir = 1) => {
      red.push(
        { args: [0.4, 0.05, 0.42], pos: [x, 0.47, z] },
        { args: [0.4, 0.44, 0.05], pos: [x, 0.85, z + 0.2 * dir] },
      );
      for (const dx of [-0.16, 0.16]) for (const dz of [-0.16, 0.16])
        black.push({ args: [0.035, 0.47, 0.035], pos: [x + dx, 0.235, z + dz] });
    };

    // 3 колонки × 3 ряда парт, по 2 стула
    const cols = [-2.35, 0, 2.35];
    const rows = [-0.55, 0.85, 2.25];
    for (const z of rows) for (const x of cols) {
      desk(x, z);
      chair(x - 0.33, z + 0.55);
      chair(x + 0.33, z + 0.55);
    }

    // Учительский стол с монитором (справа от доски, как на фото) + стул
    wood.push(
      { args: [1.5, 0.05, 0.65], pos: [2.5, 0.76, -2.05] },
      { args: [0.05, 0.74, 0.6], pos: [1.8, 0.37, -2.05] },
      { args: [0.05, 0.74, 0.6], pos: [3.2, 0.37, -2.05] },
      { args: [1.35, 0.5, 0.04], pos: [2.5, 0.5, -2.33] },
    );
    black.push(
      { args: [0.5, 0.33, 0.035], pos: [2.5, 1.13, -2.2] },   // монитор
      { args: [0.06, 0.2, 0.06], pos: [2.5, 0.88, -2.2] },
      { args: [0.24, 0.02, 0.16], pos: [2.5, 0.79, -2.2] },
      { args: [0.42, 0.02, 0.15], pos: [2.5, 0.79, -1.95] },  // клавиатура
    );
    chair(2.5, -1.45, -1);

    // Окна на левой стене (-X): рамы + импосты (белые), жалюзи (красные)
    for (const z0 of [-1.35, 1.35]) {
      white.push(
        { args: [0.06, 0.08, 1.85], pos: [-W / 2 + 0.1, 2.55, z0] },
        { args: [0.06, 0.08, 1.85], pos: [-W / 2 + 0.1, 0.95, z0] },
        { args: [0.06, 1.65, 0.08], pos: [-W / 2 + 0.1, 1.75, z0 - 0.9] },
        { args: [0.06, 1.65, 0.08], pos: [-W / 2 + 0.1, 1.75, z0 + 0.9] },
        { args: [0.06, 1.6, 0.06], pos: [-W / 2 + 0.1, 1.75, z0] },        // средний импост
        { args: [0.1, 0.06, 2.0], pos: [-W / 2 + 0.14, 0.88, z0] },        // подоконник
      );
      // батарея под окном
      for (let i = 0; i < 7; i++)
        white.push({ args: [0.1, 0.5, 0.12], pos: [-W / 2 + 0.16, 0.42, z0 - 0.54 + i * 0.18] });
      // вертикальные жалюзи по бокам окна
      for (let i = 0; i < 4; i++) {
        red.push(
          { args: [0.02, 1.9, 0.1], pos: [-W / 2 + 0.24, 1.72, z0 - 1.06 + i * 0.09], rot: [0, 0.12, 0] },
          { args: [0.02, 1.9, 0.1], pos: [-W / 2 + 0.24, 1.72, z0 + 1.06 - i * 0.09], rot: [0, -0.12, 0] },
        );
      }
      red.push({ args: [0.06, 0.06, 2.3], pos: [-W / 2 + 0.24, 2.7, z0] }); // карниз
    }

    // Доски: рамки (мел — тёмная, интерактивная — чёрная тонкая), проектор
    dark.push({ args: [2.75, 1.25, 0.04], pos: [-1.15, 1.6, -D / 2 + 0.08] });   // рама меловой
    black.push({ args: [1.62, 1.16, 0.03], pos: [1.55, 1.72, -D / 2 + 0.08] });  // рама интерактивной
    white.push(
      { args: [0.3, 0.14, 0.42], pos: [1.55, 2.78, -1.35] },   // проектор
      { args: [0.04, 0.32, 0.04], pos: [1.55, 3.05, -1.35] },  // штанга
      { args: [2.75, 0.06, 0.1], pos: [-1.15, 0.92, -D / 2 + 0.1] }, // лоток для мела
    );

    // Плакаты-схемы в рамках на задней стене (+Z) — рамки
    for (const x of [-1.7, -0.6, 0.5, 1.6, 2.7])
      dark.push({ args: [0.62, 0.82, 0.03], pos: [x, 2.18, D / 2 - 0.08] });
    // Рама пробкового стенда на правой стене (+X)
    wood.push({ args: [0.03, 1.16, 1.84], pos: [W / 2 - 0.07, 1.85, 0.8] });

    // Шкаф-стеллаж у задней стены слева + папки на полках
    const sx = -2.85, sz = D / 2 - 0.32;
    dark.push(
      { args: [0.04, 2.1, 0.5], pos: [sx - 0.76, 1.05, sz] },
      { args: [0.04, 2.1, 0.5], pos: [sx + 0.76, 1.05, sz] },
      { args: [1.56, 0.04, 0.5], pos: [sx, 2.1, sz] },
      { args: [1.56, 0.04, 0.5], pos: [sx, 0.06, sz] },
      { args: [1.5, 0.03, 0.46], pos: [sx, 0.72, sz] },
      { args: [1.5, 0.03, 0.46], pos: [sx, 1.4, sz] },
      { args: [1.5, 2.06, 0.03], pos: [sx, 1.05, sz + 0.22] },
    );
    for (let i = 0; i < 5; i++)
      (i % 2 ? teal : blue).push({ args: [0.06, 0.3, 0.24], pos: [sx - 0.6 + i * 0.13, 0.9, sz - 0.05] });
    for (let i = 0; i < 4; i++)
      (i % 2 ? blue : teal).push({ args: [0.06, 0.3, 0.24], pos: [sx - 0.3 + i * 0.13, 1.58, sz - 0.05] });

    // Стопки папок на задних партах (как на фото: бирюзовые и синие)
    const pile = (arr: BoxPart[], x: number, z: number, n: number) => {
      for (let i = 0; i < n; i++)
        arr.push({ args: [0.34, 0.05, 0.26], pos: [x, 0.815 + i * 0.055, z], rot: [0, (i % 2 ? 0.12 : -0.1), 0] });
    };
    pile(teal, 2.15, 2.25, 3); pile(blue, 2.6, 2.3, 2);
    pile(blue, -0.2, 2.2, 3); pile(teal, 0.25, 2.3, 2);

    // Светильники в потолке (4 панели)
    for (const x of [-2.1, 2.1]) for (const z of [-1.5, 1.3])
      light.push({ args: [1.15, 0.02, 0.6], pos: [x, H - 0.02, z] });

    // Дверная коробка на правой стене
    dark.push(
      { args: [0.08, 2.12, 0.06], pos: [W / 2 - 0.09, 1.06, -2.5] },
      { args: [0.08, 2.12, 0.06], pos: [W / 2 - 0.09, 1.06, -1.48] },
      { args: [0.08, 0.06, 1.06], pos: [W / 2 - 0.09, 2.14, -1.99] },
    );

    const geos = {
      wood: mergeBoxes(wood), red: mergeBoxes(red), black: mergeBoxes(black),
      white: mergeBoxes(white), dark: mergeBoxes(dark), teal: mergeBoxes(teal),
      blue: mergeBoxes(blue), light: mergeBoxes(light),
    };
    return { mats, geos };
  }, []);

  // Текстурные материалы (после SSR-guard tex может быть null — тогда плоские цвета)
  const surf = useMemo(() => ({
    floor: tex
      ? new THREE.MeshStandardMaterial({ map: tex.floor, roughness: 0.65 })
      : new THREE.MeshStandardMaterial({ color: '#a9713f', roughness: 0.65 }),
    ceiling: tex
      ? new THREE.MeshStandardMaterial({ map: tex.ceiling, roughness: 0.95 })
      : new THREE.MeshStandardMaterial({ color: '#f3f5f6', roughness: 0.95 }),
    chalk: tex
      ? new THREE.MeshStandardMaterial({ map: tex.chalk, roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: '#2f5f4d', roughness: 0.85 }),
    cork: tex
      ? new THREE.MeshStandardMaterial({ map: tex.cork, roughness: 0.9 })
      : new THREE.MeshStandardMaterial({ color: '#b3854f', roughness: 0.9 }),
    poster: tex
      ? new THREE.MeshStandardMaterial({ map: tex.poster, roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ color: '#f5f3ee', roughness: 0.85 }),
    window: tex
      ? new THREE.MeshBasicMaterial({ map: tex.window })
      : new THREE.MeshBasicMaterial({ color: '#dde6ec' }),
    board: new THREE.MeshStandardMaterial({ color: '#f4f7f8', roughness: 0.3 }),
  }), [tex]);

  if (tex) {
    tex.floor.repeat.set(3.2, 2.4);
    tex.ceiling.repeat.set(W / 1.2, D / 1.2);
  }

  return (
    <group>
      {/* ── Оболочка ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={surf.floor} receiveShadow>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={surf.ceiling}>
        <planeGeometry args={[W, D]} />
      </mesh>
      <mesh position={[0, H / 2, -D / 2]} material={mats.wall}><boxGeometry args={[W, H, T]} /></mesh>
      <mesh position={[0, H / 2, D / 2]} material={mats.wall}><boxGeometry args={[W, H, T]} /></mesh>
      <mesh position={[-W / 2, H / 2, 0]} material={mats.wall}><boxGeometry args={[T, H, D]} /></mesh>
      <mesh position={[W / 2, H / 2, 0]} material={mats.wall}><boxGeometry args={[T, H, D]} /></mesh>

      {/* ── Склеенная геометрия (по материалу) ── */}
      {geos.wood && <mesh geometry={geos.wood} material={mats.wood} castShadow receiveShadow />}
      {geos.red && <mesh geometry={geos.red} material={mats.red} castShadow />}
      {geos.black && <mesh geometry={geos.black} material={mats.black} castShadow />}
      {geos.white && <mesh geometry={geos.white} material={mats.white} castShadow />}
      {geos.dark && <mesh geometry={geos.dark} material={mats.dark} castShadow />}
      {geos.teal && <mesh geometry={geos.teal} material={mats.teal} />}
      {geos.blue && <mesh geometry={geos.blue} material={mats.blue} />}
      {geos.light && <mesh geometry={geos.light} material={mats.light} />}

      {/* ── Текстурированные плоскости ── */}
      {/* Меловая доска */}
      <mesh position={[-1.15, 1.6, -D / 2 + 0.105]} material={surf.chalk}>
        <planeGeometry args={[2.6, 1.12]} />
      </mesh>
      {/* Интерактивная доска */}
      <mesh position={[1.55, 1.72, -D / 2 + 0.1]} material={surf.board}>
        <planeGeometry args={[1.55, 1.08]} />
      </mesh>
      {/* Пробковый фото-стенд (мутный коллаж) */}
      <mesh position={[W / 2 - 0.09, 1.85, 0.8]} rotation={[0, -Math.PI / 2, 0]} material={surf.cork}>
        <planeGeometry args={[1.78, 1.1]} />
      </mesh>
      {/* Плакаты-схемы */}
      {[-1.7, -0.6, 0.5, 1.6, 2.7].map((x) => (
        <mesh key={x} position={[x, 2.18, D / 2 - 0.1]} rotation={[0, Math.PI, 0]} material={surf.poster}>
          <planeGeometry args={[0.56, 0.76]} />
        </mesh>
      ))}
      {/* Окна (светящийся «вид на улицу») */}
      {[-1.35, 1.35].map((z0) => (
        <mesh key={z0} position={[-W / 2 + 0.085, 1.75, z0]} rotation={[0, Math.PI / 2, 0]} material={surf.window}>
          <planeGeometry args={[1.78, 1.58]} />
        </mesh>
      ))}
      {/* Дверь */}
      <mesh position={[W / 2 - 0.08, 1.03, -1.99]} material={mats.door}>
        <boxGeometry args={[0.06, 2.06, 0.96]} />
      </mesh>
    </group>
  );
}
