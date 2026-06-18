"use client";
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';

export interface CustomWall {
  id: string;
  blockType: 'B' | 'B1' | 'B2';
  floorIdx: number;
  x: number; z: number; w: number; d: number;
  color?: string;
  isStairs?: boolean; isColumn?: boolean; isCustom?: boolean; angle?: number;
}

// ─────────────────────────────────────────────────────────────
// СИСТЕМА КООРДИНАТ (подтверждено по InteriorLayout.tsx):
//
//  position=[0,Y,0] для всех блоков (локальная система группы)
//  wall.x → мировой X,  wall.z → мировой Z
//
//  Блок Б  args=[29.31,11.6,24.88]  X:±14.655  Z:±12.44
//  Блок Б1 args=[16.25,13.2,56.47]  X:±8.125   Z:±28.235
//  Блок Б2 args=[13.30,13.2,43.17]  X:±6.65    Z:±21.585
//
//  Проёмы в наружных стенах (renderZWall в InteriorLayout):
//   Б  запад  (x=-14.655): gapZ=+6.115, gapW=2.65  → стык с Б1
//   Б  восток (x=+14.655): gapZ=-6.543, gapW=2.915 → стык с Б2
//   Б1 восток (x=+8.125):  gapZ=-1.0,   gapW=4.0   → стык с Б
//   Б2 запад  (x=-6.65):   gapZ=-3.458, gapW=2.915 → стык с Б
//
//  По плану БТИ (PDF этаж 1):
//   Север = Z отрицательный, Юг = Z положительный
//   Коридор пом.21 (79.7м²) идёт вдоль X (горизонталь)
//   z коридора: северная стена z≈+1.5, южная z≈+4.2  (ширина 2.7м)
// ─────────────────────────────────────────────────────────────

const T = 0.20;  // перегородка
const C = 0.30;  // коридорная/несущая

// Хелпер: горизонтальная стена (вдоль X)
const H = (id: string, bt: 'B'|'B1'|'B2', fi: number,
           xCenter: number, zPos: number, xLen: number, thick = T): CustomWall =>
  ({ id, blockType: bt, floorIdx: fi, x: xCenter, z: zPos, w: xLen, d: thick, isCustom: true });

// Хелпер: вертикальная стена (вдоль Z)
const V = (id: string, bt: 'B'|'B1'|'B2', fi: number,
           xPos: number, zCenter: number, zLen: number, thick = T): CustomWall =>
  ({ id, blockType: bt, floorIdx: fi, x: xPos, z: zCenter, w: thick, d: zLen, isCustom: true });

