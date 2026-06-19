"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CustomWall, CustomWallItem } from './CustomWalls';
import { FloorSlice } from './FloorSlice';
import {
  B1FloorBlueprintMaterial,
  BFloorBlueprintMaterial,
  B2FloorBlueprintMaterial
} from './ArchitecturalModules';

interface InteriorLayoutProps {
  cx: number;
  cz: number;
  w: number;
  d: number;
  floorH: number;
  floorY: number;
  blockType: 'B' | 'B1' | 'B2';
  floorIdx: 0 | 1 | 2 | 3;
  wallsOpacity: number;
  customWalls: CustomWall[];
  originalWalls?: CustomWall[];
  selectedWallId: string | null;
  onSelectWall: (id: string | null) => void;
  isEditMode: boolean;
  onWallMove: (id: string, x: number, z: number) => void;
  onDragChange?: (dragging: boolean) => void;
}

export const InteriorLayout = ({
  cx,
  cz,
  w,
  d,
  floorH,
  floorY,
  blockType,
  floorIdx,
  wallsOpacity,
  customWalls = [],
  originalWalls = [],
  selectedWallId,
  onSelectWall,
  isEditMode,
  onWallMove,
  onDragChange,
}: InteriorLayoutProps) => {
  const floorCustomWalls = (customWalls || []).filter(
    (wl) => wl.blockType === blockType && wl.floorIdx === floorIdx
  );

  const floorOriginalWalls = (originalWalls || []).filter(
    (wl) => wl.blockType === blockType && wl.floorIdx === floorIdx
  );

  const removedWalls = useMemo(() => {
    return floorOriginalWalls.filter(
      (orig) => !floorCustomWalls.some((c) => c.id === orig.id)
    );
  }, [floorCustomWalls, floorOriginalWalls]);

  return (
    <group>
      {floorCustomWalls.map((wall) => {
        const isSelected = selectedWallId === wall.id;
        const isAdded = !floorOriginalWalls.some((orig) => orig.id === wall.id);
        return (
          <CustomWallItem
            key={wall.id}
            wall={wall}
            cx={cx}
            cz={cz}
            floorH={floorH}
            floorY={floorY}
            isSelected={isSelected}
            isEditMode={isEditMode}
            wallsOpacity={wallsOpacity}
            onSelect={onSelectWall}
            onWallMove={onWallMove}
            onDragChange={onDragChange}
            isAdded={isAdded}
          />
        );
      })}
      {isEditMode && removedWalls.map((wall) => {
        return (
          <CustomWallItem
            key={`removed-${wall.id}`}
            wall={wall}
            cx={cx}
            cz={cz}
            floorH={floorH}
            floorY={floorY}
            isSelected={false}
            isEditMode={false}
            wallsOpacity={wallsOpacity}
            onSelect={() => {}}
            onWallMove={() => {}}
            isRemoved={true}
          />
        );
      })}
    </group>
  );
};

