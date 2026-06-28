"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  ЭКРАН ОДНОГО КАБИНЕТА  (/room?id=305)
//
//  Самостоятельный лёгкий экран: читает id кабинета из URL, показывает его
//  изолированную 3D-сцену (без здания вокруг) и панель управления в стиле
//  3D-модели (тёмное стекло, бирюзовые акценты). Не трогает тяжёлый
//  BuildingModelViewer — отдельный, дешёвый по ресурсам путь для киоска.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { motion } from 'framer-motion';
import { ArrowLeft, Box as BoxIcon, RotateCcw } from 'lucide-react';
import { NAV } from '../data/navigatorData';
import RoomScene, { resolveKind, cameraForKind } from './ClassroomScene';

export default function RoomViewer() {
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // id берём из ?id= на клиенте (совместимо со static export)
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('id');
    setId(raw);
    setReady(true);
  }, []);

  const room = id && NAV.rooms[id] ? NAV.rooms[id] : null;
  const floor = room ? room.floor : 1;
  const kind = room ? resolveKind(id!) : 'class';
  const cam = cameraForKind(kind);

  const back = () => window.location.assign('/navigator');

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#070b14] text-slate-100 select-none">
      {/* ── 3D (монтируем, когда кабинет известен — камера зависит от типа) ── */}
      {ready && room && (
        <Canvas
          shadows
          dpr={[1, 1.6]}
          camera={{ position: cam.position, fov: 42 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#0a1018']} />
          <fog attach="fog" args={['#0a1018', cam.max * 1.2, cam.max * 2.6]} />

          <hemisphereLight args={['#ffffff', '#5b6472', 0.85]} />
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[6, 11, 4]}
            intensity={1.15}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <Environment preset="city" />

          <RoomScene id={id!} floor={floor} />

          <OrbitControls
            target={cam.target}
            enablePan={false}
            minDistance={cam.min}
            maxDistance={cam.max}
            minPolarAngle={0.25}
            maxPolarAngle={Math.PI / 2 - 0.04}
            enableDamping
            dampingFactor={0.08}
            autoRotate
            autoRotateSpeed={0.5}
          />
        </Canvas>
      )}

      {/* ── Верхняя панель в стиле 3D-меню ── */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 pointer-events-none">
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={back}
          className="pointer-events-auto group flex items-center gap-2 px-4 py-2.5 rounded-2xl
                     bg-white/[0.06] border border-teal-300/25 hover:border-teal-300/70 backdrop-blur-xl
                     text-slate-200 hover:text-white transition-colors
                     shadow-[0_10px_30px_-14px_rgba(45,212,191,0.55)]"
        >
          <ArrowLeft className="w-4 h-4 text-teal-300 group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-[13px] font-semibold tracking-wide">В навигатор</span>
        </motion.button>

        {room && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-none flex items-center gap-3 px-5 py-2.5 rounded-2xl
                       bg-[#0b1220]/80 border border-sky-400/25 backdrop-blur-xl
                       shadow-[0_14px_40px_-16px_rgba(56,189,248,0.5)]"
          >
            <BoxIcon className="w-4 h-4 text-sky-400" />
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-wide">Кабинет {id}</div>
              <div className="text-[11px] font-mono text-slate-400">{floor} этаж · 3D</div>
            </div>
          </motion.div>
        )}

        <div className="w-[112px]" />
      </div>

      {/* ── Нижняя подсказка ── */}
      {room ? (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 px-5 py-2.5 rounded-2xl
                     bg-[#0b1220]/70 border border-white/10 backdrop-blur-xl text-slate-300"
        >
          <RotateCcw className="w-4 h-4 text-teal-300" />
          <span className="text-[12px] font-medium tracking-wide">
            Тяните, чтобы осмотреть кабинет · колесо — приблизить
          </span>
        </motion.div>
      ) : ready ? (
        // id не задан или кабинет не найден
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#070b14]/90">
          <div className="text-center px-8">
            <div className="text-xl font-semibold mb-2">Кабинет не выбран</div>
            <div className="text-slate-400 text-sm mb-6">Откройте кабинет из навигатора.</div>
            <button
              onClick={back}
              className="px-6 py-3 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white text-sm font-semibold
                         shadow-[0_14px_42px_-12px_rgba(56,189,248,0.7)]"
            >
              Открыть навигатор
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
