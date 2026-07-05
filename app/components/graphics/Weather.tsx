"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { weatherState } from "../data/weatherState";

/* --------------------------------------------------------------
   Осадки на InstancedMesh: дождь (вытянутые капли) и снег (хлопья).
   Оптимизировано для слабого киоска (Core i3 / 4 ГБ):
   • переиспользуем scratch-объекты — НОЛЬ аллокаций в кадре (нет нагрузки на GC);
   • число активных частиц масштабируется интенсивностью (instancedMesh.count),
     при слабом дожде рисуем меньше капель;
   • когда осадков нет — цикл не выполняется вовсе.
   Физика: капли/хлопья наклоняются и сносятся реальным ветром, длинная ось
   капли направлена вдоль вектора скорости (естественные косые струи).
   -------------------------------------------------------------- */
const DROP_COUNT = 350;
const SNOW_COUNT = 250;

// Длинная ось капли — вдоль Y (направление падения); ориентацию задаём кватернионом.
const dropGeometry = new THREE.BoxGeometry(0.03, 0.38, 0.03);
const snowGeometry = new THREE.PlaneGeometry(0.18, 0.18, 1, 1);

// Общие scratch-объекты (вне рендера) — чтобы не аллоцировать в useFrame.
const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _up = new THREE.Vector3(0, 1, 0);
const _vel = new THREE.Vector3();

const HALF_SPREAD = 100; // частицы заполняют ±100 м вокруг здания
const SPAWN_TOP = 110;