export const SlicedWall = ({
  activeFloor,
  position,
  args,
  MaterialComponent,
  blockType,
  wallsOpacity = 1.0,
  customWalls = [],
  originalWalls = [],
  selectedWallId,
  onSelectWall,
  isEditMode,
  onWallMove,
  onDragChange,
  showProceduralBlueprint = true
}: any) => {
  const [cx, cy, cz] = position;
  const [w, h, d] = args;
  const floors = 4;
  const floorH = h / floors;
  const baseY = cy - h / 2;
  const t = 0.6; // толщина внешних стен
  
  const isCenterBlock = blockType === 'B';

  // Индекс активного (видимого сверху) этажа. Интерьер нижних этажей скрыт
  // плитой перекрытия -> не рендерим его (экономия draw-call/теней).
  const activeIdx =
    activeFloor === 1 ? 0 :
    activeFloor === 2 ? 1 :
    activeFloor === 2.5 ? 2 :
    activeFloor === 3 ? 2 :
    activeFloor === 3.5 ? 3 :
    activeFloor === 4 ? 3 : -1;

  return (
    <group>
      {[0, 1, 2, 3].map(f => {
        const floorY = baseY + floorH / 2 + f * floorH;
        const isFirstFloor = f === 0;
        
        // Стены непрозрачны при просмотре; прозрачностью управляет только слайдер wallsOpacity.
        const outerOp = wallsOpacity;
        
        // Проёмы (проходы) в торцевых стенах. Этаж 1 — во двор/между блоками,
        // этаж 2 — межблочные проходы у лестниц (те же позиции по z).
        // {z, w} — центр и ширина проёма в ЛОКАЛЬНЫХ координатах блока.
        // ВАЖНО: межблочные стены идут в два слоя (стена крыла + стена центра),
        // совпадают по МИРОВОМУ z. Проёмы открываем в обеих стенах синхронно:
        //   Б1.восток (world z = 9.415 + lz) ↔ Б.запад (world z = lz)
        //   Б.восток  (world z = lz)         ↔ Б2.запад (world z = -3.085 + lz)
        const gapFloor = (f === 0 || f === 1);
        const westGaps: {z: number; w: number}[] = gapFloor ? (
          blockType === 'B'  ? [{ z: -11.135, w: 2.31 }, { z: 10.525, w: 3.13 }] :
          blockType === 'B2' ? [{ z: 14.375, w: 1.78 }] : []
        ) : [];
        const eastGaps: {z: number; w: number}[] = gapFloor ? (
          blockType === 'B1' ? [{ z: -20.55, w: 2.31 }, { z: 1.11, w: 3.13 }] :
          blockType === 'B'  ? [{ z: 11.29, w: 1.78 }] : []
        ) : [];

        const renderZWall = (wallX: number, gaps: {z: number; w: number}[]) => {
          if (outerOp === 0) return null;

          const zmin = -d/2 + t;
          const zmax = d/2 - t;
          // Вычитаем проёмы из сплошной стены -> массив сплошных сегментов
          const sorted = gaps
            .filter(g => g.z > zmin && g.z < zmax)
            .sort((a, b) => a.z - b.z);
          const segs: [number, number][] = [];
          let cur = zmin;
          for (const g of sorted) {
            const gs = Math.max(zmin, g.z - g.w/2);
            const ge = Math.min(zmax, g.z + g.w/2);
            if (gs > cur) segs.push([cur, gs]);
            cur = Math.max(cur, ge);
          }
          if (cur < zmax) segs.push([cur, zmax]);

          return (
             <group>
               {segs.map(([a, b], i) => (b - a) > 0.05 && (
                 <mesh key={`zwall-${i}`} castShadow receiveShadow position={[wallX, floorY, cz + (a + b)/2]}>
                   <boxGeometry args={[t, floorH, b - a]} />
                   <MaterialComponent args={[t, floorH, b - a]} transparent={outerOp < 1.0} opacity={outerOp} />
                 </mesh>
               ))}
             </group>
          );
        };

        return (
          <FloorSlice key={`sliced-wall-${f}`} activeFloor={activeFloor} floorIndex={f}>
             {/* Северная стена (-Z) */}
             {outerOp > 0 && (
               isCenterBlock ? (
                 <group>
                   {/* Левая башня (Левая стена) */}
                   <mesh castShadow receiveShadow position={[-12.83, floorY, cz - d/2 + t/2]}>
                     <boxGeometry args={[3.65, floorH, t]} />
                     <MaterialComponent args={[3.65, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                   </mesh>
                   {/* Правая башня (Правая стена) */}
                   <mesh castShadow receiveShadow position={[12.83, floorY, cz - d/2 + t/2]}>
                     <boxGeometry args={[3.65, floorH, t]} />
                     <MaterialComponent args={[3.65, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                   </mesh>
                   {/* Межблочные пилястры/колонны */}
                   {[-9.167, -7.333, -5.50, -3.667, -1.833, 0.00, 1.833, 3.667, 5.50, 7.333, 9.167].map((pX, idx) => (
                     <mesh key={`pier-n-${idx}`} castShadow receiveShadow position={[pX, floorY, cz - d/2 + t/2]}>
                       <boxGeometry args={[0.58, floorH, t]} />
                       <MaterialComponent args={[0.58, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                     </mesh>
                   ))}
                   {/* Ниши под окна (утопленные назад) */}
                   {[
                     { cx: -10.083, w: 1.548 },
                     { cx: -8.25,   w: 1.253 },
                     { cx: -6.417,  w: 1.253 },
                     { cx: -4.583,  w: 1.253 },
                     { cx: -2.75,   w: 1.253 },
                     { cx: -0.917,  w: 1.253 },
                     { cx: 0.917,   w: 1.253 },
                     { cx: 2.75,    w: 1.253 },
                     { cx: 4.583,   w: 1.253 },
                     { cx: 6.417,   w: 1.253 },
                     { cx: 8.25,    w: 1.253 },
                     { cx: 10.083,  w: 1.548 },
                   ].map((bay, idx) => (
                     <mesh key={`bay-n-${idx}`} castShadow receiveShadow position={[bay.cx, floorY, cz - d/2 + t - 0.2]}>
                       <boxGeometry args={[bay.w, floorH, 0.4]} />
                       <MaterialComponent args={[bay.w, floorH, 0.4]} transparent={outerOp < 1.0} opacity={outerOp} />
                     </mesh>
                   ))}
                 </group>
               ) : (
                 <mesh castShadow receiveShadow position={[cx, floorY, cz - d/2 + t/2]}>
                   <boxGeometry args={[w, floorH, t]} />
                   <MaterialComponent args={[w, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                 </mesh>
               )
             )}

             {/* Южная стена (+Z) */}
             {outerOp > 0 && (
               isCenterBlock ? (
                 <group>
                   {/* Левая башня (Левая стена) */}
                   <mesh castShadow receiveShadow position={[-12.83, floorY, cz + d/2 - t/2]}>
                     <boxGeometry args={[3.65, floorH, t]} />
                     <MaterialComponent args={[3.65, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                   </mesh>
                   {/* Правая башня (Правая стена) */}
                   <mesh castShadow receiveShadow position={[12.83, floorY, cz + d/2 - t/2]}>
                     <boxGeometry args={[3.65, floorH, t]} />
                     <MaterialComponent args={[3.65, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                   </mesh>
                   {/* Межблочные пилястры/колонны */}
                   {[-9.167, -7.333, -5.50, -3.667, -1.833, 0.00, 1.833, 3.667, 5.50, 7.333, 9.167].map((pX, idx) => (
                     <mesh key={`pier-s-${idx}`} castShadow receiveShadow position={[pX, floorY, cz + d/2 - t/2]}>
                       <boxGeometry args={[0.58, floorH, t]} />
                       <MaterialComponent args={[0.58, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                     </mesh>
                   ))}
                   {/* Ниши под окна (утопленные внутрь) */}
                   {[
                     { cx: -10.083, w: 1.548 },
                     { cx: -8.25,   w: 1.253 },
                     { cx: -6.417,  w: 1.253 },
                     { cx: -4.583,  w: 1.253 },
                     { cx: -2.75,   w: 1.253 },
                     { cx: -0.917,  w: 1.253 },
                     { cx: 0.917,   w: 1.253 },
                     { cx: 2.75,    w: 1.253 },
                     { cx: 4.583,   w: 1.253 },
                     { cx: 6.417,   w: 1.253 },
                     { cx: 8.25,    w: 1.253 },
                     { cx: 10.083,  w: 1.548 },
                   ].map((bay, idx) => (
                     <mesh key={`bay-s-${idx}`} castShadow receiveShadow position={[bay.cx, floorY, cz + d/2 - t + 0.2]}>
                       <boxGeometry args={[bay.w, floorH, 0.4]} />
                       <MaterialComponent args={[bay.w, floorH, 0.4]} transparent={outerOp < 1.0} opacity={outerOp} />
                     </mesh>
                   ))}
                 </group>
               ) : (
                 <mesh castShadow receiveShadow position={[cx, floorY, cz + d/2 - t/2]}>
                   <boxGeometry args={[w, floorH, t]} />
                   <MaterialComponent args={[w, floorH, t]} transparent={outerOp < 1.0} opacity={outerOp} />
                 </mesh>
               )
             )}
             
             {/* Западная стена (-X) */}
             {renderZWall(cx - w/2 + t/2, westGaps)}

             {/* Восточная стена (+X) */}
             {renderZWall(cx + w/2 - t/2, eastGaps)}

             {/* Перекрытие (пол этажа) */}
              <mesh castShadow receiveShadow position={[cx, baseY + f * floorH + 0.1, cz]}>
                <boxGeometry args={[w - t*2, 0.2, d - t*2]} />
                <meshStandardMaterial color="#cccccc" transparent={wallsOpacity < 1.0} opacity={wallsOpacity < 1.0 ? (wallsOpacity === 0 ? 0.0 : 0.15) : 1.0} />
              </mesh>
             
             {/* Поэтажный чертеж БТИ непосредственно на полу */}
             {showProceduralBlueprint && activeFloor === f + 1 && (
                <mesh position={[cx, baseY + f * floorH + 0.22, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[w - t*2, d - t*2]} />
                  {blockType === 'B1' && <B1FloorBlueprintMaterial width={w - t*2} depth={d - t*2} floorIdx={f} />}
                  {blockType === 'B' && <BFloorBlueprintMaterial width={w - t*2} depth={d - t*2} floorIdx={f} />}
                  {blockType === 'B2' && <B2FloorBlueprintMaterial width={w - t*2} depth={d - t*2} floorIdx={f} />}
                </mesh>
             )}
             
             {/* Внутренние перегородки — только для активного (верхнего видимого) этажа.
                 Интерьер нижних этажей скрыт плитой -> не рисуем (оптимизация FPS). */}
             <group visible={activeIdx === f}>
               <InteriorLayout
                  cx={cx} cz={cz} w={w} d={d}
                  floorH={floorH} floorY={floorY}
                  blockType={blockType as 'B' | 'B1' | 'B2'}
                  floorIdx={f as 0 | 1 | 2 | 3}
                  wallsOpacity={wallsOpacity}
                  customWalls={customWalls}
                  originalWalls={originalWalls}
                  selectedWallId={selectedWallId}
                  onSelectWall={onSelectWall}
                  onWallMove={onWallMove}
                  onDragChange={onDragChange}
                  isEditMode={isEditMode}
               />
             </group>
          </FloorSlice>
        );
      })}
    </group>
  );
};