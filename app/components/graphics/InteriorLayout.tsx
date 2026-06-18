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
  const isLeftBlock = blockType === 'B1';
  const isRightBlock = blockType === 'B2';

  return (
    <group>
      {[0, 1, 2, 3].map(f => {
        const floorY = baseY + floorH / 2 + f * floorH;
        const isFirstFloor = f === 0;
        
        const isCurrentFloorActive = activeFloor === (f + 1);
        const outerOp = (activeFloor !== 5 && isCurrentFloorActive) ? Math.min(wallsOpacity, 0.22) : wallsOpacity;
        
        const hasWestGap = isFirstFloor && (isCenterBlock || isRightBlock);
        const hasEastGap = isFirstFloor && (isCenterBlock || isLeftBlock);
        
        const renderZWall = (wallX: number, hasGap: boolean, isWest: boolean) => {
          if (outerOp === 0) return null;
          
          let gapLocalZ = -5.0;
          let gapW = 6.0;
          
          if (blockType === 'B') {
            if (isWest) {
              gapLocalZ = 6.115;
              gapW = 2.65;
            } else {
              gapLocalZ = -6.5425;
              gapW = 2.915;
            }
          } else if (blockType === 'B1') {
            gapLocalZ = -1.0;
            gapW = 4.0;
          } else if (blockType === 'B2') {
            gapLocalZ = -3.4575;
            gapW = 2.915;
          }

          if (!hasGap || gapLocalZ < -d/2 + gapW/2 || gapLocalZ > d/2 - gapW/2) {
             return (
               <mesh castShadow receiveShadow position={[wallX, floorY, cz]}>
                 <boxGeometry args={[t, floorH, d - 2*t]} />
                 <MaterialComponent args={[t, floorH, d - 2*t]} transparent={outerOp < 1.0} opacity={outerOp} />
               </mesh>
             );
          }
          const len1 = (gapLocalZ - gapW/2) - (-d/2 + t);
          const z1 = -d/2 + t + len1/2;
          
          const len2 = (d/2 - t) - (gapLocalZ + gapW/2);
          const z2 = gapLocalZ + gapW/2 + len2/2;
          
          return (
             <group>
               {len1 > 0 && <mesh castShadow receiveShadow position={[wallX, floorY, cz + z1]}>
                 <boxGeometry args={[t, floorH, len1]} />
                 <MaterialComponent args={[t, floorH, len1]} transparent={outerOp < 1.0} opacity={outerOp} />
               </mesh>}
               {len2 > 0 && <mesh castShadow receiveShadow position={[wallX, floorY, cz + z2]}>
                 <boxGeometry args={[t, floorH, len2]} />
                 <MaterialComponent args={[t, floorH, len2]} transparent={outerOp < 1.0} opacity={outerOp} />
               </mesh>}
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
             {renderZWall(cx - w/2 + t/2, hasWestGap, true)}
             
             {/* Восточная стена (+X) */}
             {renderZWall(cx + w/2 - t/2, hasEastGap, false)}

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
             
             {/* Внутренние стены для всех 4 этажей */}
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
          </FloorSlice>
        );
      })}
    </group>
  );
};