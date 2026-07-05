"use client";

import React, { useMemo } from "react";
import { NAV, Pt, RoomRoute, FLOOR_VIEW, STAIR_CORES } from "../data/navigatorData";

// Точки-стрелки вдоль ломаной линии (равномерно) — чтобы было видно направление.
function arrowsAlong(points: Pt[], spacing: number) {
  const out: { x: number; y: number; a: number }[] = [];
  if (points.length < 2) return out;
  let acc = spacing * 0.6;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    while (acc < len) {
      out.push({ x: x1 + (dx * acc) / len, y: y1 + (dy * acc) / len, a: ang });
      acc += spacing;
    }
    acc -= len;
  }
  return out;
}

function polyStr(points: Pt[]) {
  return points.map((p) => `${p[0]},${p[1]}`).join(" ");
}

// Последовательность подъёма по лестнице к этажу TF.
// Для целого этажа — все полные этажи 1..TF (чтобы змейка была и на промежуточных).
// Для полуэтажа (2.5/3.5/4.5) — напрямую [1, TF] (это самостоятельные цели).
function climbSequence(TF: number): number[] {
  if (Number.isInteger(TF)) return Array.from({ length: TF }, (_, i) => i + 1);
  return [1, TF];
}

export default function NavigatorMap({
  floor,
  targetRoom,
  onStairClick,
  dark,
}: {
  floor: number;
  targetRoom: string | null;
  onStairClick: (floor: number) => void;
  dark: boolean;
}) {
  const meta = NAV.floorMeta[String(floor)];
  const data: RoomRoute | null = targetRoom ? NAV.rooms[targetRoom] : null;

  const view = useMemo(() => {
    if (!meta) return null;
    // viewBox по габаритам здания на этом этаже (фикс «прыжка» при переключении).
    const vb = FLOOR_VIEW[String(floor)] || ([0, 0, meta.w, meta.h] as [number, number, number, number]);
    // Размеры элементов считаем от видимой ширины → на экране они одинаковы на всех этажах.
    const scaleRef = vb[2] / 2150;
    const ROUTE = "#2563eb";
    const stroke = 11 * scaleRef;
    const arrowSize = 16 * scaleRef;

    let routePts: Pt[] | null = null;
    let target: Pt | null = null;
    let stair: { at: Pt; toFloor: number } | null = null;
    let transit = false; // промежуточный этаж (показываем «продолжайте подъём»)

    if (data) {
      const TF = data.floor;
      const climb = climbSequence(TF);
      // Левый/правый лестничный узел — по тому, где на 1 этаже заканчивается stairHint.
      const side: "left" | "right" =
        data.stairHint && data.stairHint[data.stairHint.length - 1][0] >= 1075 ? "right" : "left";
      const coreFor = (f: number): Pt | null => STAIR_CORES[side][String(f)] || null;
      const idx = climb.indexOf(floor);

      if (floor === TF && data.path) {
        // Финишный этаж: маршрут от лестницы до кабинета.
        routePts = data.path;
        target = data.path[data.path.length - 1];
      } else if (floor === 1 && TF > 1 && data.stairHint) {
        // Старт: от «ВЫ ЗДЕСЬ» до лестницы, кнопка — на следующий этаж.
        routePts = [NAV.KIOSK, ...data.stairHint];
        stair = { at: data.stairHint[data.stairHint.length - 1], toFloor: climb[1] };
      } else if (Number.isInteger(TF) && idx > 0 && floor < TF) {
        // Промежуточный полный этаж: короткая «змейка» у лестницы + шаг вверх.
        const core = coreFor(floor);
        if (core) {
          transit = true;
          routePts = [
            [core[0], core[1] + 130],
            [core[0] - 78, core[1] + 46],
            [core[0] + 14, core[1] - 6],
            [core[0], core[1] - 40],
          ];
          stair = { at: core, toFloor: climb[idx + 1] };
        }
      }
    }
    return { vb, scaleRef, ROUTE, stroke, arrowSize, routePts, target, stair, transit };
  }, [meta, data, floor]);

  if (!meta || !view) return null;
  const s = view.scaleRef;
  const vb = view.vb;

  const Marker = ({ x, y, label, sub, color, ring, pop }: { x: number; y: number; label: string; sub?: string; color: string; ring: string; pop?: boolean }) => {
    const r = 18 * s;
    return (
      <g className={pop ? "nav-pop" : undefined}>
        <circle className="nav-pulse" cx={x} cy={y} r={r + 4 * s} fill="none" stroke={ring} strokeWidth={4 * s} />
        <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={3.5 * s} />
        <rect x={x - 70 * s} y={y - r - 44 * s} width={140 * s} height={32 * s} rx={8 * s} fill={color} opacity={0.95} />
        <text x={x} y={y - r - 22 * s} textAnchor="middle" fontSize={20 * s} fontWeight={800} fill="#fff">{label}</text>
        {sub && (
          <text x={x} y={y + r + 30 * s} textAnchor="middle" fontSize={22 * s} fontWeight={800} fill={dark ? "#cdd9f5" : color} stroke={dark ? "#0a1020" : "#fff"} strokeWidth={0.6 * s} paintOrder="stroke">{sub}</text>
        )}
      </g>
    );
  };

  // подсветка тёмной темы: инвертируем план → тёмный фон, светлые стены, цвета сохранены
  const imgFilter = dark ? "invert(0.9) hue-rotate(180deg) brightness(0.95) contrast(1.05)" : "none";

  return (
    <svg viewBox={`${vb[0]} ${vb[1]} ${vb[2]} ${vb[3]}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full" style={{ display: "block" }}>
      <image key={`${floor}-${dark}`} className="nav-fade" href={meta.src} x={0} y={0} width={meta.w} height={meta.h} style={{ filter: imgFilter }} />

      {/* Маршрут: сплошная линия + бегущие штрихи поверх */}
      {view.routePts && (
        <g className="nav-fade">
          <polyline points={polyStr(view.routePts)} fill="none" stroke={view.ROUTE} strokeWidth={view.stroke} strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
          <polyline className="nav-route-flow" points={polyStr(view.routePts)} fill="none" stroke={dark ? "#bae6fd" : "#ffffff"} strokeWidth={view.stroke * 0.42} strokeLinecap="round" strokeDasharray="10 22" opacity={0.95} />
          {arrowsAlong(view.routePts, 170 * s).map((p, i) => (
            <g key={i} transform={`translate(${p.x},${p.y}) rotate(${p.a})`}>
              <polygon points={`0,0 ${-view.arrowSize},${-view.arrowSize * 0.6} ${-view.arrowSize},${view.arrowSize * 0.6}`} fill="#fff" stroke={view.ROUTE} strokeWidth={2 * s} transform={`translate(${view.arrowSize * 0.5},0)`} />
            </g>
          ))}
        </g>
      )}

      {floor === 1 && <Marker x={NAV.KIOSK[0]} y={NAV.KIOSK[1]} label="ВЫ ЗДЕСЬ" color="#16a34a" ring="#22c55e" />}

      {/* На промежуточном этаже — отметка «вы поднялись сюда» у лестницы */}
      {view.transit && view.stair && (
        <Marker x={view.stair.at[0]} y={view.stair.at[1] + 130} label={`${floor} этаж`} color="#16a34a" ring="#22c55e" />
      )}

      {view.target && <Marker key={`t-${targetRoom}-${floor}`} x={view.target[0]} y={view.target[1]} label="ЦЕЛЬ" sub={targetRoom || undefined} color="#2563eb" ring="#3b82f6" pop />}

      {view.stair && (
        <g className="nav-pop" style={{ cursor: "pointer" }} onClick={() => onStairClick(view.stair!.toFloor)}>
          <circle className="nav-pulse" cx={view.stair.at[0]} cy={view.stair.at[1]} r={23 * s + 4 * s} fill="none" stroke="#ffa726" strokeWidth={4 * s} />
          <circle cx={view.stair.at[0]} cy={view.stair.at[1]} r={23 * s} fill="#ff9800" stroke="#fff" strokeWidth={3.5 * s} />
          <rect x={view.stair.at[0] - 150 * s} y={view.stair.at[1] - 23 * s - 50 * s} width={300 * s} height={36 * s} rx={10 * s} fill="#ea580c" />
          <text x={view.stair.at[0]} y={view.stair.at[1] - 23 * s - 25 * s} textAnchor="middle" fontSize={22 * s} fontWeight={800} fill="#fff">↑ Поднимитесь на {view.stair.toFloor} этаж</text>
        </g>
      )}
    </svg>
  );
}