export function generateAllDefaultWalls(): CustomWall[] {
  const walls: CustomWall[] = [];

  // ═══════════════════════════════════════════════════════════
  // БЛОК Б — 1 ЭТАЖ
  // X: ±14.655  Z: ±12.44
  //
  // По плану БТИ:
  //  Северный фасад: z=-12.44
  //  Коридор пом.21: z=+1.5(сев.стена) до z=+4.2(юж.стена), вся длина X
  //  Северная зона (z=-12.44..+1.5): два ряда кабинетов
  //    Средняя стена (разделитель рядов): z=-3.2
  //    Ряд А (z=-12.44..-3.2): кабинеты 1,3,4,5,6,17,18,19,20 — 6 секций
  //    Ряд Б (z=-3.2..+1.5): кабинеты 2,7-12,15,16 — 6 секций
  //  Южная зона (z=+4.2..+12.44): теплоцентры, электрощитовая, мастерская
  //    пом.35(51.3м²), 36(11.8м²), 37(11.1м²), 38(51.2м²) и др.
  //  Лестницы: западная (x≈-11..-14) и восточная (x≈+11..+14)
  //  Проход запад→Б1: z=+6.115 (стык блоков), не ставить стену в этой зоне
  //  Проход восток→Б2: z=-6.543 (стык блоков)
  // ═══════════════════════════════════════════════════════════

  // Лестничные пролеты и стены холлов / коридоров
  walls.push(H('b_st_n_wall', 'B', 0, 0.0, -10.0, 7.0, C));
  walls.push(V('b_st_w_wall', 'B', 0, -3.5, -10.92, 1.84, C));
  walls.push(V('b_st_e_wall', 'B', 0, 3.5, -10.92, 1.84, C));

  // Поперечная перегородка, разделяющая северо-западные и северо-восточные кабинеты
  walls.push(H('b_mid_horizontal', 'B', 0, 0.0, -7.5, 28.1, C));
  walls.push(V('b_nw_divider', 'B', 0, -7.0, -9.67, 4.34, T));
  walls.push(V('b_ne_divider', 'B', 0, 7.0, -9.67, 4.34, T));

  // Центральные разделяющие стены
  walls.push(V('b_cent_w', 'B', 0, -2.0, -5.0, 5.0, T));
  walls.push(V('b_cent_e', 'B', 0, 2.0, -5.0, 5.0, T));
  walls.push(H('b_cent_h', 'B', 0, 0.0, -5.0, 4.0, T));

  // Стены главного гардероба / коридора на первом этаже Лит. Б
  walls.push(H('b_cor_n', 'B', 0, 0.0, -2.5, 28.1, C));
  walls.push(H('b_cor_s', 'B', 0, 0.0, 1.4, 28.1, C));



  // ═══════════════════════════════════════════════════════════
  // БЛОК Б1 — 1 ЭТАЖ
  // X: ±8.125  Z: ±28.235
  // Коридор вдоль Z (длинная ось), X-центр
  //
  // По плану: коридор по центру X, ширина ~2.3м (x: -1.15..+1.15)
  // Западная сторона (x: -8.125..-1.15): кабинеты глубиной ~7м
  // Восточная сторона (x: 1.15..+8.125): кабинеты глубиной ~7м
  // Проход на Б (z≈-1, т.е. у восточной стены x=+8.125 есть gap)
  //
  // Кабинеты по плану БТИ (пом. с площадями):
  //   1(64.3), 3(74.6), 5(53.8), 6(53.8), 7(9.6), 15(18.2), 16(38.4)
  //   17(74.0), 18(19.4), 19(73.7), 20(17.1) ...
  //   Глубина кабинета ~6.975м (8.125-1.15=6.975)
  //   Ширина (вдоль Z) варьируется: 64.3/6.975≈9.2, 74.6/6.975≈10.7 и т.д.
  // ═══════════════════════════════════════════════════════════

  // Стены коридора Б1 (вдоль Z) — Прецизионно по чертежу БТИ
  const b1_corrXW = -1.125;
  const b1_corrXE = 1.105;
  const b1_xW = -7.525;
  const b1_xE = 7.525;

  // Несущие продольные стены коридора (с проёмами и разрезами как на чертеже)
  // Западная стена коридора (от -21.115 до 27.635): длина 48.75, центр Z=3.26
  walls.push(V('b1_cw_main', 'B1', 0, b1_corrXW, 3.26, 48.75, C));

  // Eastern corridor wall (3 sections with gaps):
  // 1) from -27.635 to -21.115: length 6.52, center Z=-24.375
  walls.push(V('b1_ce_seg1', 'B1', 0, b1_corrXE, -24.375, 6.52, C));
  // 2) from -21.115 to -10.405: length 10.71, center Z=-15.76 (opens up -10.405 to -4.625)
  walls.push(V('b1_ce_seg2', 'B1', 0, b1_corrXE, -15.76, 10.71, C));
  // 3) from 2.255 to 27.635: length 25.38, center Z=14.945
  walls.push(V('b1_ce_seg3', 'B1', 0, b1_corrXE, 14.945, 25.38, C));

  // Transverse partitions of the WEST side (West)
  // Drawn on z: -21.115, -18.785, -7.055, -1.055, +1.875, +8.045, +13.425, +19.795
  // Length 6.40, center X = -4.325
  const b1_w_zs = [-21.115, -18.785, -7.055, -1.055, 1.875, 8.045, 13.425, 19.795];
  b1_w_zs.forEach((z, idx) => {
    // b1_wP_bti_1 (idx === 0) at z = -21.115 and b1_wP_bti_2 (idx === 1) at z = -18.785
    // are removed per user red-lines marking in the northern area!
    if (idx > 1) {
      walls.push(H(`b1_wP_bti_${idx + 1}`, 'B1', 0, -4.325, z, 6.40, T));
    }
  });

  // Longitudinal partition Cab. 108/109 is removed per user red-lines marking!

  // Transverse partitions of the EAST side (East)
  // Drawn on z (shifted downward after removing the bottom vestibule):
  // Length 6.42, center X = 4.315
  const b1_e_zs = [-21.115, -16.665, -13.295, -4.625, 2.255, 12.575, 15.575];
  b1_e_zs.forEach((z, idx) => {
    // b1_eP_bti_1 (idx === 0) at z = -21.115 and b1_eP_bti_2 (idx === 1) at z = -16.665
    // are removed per user red-lines marking in the northern area!
    if (idx > 1) {
      walls.push(H(`b1_eP_bti_${idx + 1}`, 'B1', 0, 4.315, z, 6.42, T));
    }
  });

  // Vertical partition of eastern toilets: x = 5.8, z = -11.85, length 2.89
  walls.push(V('b1_eP_toilet_v', 'B1', 0, 5.8, -11.85, 2.89, T));

  // Лестничные пролёты Б1
  walls.push(H('b1_stN', 'B1', 0,  0, -27.2, 7.5, T));
  walls.push(V('b1_stNv','B1', 0,  3.0, -27.6, 1.2, T));
  walls.push(H('b1_stS', 'B1', 0,  0,  27.2, 7.5, T));
  walls.push(V('b1_stSv','B1', 0,  3.0,  27.6, 1.2, T));


  // ═══════════════════════════════════════════════════════════
  // ПОЭТАЖНЫЕ СТЕНЫ ДЛЯ ТИПОВЫХ ЭТАЖЕЙ (2-4 ЭТАЖИ)
  // ═══════════════════════════════════════════════════════════
  for (let f = 1; f <= 3; f++) {
    // --- БЛОК Б1 (ТИПОВЫЕ ЭТАЖИ f) ---
    // Коридор на типичных этажах (длинный коридор)
    walls.push(V(`b1_cw_typ_${f}`, 'B1', f, b1_corrXW, 0, 55.27, C));
    walls.push(V(`b1_ce_typ_${f}`, 'B1', f, b1_corrXE, 0, 55.27, C));

    // Поперечные перегородки типичных этажей (z: -14.0, 0.0, 14.0)
    // Вест
    walls.push(H(`b1_w_typ_${f}_1`, 'B1', f, -4.325, -14.0, 6.40, T));
    walls.push(H(`b1_w_typ_${f}_2`, 'B1', f, -4.325, 0.0, 6.40, T));
    walls.push(H(`b1_w_typ_${f}_3`, 'B1', f, -4.325, 14.0, 6.40, T));
    // Ист
    walls.push(H(`b1_e_typ_${f}_1`, 'B1', f, 4.315, -14.0, 6.42, T));
    walls.push(H(`b1_e_typ_${f}_2`, 'B1', f, 4.315, 0.0, 6.42, T));
    walls.push(H(`b1_e_typ_${f}_3`, 'B1', f, 4.315, 14.0, 6.42, T));

    // Лестницы Б1 на верхних этажах
    walls.push(H(`b1_stN_typ_${f}`, 'B1', f,  0, -27.2, 7.5, T));
    walls.push(V(`b1_stNv_typ_${f}`,'B1', f,  3.0, -27.6, 1.2, T));
    walls.push(H(`b1_stS_typ_${f}`, 'B1', f,  0,  27.2, 7.5, T));
    walls.push(V(`b1_stSv_typ_${f}`,'B1', f,  3.0,  27.6, 1.2, T));

    // --- БЛОК Б (ТИПОВЫЕ ЭТАЖИ f) ---
    // Коридорные продольные стены Б
    walls.push(V(`b_cw_typ_${f}`, 'B', f, -12.0, 2.17, 19.34, C));
    walls.push(V(`b_ce_typ_${f}`, 'B', f, 12.0, 2.17, 19.34, C));
    // Поперечные перегородки на z: -2.5 и z: 5.0
    walls.push(H(`b_p_typ_${f}_1`, 'B', f, 0.0, -2.5, 24.0, T));
    walls.push(H(`b_p_typ_${f}_2`, 'B', f, 0.0, 5.0, 24.0, T));

    // Лестницы на верхних этажах
    walls.push(V(`b_stW1_typ_${f}`, 'B', f, -12.3, -10.5, 3.5, T));
    walls.push(H(`b_stW2_typ_${f}`, 'B', f, -11.0, -11.5, 1.8, T));
    walls.push(V(`b_stE1_typ_${f}`, 'B', f,  12.3, -10.5, 3.5, T));
    walls.push(H(`b_stE2_typ_${f}`, 'B', f,  11.0, -11.5, 1.8, T));

    // --- БЛОК Б2 (ТИПОВЫЕ ЭТАЖИ f) ---
    // Коридоры Б2
    const b2_corrXW = -1.0;
    const b2_corrXE = 1.0;
    walls.push(V(`b2_cw_typ_${f}`, 'B2', f, b2_corrXW, 0, 42.97, C));
    walls.push(V(`b2_ce_typ_${f}`, 'B2', f, b2_corrXE, 0, 42.97, C));
    // Поперечные перегородки на z: -10.0 и z: 10.0
    walls.push(H(`b2_p1_typ_${f}`, 'B2', f, -3.525, -10.0, 5.05, T));
    walls.push(H(`b2_p2_typ_${f}`, 'B2', f, -3.525, 10.0, 5.05, T));
    walls.push(H(`b2_p3_typ_${f}`, 'B2', f, 3.525, -10.0, 5.05, T));
    walls.push(H(`b2_p4_typ_${f}`, 'B2', f, 3.525, 10.0, 5.05, T));

    // Лестница Б2 (северный торец)
    walls.push(H(`b2_stN_typ_${f}`,  'B2', f,  0, -20.5, 6.5, T));
    walls.push(V(`b2_stNv_typ_${f}`, 'B2', f,  2.5, -21.0, 1.5, T));
  }

  // ═══════════════════════════════════════════════════════════
  // БЛОК Б2 — 1 ЭТАЖ (СТЕНЫ ПО ЧЕРТЕЖУ БТИ)
  // X: ±6.65  Z: ±21.585
  // ═══════════════════════════════════════════════════════════

  // Лестничные пролёты и помещения у северного фасада
  walls.push(H('b2_st_n_h1', 'B2', 0, 0.0, -19.0, 12.1, T));
  walls.push(H('b2_st_n_h2', 'B2', 0, 0.0, -16.0, 12.1, T));
  walls.push(V('b2_st_n_v1', 'B2', 0, -3.0, -17.5, 3.0, T));
  walls.push(V('b2_st_n_v2', 'B2', 0, 3.0, -17.5, 3.0, T));

  // Стены коридора Пом. 29
  walls.push(V('b2_corr_w', 'B2', 0, -1.0, -10.46, 11.09, C));
  walls.push(V('b2_corr_e', 'B2', 0, 1.0, -9.0, 14.0, C));

  // Поперечные перегородки кабинетов западной стороны (Каб. 115, 117, 119, 121)
  walls.push(H('b2_w_part_13', 'B2', 0, -3.525, -13.0, 5.05, T));
  walls.push(H('b2_w_part_10', 'B2', 0, -3.525, -10.0, 5.05, T));
  walls.push(H('b2_w_part_7',  'B2', 0, -3.525, -7.0,  5.05, T));

  // Поперечные перегородки кабинетов восточной стороны (Каб. 116, 118, 120, 122, Кабинет)
  walls.push(H('b2_e_part_13', 'B2', 0, 3.525, -13.0, 5.05, T));
  walls.push(H('b2_e_part_10', 'B2', 0, 3.525, -10.0, 5.05, T));
  walls.push(H('b2_e_part_7',  'B2', 0, 3.525, -7.0,  5.05, T));
  walls.push(H('b2_e_part_4',  'B2', 0, 3.525, -4.0,  5.05, T));

  // Северная и южная разграничительные стены Столовой
  walls.push(H('b2_dining_n', 'B2', 0, 0.0, -2.0, 12.1, C));
  walls.push(H('b2_dining_s', 'B2', 0, 0.0, 18.0, 12.1, C));

  return walls;
}

