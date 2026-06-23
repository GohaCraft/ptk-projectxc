"use client";

import React, { useMemo } from "react";
import { NAV, Pt, RoomRoute } from "../data/navigatorData";

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

  // Геометрия маршрута для текущего этажа
  const view = useMemo(() => {
    if (!meta) return null;
    const scaleRef = meta.w / 2150; // масштаб элементов относительно эталона
    const ROUTE = "#2563eb";
    const stroke = 11 * scaleRef;
    const arrowSize = 16 * scaleRef;

    let routePts: Pt[] | null = null;
    let target: Pt | null = null;
    let stair: { at: Pt; toFloor: number } | null = null;

    if (data) {
      if (floor === data.floor && data.path) {
        routePts = data.path;
        target = data.path[data.path.length - 1];
      } else if (floor === 1 && data.floor > 1 && data.stairHint) {
        routePts = [NAV.KIOSK, ...data.stairHint];
        stair = { at: data.stairHint[data.stairHint.length - 1], toFloor: data.floor };
      }
    }
    const arrows = routePts ? arrowsAlong(routePts, 170 * scaleRef) : [];
    return { scaleRef, ROUTE, stroke, arrowSize, routePts, target, stair };
  }, [meta, data, floor]);

  if (!meta || !view) return null;
  const s = view.scaleRef;

  const Marker = ({ x, y, label, sub, color, ring }: { x: number; y: number; label: string; sub?: string; color: string; ring: string }) => {
    const r = 18 * s;
    return (
      <g>
        <circle cx={x} cy={y} r={r + 5 * s} fill="none" stroke={ring} strokeWidth={3 * s} opacity={0.6} />
        <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={3.5 * s} />
        <g>
          <rect
            x={x - 70 * s} y={y - r - 44 * s} width={140 * s} height={32 * s} rx={8 * s}
            fill={color} opacity={0.95}
          />
          <text x={x} y={y - r - 22 * s} textAnchor="middle" fontSize={20 * s} fontWeight={800} fill="#fff">
            {label}
          </text>
        </g>
        {sub && (
          <text x={x} y={y + r + 30 * s} textAnchor="middle" fontSize={22 * s} fontWeight={800} fill={color} stroke="#fff" strokeWidth={0.5 * s}>
            {sub}
          </text>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${meta.w} ${meta.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ display: "block" }}
    >
      <image href={meta.src} x={0} y={0} width={meta.w} height={meta.h} />

      {/* затемняющая вуаль в тёмной теме, чтобы план не слепил */}
      {dark && <rect x={0} y={0} width={meta.w} height={meta.h} fill="#0b1220" opacity={0.18} />}

      {/* Маршрут */}
      {view.routePts && (
        <>
          <polyline
            points={polyStr(view.routePts)}
            fill="none"
            stroke={view.ROUTE}
            strokeWidth={view.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.95}
          />
          {arrowsAlong(view.routePts, 170 * s).map((p, i) => (
            <g key={i} transform={`translate(${p.x},${p.y}) rotate(${p.a})`}>
              <polygon
                points={`0,0 ${-view.arrowSize},${-view.arrowSize * 0.6} ${-view.arrowSize},${view.arrowSize * 0.6}`}
                fill="#fff"
                stroke={view.ROUTE}
                strokeWidth={2 * s}
                transform={`translate(${view.arrowSize * 0.5},0)`}
              />
            </g>
          ))}
        </>
      )}

      {/* «ВЫ ЗДЕСЬ» на 1 этаже */}
      {floor === 1 && (
        <Marker x={NAV.KIOSK[0]} y={NAV.KIOSK[1]} label="ВЫ ЗДЕСЬ" color="#16a34a" ring="#22c55e" />
      )}

      {/* Цель */}
      {view.target && (
        <Marker x={view.target[0]} y={view.target[1]} label="ЦЕЛЬ" sub={targetRoom || undefined} color="#2563eb" ring="#3b82f6" />
      )}

      {/* Лестница: «Поднимитесь на N этаж» (кликабельно) */}
      {view.stair && (
        <g style={{ cursor: "pointer" }} onClick={() => onStairClick(view.stair!.toFloor)}>
          <circle cx={view.stair.at[0]} cy={view.stair.at[1]} r={23 * s + 4 * s} fill="none" stroke="#ffa726" strokeWidth={3 * s} />
          <circle cx={view.stair.at[0]} cy={view.stair.at[1]} r={23 * s} fill="#ff9800" stroke="#fff" strokeWidth={3.5 * s} />
          <rect
            x={view.stair.at[0] - 150 * s} y={view.stair.at[1] - 23 * s - 50 * s}
            width={300 * s} height={36 * s} rx={10 * s} fill="#ea580c"
          />
          <text x={view.stair.at[0]} y={view.stair.at[1] - 23 * s - 25 * s} textAnchor="middle" fontSize={22 * s} fontWeight={800} fill="#fff">
            ↑ Поднимитесь на {view.stair.toFloor} этаж
          </text>
        </g>
      )}
    </svg>
  );
}