export const WeatherEffects = ({
  rainIntensity = 0,
  snowIntensity = 0,
  windSpeed = 0,
  windDir = 0,
}: { rainIntensity: number; snowIntensity: number; windSpeed?: number; windDir?: number }) => {
  const dropMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xbcd2ee,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }), []);

  const snowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  }), []);

  const dropMesh = useRef<THREE.InstancedMesh>(null);
  const snowMesh = useRef<THREE.InstancedMesh>(null);

  // Стартовые случайные позиции (один раз на клиенте).
  useEffect(() => {
    if (!dropMesh.current || !snowMesh.current) return;
    for (let i = 0; i < DROP_COUNT; i++) {
      _mat.makeTranslation((Math.random() - 0.5) * 2 * HALF_SPREAD, Math.random() * SPAWN_TOP, (Math.random() - 0.5) * 2 * HALF_SPREAD);
      dropMesh.current.setMatrixAt(i, _mat);
    }
    for (let i = 0; i < SNOW_COUNT; i++) {
      _mat.makeTranslation((Math.random() - 0.5) * 2 * HALF_SPREAD, Math.random() * SPAWN_TOP + 30, (Math.random() - 0.5) * 2 * HALF_SPREAD);
      snowMesh.current.setMatrixAt(i, _mat);
    }
    dropMesh.current.instanceMatrix.needsUpdate = true;
    snowMesh.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((state, delta) => {
    const d = Math.min(0.05, delta); // защита от скачка после неактивной вкладки

    // Нормализуем интенсивность (API/пресеты дают 0..5) и считаем ветер.
    const rain01 = Math.min(1, Math.max(0, rainIntensity / 5));
    const snow01 = Math.min(1, Math.max(0, snowIntensity / 5));
    const dirRad = (windDir * Math.PI) / 180;
    // Горизонтальная скорость ветра (м/с -> юниты/с), с разумным потолком.
    const wMag = Math.min(20, windSpeed) * 0.35;
    const wX = -Math.sin(dirRad) * wMag;
    const wZ = Math.cos(dirRad) * wMag;

    // ── Дождь ───────────────────────────────────────────────
    const dm = dropMesh.current;
    if (dm) {
      const active = Math.ceil(DROP_COUNT * rain01);
      dm.count = active;
      if (active > 0) {
        const fall = 22 + 30 * rain01; // юниты/с — сильнее дождь, быстрее капли
        // Наклон струй: длинную ось Y совмещаем с вектором скорости капли.
        _vel.set(wX, -fall, wZ).normalize();
        _quat.setFromUnitVectors(_up, _vel);
        for (let i = 0; i < active; i++) {
          dm.getMatrixAt(i, _mat);
          _pos.setFromMatrixPosition(_mat);
          _pos.y -= fall * d;
          _pos.x += wX * d;
          _pos.z += wZ * d;
          if (_pos.y < 0) {
            _pos.set((Math.random() - 0.5) * 2 * HALF_SPREAD, SPAWN_TOP + Math.random() * 20, (Math.random() - 0.5) * 2 * HALF_SPREAD);
          }
          _mat.compose(_pos, _quat, _scale);
          dm.setMatrixAt(i, _mat);
        }
        dm.instanceMatrix.needsUpdate = true;
      }
    }

    // ── Снег ────────────────────────────────────────────────
    const sm = snowMesh.current;
    if (sm) {
      const active = Math.ceil(SNOW_COUNT * snow01);
      sm.count = active;
      if (active > 0) {
        const fall = 3 + 4 * snow01; // снег падает медленно
        const t = state.clock.elapsedTime;
        for (let i = 0; i < active; i++) {
          sm.getMatrixAt(i, _mat);
          _pos.setFromMatrixPosition(_mat);
          _pos.y -= fall * d;
          // дрейф: ветер + лёгкое кружение (порхание хлопьев)
          _pos.x += (wX * 0.6 + Math.sin(t + i * 0.13) * 1.6) * d;
          _pos.z += (wZ * 0.6 + Math.cos(t + i * 0.17) * 1.6) * d;
          if (_pos.y < 0) {
            _pos.set((Math.random() - 0.5) * 2 * HALF_SPREAD, SPAWN_TOP + Math.random() * 20, (Math.random() - 0.5) * 2 * HALF_SPREAD);
          }
          _mat.makeTranslation(_pos.x, _pos.y, _pos.z);
          sm.setMatrixAt(i, _mat);
        }
        sm.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <instancedMesh ref={dropMesh} args={[dropGeometry, dropMaterial, DROP_COUNT]} visible={rainIntensity > 0} frustumCulled={false} />
      <instancedMesh ref={snowMesh} args={[snowGeometry, snowMaterial, SNOW_COUNT]} visible={snowIntensity > 0} frustumCulled={false} />
    </>
  );
};

/* --------------------------------------------------------------
   ⚡ Lightning — гроза: редкие вспышки (засвет всей сцены) + короткий разряд.
   Дёшево: один источник света активен только во время грозы.
----------------------------------------------------------------*/
const Lightning = ({ active }: { active: boolean }) => {
  const lightRef = useRef<THREE.PointLight>(null);
  const boltRef = useRef<THREE.Mesh>(null);
  const flash = useRef(0);
  const timer = useRef(0);
  const nextAt = useRef(2.5);
  const pos = useRef<[number, number, number]>([0, 90, 0]);

  useFrame((_, delta) => {
    const L = lightRef.current;
    const B = boltRef.current;
    if (!active) {
      if (L) L.intensity = 0;
      if (B) B.visible = false;
      return;
    }
    timer.current += delta;
    if (flash.current > 0) {
      // затухание вспышки с лёгким мерцанием
      flash.current = Math.max(0, flash.current - delta * 5.5);
      const flick = 0.45 + Math.random() * 0.55;
      if (L) L.intensity = flash.current * flick * 9;
      if (B) B.visible = flash.current > 0.55;
    } else if (timer.current >= nextAt.current) {
      // новый разряд
      flash.current = 1;
      timer.current = 0;
      nextAt.current = 3 + Math.random() * 7; // следующий через 3–10 с
      const x = (Math.random() - 0.5) * 70;
      const z = (Math.random() - 0.5) * 70;
      pos.current = [x, 90, z];
      if (L) L.position.set(x, 90, z);
      if (B) B.position.set(x, 45, z);
    } else if (L) {
      L.intensity = 0;
      if (B) B.visible = false;
    }
  });

  return (
    <>
      <pointLight ref={lightRef} position={pos.current} color="#dce8ff" intensity={0} distance={500} decay={0.25} />
      <mesh ref={boltRef} position={[0, 45, 0]} visible={false}>
        <cylinderGeometry args={[0.15, 0.4, 90, 5]} />
        <meshBasicMaterial color="#eaf2ff" toneMapped={false} />
      </mesh>
    </>
  );
};

/* --------------------------------------------------------------
   🌫️ Туман — встроенный экспоненциальный туман сцены (FogExp2).
   Практически бесплатно: считается в шейдерах материалов, без доп.
   отрисовки. Плотность плавно лерпится по weatherState.fog, цвет —
   светлый днём / тёмный ночью. Небо/облака свой туман не получают
   (у них собственные шейдеры), поэтому «тонут» только объекты сцены —
   именно так выглядит настоящий туман: дальние здания растворяются.
----------------------------------------------------------------*/
const FOG_MAX_DENSITY = 0.018;

const FogController = () => {
  const { scene } = useThree();
  const target = useRef({ fog: weatherState.fog, isNight: weatherState.isNight });
  const fogRef = useRef<THREE.FogExp2 | null>(null);

  const dayColor = useMemo(() => new THREE.Color("#c8d2dc"), []);
  const nightColor = useMemo(() => new THREE.Color("#10141d"), []);
  const scratch = useMemo(() => new THREE.Color("#c8d2dc"), []);

  useEffect(() => {
    const unsub = weatherState.subscribe((s) => {
      target.current.fog = s.fog;
      target.current.isNight = s.isNight;
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    const fog = new THREE.FogExp2(0xc8d2dc, 0);
    scene.fog = fog;
    fogRef.current = fog;
    return () => { if (scene.fog === fog) scene.fog = null; };
  }, [scene]);

  useFrame((_, delta) => {
    const fog = fogRef.current;
    if (!fog) return;
    const d = Math.min(0.05, delta);
    const targetDensity = Math.max(0, Math.min(1, target.current.fog)) * FOG_MAX_DENSITY;
    fog.density = THREE.MathUtils.lerp(fog.density, targetDensity, d * 1.8);
    scratch.copy(target.current.isNight ? nightColor : dayColor);
    fog.color.lerp(scratch, d * 1.8);
  });

  return null;
};

export const WeatherLayer = () => {
  const [weather, setWeather] = useState({
    rain: weatherState.rain,
    snow: weatherState.snow,
    storm: weatherState.storm,
    windSpeed: weatherState.windSpeed,
    windDir: weatherState.windDir,
  });
  useEffect(() => {
    const unsubscribe = weatherState.subscribe((s) => {
      setWeather({ rain: s.rain, snow: s.snow, storm: s.storm, windSpeed: s.windSpeed, windDir: s.windDir });
    });
    return () => { unsubscribe(); };
  }, []);

  return (
    <>
      <WeatherEffects
        rainIntensity={weather.rain}
        snowIntensity={weather.snow}
        windSpeed={weather.windSpeed}
        windDir={weather.windDir}
      />
      <Lightning active={weather.storm > 0} />
      <FogController />
    </>
  );
};
