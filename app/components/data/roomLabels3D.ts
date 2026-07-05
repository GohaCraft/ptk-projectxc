// ─────────────────────────────────────────────────────────────────────────────
//  НОМЕРА АУДИТОРИЙ В 3D-МОДЕЛИ
//
//  Позиции берутся ИЗ ДАННЫХ НАВИГАТОРА автоматически: последняя точка маршрута
//  кабинета — это его место на 2D-плане этажа. Пиксели плана переводятся в метры
//  мира аффинной привязкой: рамка здания на плане (FLOOR_VIEW — уже откалибрована
//  для навигатора) растягивается на мировую рамку здания из Scene3D. Ничего не
//  расставляем вручную — все ~80 кабинетов маппятся одной формулой; правится
//  только WORLD, если вся сетка съехала целиком.
// ─────────────────────────────────────────────────────────────────────────────

import { NAV, Pt, FLOOR_VIEW } from './navigatorData';

// Мировая рамка здания (внешние габариты корпусов в Scene3D, метры):
//  X: левое крыло (-22.78 − 16.25/2) … правое крыло (21.305 + 13.30/2)
//  Z: верх правого крыла (−3.085 − 43.17/2) … низ левого крыла (9.415 + 56.47/2)
const WORLD = { x0: -30.9, z0: -24.7, w: 58.9, h: 62.3 };

/** Пиксель плана этажа → мировые [x, z]. Ось Y плана совпадает с осью Z мира. */
export function planToWorld(floor: number, p: Pt): [number, number] | null {
  const vb = FLOOR_VIEW[String(floor)];
  if (!vb) return null;
  return [
    WORLD.x0 + ((p[0] - vb[0]) / vb[2]) * WORLD.w,
    WORLD.z0 + ((p[1] - vb[1]) / vb[3]) * WORLD.h,
  ];
}

// Уровень пола этажа по Y (согласовано с getFloorHeight в CameraManager).
function floorBaseY(f: number): number {
  if (f === 1) return 1.5;
  if (f === 2) return 4.4;
  if (f === 2.5) return 5.85;
  if (f === 3) return 7.3;
  if (f === 3.5) return 8.75;
  if (f === 4) return 10.2;
  return 13.1; // 4.5 / чердак
}

export interface RoomLabel3D {
  id: string;
  position: [number, number, number];
}

// Селектор этажей 3D-модели: 1..4, 5 = чердак, 6 = вся модель.
// Полуэтажи навигатора показываем на срезе этажа над ними: 2.5→3, 3.5→4, 4.5→5.
function viewFloorFor(f: number): number {
  return Math.ceil(f) === 5 ? 5 : Math.ceil(f);
}

// Предрасчёт один раз на загрузке модуля: этаж просмотра → список меток.
// Берём только «числовые» кабинеты (номера аудиторий) — как просил заказчик.
export const ROOM_LABELS_BY_FLOOR: Record<number, RoomLabel3D[]> = (() => {
  const out: Record<number, RoomLabel3D[]> = {};
  for (const [id, room] of Object.entries(NAV.rooms)) {
    if (!/^\d/.test(id)) continue;            // «Столовая» и т.п. — пропускаем
    if (!room.path || room.path.length === 0) continue;
    const at = room.path[room.path.length - 1]; // конечная точка маршрута = кабинет
    const xz = planToWorld(room.floor, at);
    if (!xz) continue;
    const vf = viewFloorFor(room.floor);
    // Метка «над кабинетом»: под потолком своего уровня.
    const y = floorBaseY(room.floor) + 2.35;
    (out[vf] ||= []).push({ id, position: [xz[0], y, xz[1]] });
  }
  return out;
})();
