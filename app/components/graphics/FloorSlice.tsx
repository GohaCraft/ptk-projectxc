"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * FloorSlice — показывает/прячет этаж с лёгкой анимацией «сборки/разборки».
 *
 * Переработано ради FPS: убрана прежняя система осколков (у каждого этажа был
 * свой instancedMesh + физика с загрузкой буферов каждый кадр — это сильно
 * резало кадры). Теперь — только трансформации (подъём снизу + лёгкое
 * масштабирование), что почти ничего не стоит и выглядит плавно.
 *
 * Когда этаж «осел» (или полностью скрыт) — useFrame выходит сразу, не делая
 * никакой работы в кадре.
 */
export const FloorSlice: React.FC<{
  activeFloor: number;
  floorIndex: number;
  children?: React.ReactNode;
}> = ({ activeFloor, floorIndex, children }) => {
  const isVisible = activeFloor >= floorIndex + 1;
  const groupRef = useRef<THREE.Group>(null);
  // прогресс 0..1: 0 — спрятан (внизу/сжат), 1 — на месте
  const prog = useRef(isVisible ? 1 : 0);

  // Стартовые состояния при смене видимости (без дёрганья)
  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    if (isVisible) {
      g.visible = true;
      // если появляемся «с нуля» — стартуем чуть снизу
      if (prog.current >= 1) {
        g.position.y = 0;
        g.scale.set(1, 1, 1);
      }
    }
  }, [isVisible]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.03);
    const target = isVisible ? 1 : 0;
    const p = prog.current;

    // Полностью осел/скрыт — ничего не считаем в кадре.
    if (Math.abs(p - target) < 0.004) {
      if (target === 1) {
        if (g.position.y !== 0) { g.position.y = 0; g.scale.set(1, 1, 1); }
        g.visible = true;
      } else if (g.visible) {
        g.visible = false;
      }
      return;
    }

    const np = THREE.MathUtils.damp(p, target, 9, dt);
    prog.current = np;
    g.visible = np > 0.01;

    // плавная кривая (smoothstep) — мягкий старт/финиш; чистый подъём снизу
    const e = np * np * (3 - 2 * np);
    g.position.y = (1 - e) * -9;
  });

  return (
    <group ref={groupRef} visible={isVisible}>
      {children}
    </group>
  );
};