export function clampWallToBuilding(wall: CustomWall): CustomWall {
  let limitX = 0;
  let limitZ = 0;
  if (wall.blockType === 'B') {
    limitX = 14.655;
    limitZ = 12.44;
  } else if (wall.blockType === 'B1') {
    limitX = 8.125;
    limitZ = 28.235;
  } else if (wall.blockType === 'B2') {
    limitX = 6.65;
    limitZ = 21.585;
  }
  
  const marginX = Math.max(0, limitX - wall.w / 2);
  const marginZ = Math.max(0, limitZ - wall.d / 2);
  
  const clampedX = Math.max(-marginX, Math.min(marginX, wall.x));
  const clampedZ = Math.max(-marginZ, Math.min(marginZ, wall.z));
  
  return {
    ...wall,
    x: Math.round(clampedX * 100) / 100,
    z: Math.round(clampedZ * 100) / 100,
  };
}

// ─────────────────────────────────────────────────────────────
interface CustomWallItemProps {
  wall: CustomWall; cx: number; cz: number;
  floorH: number; floorY: number;
  isSelected: boolean; isEditMode: boolean; wallsOpacity: number;
  onSelect: (id: string) => void;
  onWallMove: (id: string, x: number, z: number) => void;
  onDragChange?: (dragging: boolean) => void;
  isAdded?: boolean;
  isRemoved?: boolean;
}

