"use client";

import React, { useEffect, useRef, useState } from 'react';
import { flightControl } from '../data/flightControl';

const MAX_RADIUS = 64;   // макс. вынос ручки, px
const DEAD_ZONE = 0.12;  // мёртвая зона у центра

/**
 * Плавающий экранный джойстик для киоска (без клавиатуры).
 * Работает только в режиме «Облёт». Появляется там, где нажали, — но ТОЛЬКО в
 * левой/центральной зоне экрана (≈левые 60%). Правые ~40% не перекрыты этим
 * слоем: нажатия там крутят камеру (обзор «головой», см. CameraManager).
 * Джойстик «эластичный»: вызывается слева/по центру, но тянуть ручку после
 * захвата можно куда угодно (pointer capture).
 *
 * Логика отклика: после мёртвой зоны применяется мягкая кривая — у центра
 * управление точное (медленно), к краю выходит на полную скорость/поворот.
 * Вертикаль ручки — идти вперёд/назад, горизонталь — поворот.
 */
const JOY_ZONE_WIDTH = '60%';

// Мягкая кривая отклика: 0 в мёртвой зоне, плавный разгон до 1 к краю.
function curve(v: number): number {
  const a = Math.abs(v);
  if (a < DEAD_ZONE) return 0;
  const t = Math.min(1, (a - DEAD_ZONE) / (1 - DEAD_ZONE));
  return Math.sign(v) * Math.pow(t, 1.4);
}

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

    const nx = dx / MAX_RADIUS;
    const ny = dy / MAX_RADIUS;
    flightControl.active = true;
    flightControl.moveY = -curve(ny); // вверх по экрану = вперёд
    flightControl.turnX = curve(nx);  // вправо по экрану = поворот вправо
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
  const BASE = MAX_RADIUS * 2 + 36;

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
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2.5 animate-fade-in">
          <div className="relative w-16 h-16 rounded-full border border-sky-300/25 bg-slate-900/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_34px_-8px_rgba(56,189,248,0.45)]">
            <span className="absolute inset-0 rounded-full border border-sky-300/15 animate-ping" />
            <div className="w-7 h-7 rounded-full bg-gradient-to-b from-sky-300/80 to-sky-600/80 border border-white/30 animate-pulse" />
            <span className="absolute top-1 text-sky-200/45 text-[7px] leading-none">▲</span>
            <span className="absolute bottom-1 text-sky-200/45 text-[7px] leading-none">▼</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-slate-200 text-[10px] font-mono tracking-wide">
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
          {/* База — «стеклянное» кольцо со свечением по силе нажатия */}
          <div
            className="rounded-full border border-sky-300/30 bg-slate-900/35 backdrop-blur-md"
            style={{
              width: BASE,
              height: BASE,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 ${20 + magnitude * 42}px ${magnitude * 6}px rgba(56,189,248,${0.14 + magnitude * 0.34}), inset 0 0 30px rgba(0,0,0,0.5)`,
            }}
          />
          {/* Кольцо силы (растёт и ярчает с выносом ручки) */}
          <div
            className="absolute top-0 left-0 rounded-full border-2 border-sky-400"
            style={{
              width: BASE,
              height: BASE,
              transform: `translate(-50%, -50%) scale(${0.55 + magnitude * 0.45})`,
              opacity: 0.2 + magnitude * 0.5,
            }}
          />
          {/* Ручка — градиентная сфера с бликом */}
          <div
            className="absolute top-0 left-0 rounded-full border border-white/50 bg-gradient-to-b from-sky-300 to-sky-600"
            style={{
              width: 58,
              height: 58,
              transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px)) scale(${1 + magnitude * 0.08})`,
              boxShadow: `0 6px 20px rgba(14,165,233,${0.5 + magnitude * 0.3}), inset 0 2px 6px rgba(255,255,255,0.45)`,
            }}
          >
            <span className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full bg-white/45 blur-[1px]" />
          </div>
        </div>
      )}
    </div>
  );
}
