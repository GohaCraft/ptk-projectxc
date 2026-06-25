"use client";

import React, { useEffect, useRef, useState } from 'react';
import { flightControl } from '../data/flightControl';

const MAX_RADIUS = 64;   // макс. вынос ручки, px
const DEAD_ZONE = 0.14;  // мёртвая зона у центра

/**
 * Плавающий экранный джойстик для киоска (без клавиатуры).
 * Работает только в режиме «Облёт». Появляется там, где нажали, — но ТОЛЬКО в
 * левой/центральной зоне экрана (≈левые 60%). Правые ~40% экрана НЕ перекрыты
 * этим слоем: нажатия там попадают на 3D-canvas и крутят камеру (обзор «головой»,
 * см. CameraManager). Так на ПК и на сенсоре можно одновременно идти (слева) и
 * осматриваться (справа). Джойстик «эластичный»: вызывается слева/по центру, но
 * тянуть ручку после захвата можно куда угодно (pointer capture).
 * Вертикаль ручки — идти вперёд/назад, горизонталь — поворот.
 */
// Доля ширины экрана слева, отданная под джойстик. Остальное справа — обзор.
const JOY_ZONE_WIDTH = '60%';

export default function FlightJoystick() {
  const [active, setActive] = useState(false);
  const [base, setBase] = useState({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerId = useRef<number | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  // Сброс ввода при размонтировании (выход из режима облёта)
  useEffect(() => () => flightControl.reset(), []);

  const updateFromPointer = (cx: number, cy: number) => {
    let dx = cx - base.x;
    let dy = cy - base.y;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    setKnob({ x: dx, y: dy });

    // нормализованный вектор с мёртвой зоной
    const nx = dx / MAX_RADIUS;
    const ny = dy / MAX_RADIUS;
    const apply = (v: number) => (Math.abs(v) < DEAD_ZONE ? 0 : v);
    flightControl.active = true;
    flightControl.moveY = -apply(ny); // вверх по экрану = вперёд
    flightControl.turnX = apply(nx);  // вправо по экрану = поворот вправо
  };

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null) return;
    pointerId.current = e.pointerId;
    try { layerRef.current?.setPointerCapture(e.pointerId); } catch {}
    setBase({ x: e.clientX, y: e.clientY });
    setKnob({ x: 0, y: 0 });
    setActive(true);
    flightControl.active = true;
    flightControl.moveY = 0;
    flightControl.turnX = 0;
  };

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    try { layerRef.current?.releasePointerCapture(e.pointerId); } catch {}
    setActive(false);
    flightControl.reset();
  };

  const magnitude = Math.min(1, Math.hypot(knob.x, knob.y) / MAX_RADIUS);

  return (
    <div
      ref={layerRef}
      id="flight_joystick_layer"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      className="absolute left-0 top-0 bottom-0 z-[6] touch-none select-none"
      style={{ pointerEvents: 'auto', width: JOY_ZONE_WIDTH }}
    >
      {/* Подсказка, пока джойстик не активен */}
      {!active && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 animate-fade-in">
          <div className="relative w-12 h-12 rounded-full border border-white/25 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-white/30 animate-pulse" />
            <span className="absolute -inset-1 rounded-full border border-white/10 animate-ping" />
          </div>
          <span className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md text-slate-200 text-[10px] font-mono tracking-wide">
            Слева — движение · справа — обзор
          </span>
        </div>
      )}

      {/* Сам джойстик */}
      {active && (
        <div
          className="absolute pointer-events-none"
          style={{ left: base.x, top: base.y, transform: 'translate(-50%, -50%)' }}
        >
          {/* База */}
          <div
            className="rounded-full border border-white/30 bg-white/5 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.45)]"
            style={{
              width: MAX_RADIUS * 2 + 28,
              height: MAX_RADIUS * 2 + 28,
              transform: 'translate(-50%, -50%)',
            }}
          />
          {/* Направляющее кольцо (подсветка силы нажатия) */}
          <div
            className="absolute top-0 left-0 rounded-full border-2 border-sky-400/50"
            style={{
              width: MAX_RADIUS * 2 + 28,
              height: MAX_RADIUS * 2 + 28,
              transform: 'translate(-50%, -50%)',
              opacity: 0.25 + magnitude * 0.55,
            }}
          />
          {/* Ручка */}
          <div
            className="absolute top-0 left-0 rounded-full bg-gradient-to-b from-sky-300 to-sky-500 shadow-[0_4px_14px_rgba(14,165,233,0.55)] border border-white/40"
            style={{
              width: 56,
              height: 56,
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
            }}
          />
        </div>
      )}
    </div>
  );
}