export const CustomWallItem = ({
  wall, cx, cz, floorH, floorY,
  isSelected, isEditMode, wallsOpacity,
  onSelect, onWallMove, onDragChange,
  isAdded = false,
  isRemoved = false,
}: CustomWallItemProps) => {
  const [meshObj, setMeshObj] = useState<THREE.Mesh | null>(null);
  const transformRef = useRef<any>(null);
  const isFixed = wall.isStairs || wall.isColumn;
  const onWallMoveRef  = useRef(onWallMove);
  const onDragChangeRef = useRef(onDragChange);
  const geomRef = useRef({ cx, cz, id: wall.id });
  useEffect(() => { onWallMoveRef.current  = onWallMove; },  [onWallMove]);
  useEffect(() => { onDragChangeRef.current = onDragChange; },[onDragChange]);
  useEffect(() => { geomRef.current = { cx, cz, id: wall.id }; }, [cx, cz, wall.id]);

  useEffect(() => {
    const ctrl = transformRef.current;
    if (!ctrl || !meshObj) return;
    const handler = (e: { value: boolean }) => {
      onDragChangeRef.current?.(e.value);
      if (!e.value) {
        const p = meshObj.position, g = geomRef.current;
        onWallMoveRef.current?.(g.id, p.x - g.cx, p.z - g.cz);
      }
    };
    ctrl.addEventListener('dragging-changed', handler);
    return () => { ctrl.removeEventListener('dragging-changed', handler); onDragChangeRef.current?.(false); };
  }, [isSelected, meshObj]);

  let color = wall.color || '#94a3b8';
  let opacity = wallsOpacity;
  let transparentVal = wallsOpacity < 1.0;

  if (isRemoved) {
    color = '#ef4444'; // Red for removed
    opacity = wallsOpacity * 0.45;
    transparentVal = true;
  } else if (isAdded) {
    color = '#10b981'; // Green for added
    if (isSelected) color = '#22c55e';
  } else if (isEditMode) {
    color = isSelected ? '#22c55e' : isFixed ? '#475569' : '#3b82f6';
  }

  return (
    <>
      <mesh
        ref={setMeshObj}
        position={[cx + wall.x, floorY, cz + wall.z]}
        rotation={[0, wall.angle || 0, 0]}
        receiveShadow
        onClick={(e) => { if (!isEditMode || isFixed || isRemoved) return; e.stopPropagation(); onSelect(wall.id); }}
      >
        <boxGeometry args={[wall.w, floorH, wall.d]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6} metalness={0.1}
          transparent={transparentVal}
          opacity={opacity}
          emissive={isSelected ? (isAdded ? '#10b981' : '#22c55e') : (isRemoved ? '#ef4444' : '#000')}
          emissiveIntensity={isSelected ? 0.4 : (isRemoved ? 0.2 : 0)}
        />
        {isSelected && isEditMode && !isFixed && (
          <mesh>
            <boxGeometry args={[wall.w + 0.06, floorH + 0.06, wall.d + 0.06]} />
            <meshBasicMaterial color="#4ade80" wireframe transparent opacity={0.8} depthTest={false} />
          </mesh>
        )}
        {isRemoved && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[wall.w + 0.04, floorH + 0.04, wall.d + 0.04]} />
            <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.35} depthTest={true} />
          </mesh>
        )}
      </mesh>
      {isSelected && isEditMode && !isFixed && meshObj && (
        <TransformControls
          ref={transformRef} object={meshObj}
          mode="translate" size={1.8} showY={false} translationSnap={0.1}
        />
      )}
    </>
  );
};