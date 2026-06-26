"use client";

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

// Служебные компоненты сцены (диагностика + оптимизация теней).
// Вынесены из Scene3D, чтобы основной файл не разрастался. Поведение не меняется.

export function FrameTracker({ onReady }: { onReady: () => void }) {
  const called = useRef(false);
  useFrame(() => {
    if (!called.current) {
      called.current = true;
      onReady();
    }
  });
  return null;
}

export function FpsTracker({ onFpsUpdate }: { onFpsUpdate: (fps: number) => void }) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      onFpsUpdate(fps);
      frameCount.current = 0;
      lastTime.current = now;
    }
  });
  return null;
}

/**
 * ShadowThrottle — карта теней не перерисовывается каждый кадр.
 * Сцена почти статична (солнце движется медленно), поэтому тень выглядит так же,
 * но GPU-проход глубины теней выполняется реже -> большой прирост FPS без потери вида.
 * Несколько кадров после монтирования обновляем каждый кадр (первая корректная тень).
 */
export function ShadowThrottle({ every = 3 }: { every?: number }) {
  const { gl } = useThree();
  const f = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);
  useFrame(() => {
    f.current++;
    if (f.current < 8 || f.current % every === 0) {
      gl.shadowMap.needsUpdate = true;
    }
  });
  return null;
}

/**
 * ShadowCasterCuller — «shadow caster culling».
 * Тень кидают только крупные структурные объёмы (стены, кровля, корпуса).
 * У мелкого декора (зубцы, оконные рамы, перила, мелкие пропсы) отключаем
 * castShadow: на саму картинку влияет незаметно, но проход карты теней
 * становится в разы дешевле. По исследованиям — до ~1.5× к FPS.
 *
 * Работает обходом графа сцены (один раз и при смене этажа/стен), поэтому
 * не нужно править сотни мешей вручную. Порог — по макс. размеру геометрии.
 */
export function ShadowCasterCuller({ minSize = 1.6, deps = [] as any[] }: { minSize?: number; deps?: any[] }) {
  const { scene, gl } = useThree();
  useEffect(() => {
    let culled = 0, kept = 0;
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    scene.traverse((o: any) => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingBox) return;
      box.copy(g.boundingBox);
      box.getSize(size);
      // макс. габарит в локальных координатах * масштаб объекта
      const s = o.getWorldScale(new THREE.Vector3());
      const maxDim = Math.max(size.x * s.x, size.y * s.y, size.z * s.z);
      if (maxDim < minSize) {
        if (o.castShadow) { o.castShadow = false; culled++; }
      } else {
        kept++;
      }
    });
    gl.shadowMap.needsUpdate = true;
    if (typeof window !== 'undefined' && (window as any).__perfDebug) {
      console.info(`[ShadowCuller] casters off: ${culled}, kept: ${kept}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return null;
}

/**
 * PerfStats — раз в секунду отдаёт наружу FPS, число draw calls и треугольников
 * (renderer.info). Чисто для нашей диагностики — оверлей в UI можно включать/выключать.
 */
export function PerfStats({ onStats }: { onStats: (s: { fps: number; calls: number; tris: number }) => void }) {
  const { gl } = useThree();
  const frames = useRef(0);
  const last = useRef(performance.now());
  useFrame(() => {
    frames.current++;
    const now = performance.now();
    if (now - last.current >= 1000) {
      const fps = Math.round((frames.current * 1000) / (now - last.current));
      onStats({ fps, calls: gl.info.render.calls, tris: gl.info.render.triangles });
      frames.current = 0;
      last.current = now;
    }
  });
  return null;
}
