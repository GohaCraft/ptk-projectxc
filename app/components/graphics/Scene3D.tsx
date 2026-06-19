"use client";

import React, { useRef, Suspense, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Preload, SoftShadows } from '@react-three/drei';

import { CameraManager } from '../controls/CameraManager';
import { WeatherLayer } from './Weather';
import { Lighting } from './Lighting';
import DynamicSun from './DynamicSun';

import {
  getProceduralTextures,
  PanelMaterial,
  StuccoMaterial,
  BrickMaterial,
  BeltMaterial,
  MetalDarkMaterial,
  ConcreteMaterial
} from './Materials';

import {
  Window,
  ModernGlassDoor,
  ZGUEntrancePortal,
  RearEntrancePortal,
  MetalRampFlight,
  MetalPlatform,
  SolidWall,
  MuralMosaic,
  BlueprintOverlay,
  AsphaltBlueprintBoard,
  RoofTop,
  WindowsGroup,
  SlicedRib,
  Staircase,
  CentralLobbyStair,
  CanopyLights
} from './ArchitecturalModules';

import ReactPdfFloorOverlay from './ReactPdfFloorOverlay';
import { FloorBlueprintPDF } from './FloorBlueprintPDF';
import { PlanUnderlay } from './PlanUnderlay';

import {
  ZguLogoDiamond,
  RussianFlag,
  Ducts,
  AirDucts3D,
  CarpetRack,
  WorkoutArea,
  AddressSign
} from './VisualProps';

import {
  DynamicTree,
  StreetLantern,
  CourtyardBench,
  CompoundFence,
  CompoundLandscape,
  DynamicBirdsFlock
} from './EnvironmentProps';

import {
  SlicedWall
} from './InteriorLayout';
import { FloorSlice } from './FloorSlice';

import {
  CustomWall,
  generateAllDefaultWalls,
  clampWallToBuilding
} from './CustomWalls';
import { InteractiveZone, INTERACTIVE_ZONES } from '../data/interactiveZones';

// Export types and functions for external compatibility (e.g. BuildingModelViewer)
export type { CustomWall, InteractiveZone };
export { generateAllDefaultWalls, clampWallToBuilding, INTERACTIVE_ZONES };

function FrameTracker({ onReady }: { onReady: () => void }) {
  const called = useRef(false);
  useFrame(() => {
    if (!called.current) {
      called.current = true;
      onReady();
    }
  });
  return null;
}

function FpsTracker({ onFpsUpdate }: { onFpsUpdate: (fps: number) => void }) {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  
  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    if (now - lastTime.current >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      onFpsUpdate(fps);
      frameCount.current = 0;
      lastTime.current = now;
    }
  });
  return null;
}

export interface Scene3DProps {
  activeFloor: number;
  wallsOpacity: number;
  cameraMode: 'orbit' | 'top' | 'flight';
  setCameraMode: (val: 'orbit' | 'top' | 'flight') => void;
  perfTier: 'low' | 'medium' | 'high';
  customWalls: CustomWall[];
  isEditMode: boolean;
  selectedWallId: string | null;
  setSelectedWallId: (val: string | null) => void;
  isDraggingWall: boolean;
  setIsDraggingWall: (val: boolean) => void;
  blueprintImage: string | null;
  blueprintPdf?: string | null;
  blueprintPdfPage?: number;
  blueprintOpacity: number;
  blueprintScale: number;
  blueprintOffset: { x: number; z: number };
  blueprintHeightOffset?: number;
  showProceduralBlueprint?: boolean;
  showBlueprintFloor?: boolean;
  blueprintFloorUrl?: string;
  onWallMove: (id: string, nextX: number, nextZ: number) => void;
  firstFrameReady: boolean;
  setFirstFrameReady: (val: boolean) => void;
  selectedZone: InteractiveZone | null;
  setSelectedZone: (zone: InteractiveZone | null) => void;
  lightingMode?: 'noon' | 'sunset' | 'night' | 'realtime';
  onFpsUpdate?: (fps: number) => void;
  
  // 50-point precision audit fields
  auditState: 'idle' | 'running' | 'success' | 'failed';
  auditProgress: number;
  auditRound: number;
}

export default function Scene3D({
  activeFloor,
  wallsOpacity,
  cameraMode,
  setCameraMode,
  perfTier,
  customWalls,
  isEditMode,
  selectedWallId,
  setSelectedWallId,
  isDraggingWall,
  setIsDraggingWall,
  blueprintImage,
  blueprintPdf = null,
  blueprintPdfPage = 1,
  blueprintOpacity,
  blueprintScale,
  blueprintOffset,
  blueprintHeightOffset = 0,
  showProceduralBlueprint = false,
  showBlueprintFloor = false,
  blueprintFloorUrl = '/blueprint_floor1.pdf',
  onWallMove,
  firstFrameReady,
  setFirstFrameReady,
  selectedZone,
  setSelectedZone,
  lightingMode = 'noon',
  onFpsUpdate,
  auditState,
  auditProgress,
  auditRound,
}: Scene3DProps) {
  const controlsRef = useRef<any>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);

  // Math for real-time laser guides and block origins
  const activeFloorIdx = useMemo(() => {
    if (activeFloor === 1) return 0;
    if (activeFloor === 2) return 1;
    if (activeFloor === 2.5) return 2;
    if (activeFloor === 3) return 2;
    if (activeFloor === 3.5) return 3;
    if (activeFloor === 4) return 3;
    return -1;
  }, [activeFloor]);

  const helperWeights = useMemo(() => {
    if (activeFloorIdx < 0) return null;
    const baseY = 1.5;
    const hB = 11.6;
    const hB12 = 13.2;
    
    const floorHB = hB / 4;
    const floorHB12 = hB12 / 4;
    
    return {
      yB: baseY + activeFloorIdx * floorHB + 0.22,
      yB12: baseY + activeFloorIdx * floorHB12 + 0.22,
      floorHB,
      floorHB12,
      baseY
    };
  }, [activeFloorIdx]);

  const selectedWallObject = useMemo(() => {
    if (!selectedWallId) return null;
    return customWalls.find(w => w.id === selectedWallId) || null;
  }, [customWalls, selectedWallId]);

  const selectedWallWorldData = useMemo(() => {
    if (!selectedWallObject || !helperWeights) return null;
    
    let cx = 0;
    let cz = 0;
    let floorY = 0;
    
    if (selectedWallObject.blockType === 'B1') {
      cx = -22.78;
      cz = 9.415;
      floorY = helperWeights.yB12;
    } else if (selectedWallObject.blockType === 'B2') {
      cx = 21.305;
      cz = -3.085;
      floorY = helperWeights.yB12;
    } else {
      cx = 0;
      cz = 0;
      floorY = helperWeights.yB;
    }
    
    return {
      x: cx + selectedWallObject.x,
      y: floorY,
      z: cz + selectedWallObject.z,
      name: selectedWallObject.id.slice(-6).toUpperCase(),
      w: selectedWallObject.w,
      d: selectedWallObject.d
    };
  }, [selectedWallObject, helperWeights]);
  
  const tex = useMemo(() => {
    return (typeof window !== 'undefined') ? getProceduralTextures() : null;
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0f172a]" id="3d-scene-container">
      <Canvas
        style={{ width: '100%', height: '100%', display: 'block' }}
        shadows={perfTier !== 'low'}
        dpr={perfTier === 'low' ? [1, 1.15] : perfTier === 'medium' ? [1, 1.40] : [1, 1.75]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          outputColorSpace: THREE.SRGBColorSpace,
          logarithmicDepthBuffer: false,
        }}
        camera={{ position: [0, 15, 45], fov: 60, near: 0.1, far: 500 }}
        onPointerMissed={() => {
          if (isEditMode && !isDraggingWall) setSelectedWallId(null);
        }}
      >
        {perfTier !== 'low' && (
          <SoftShadows 
            size={perfTier === 'medium' ? 14 : 26} 
            samples={perfTier === 'medium' ? 8 : 16} 
            focus={0.85} 
          />
        )}
        <Suspense fallback={null}>
        {onFpsUpdate && <FpsTracker onFpsUpdate={onFpsUpdate} />}
        <Lighting />
        <DynamicSun lightingMode={lightingMode} />

        {/* Земля с лужами и эффекты погоды */}
        <WeatherLayer tex={tex} />

        <group position={[0, 0, 0]}>

          {/* ════════════════════════════════════════════════════ */}
          {/* ЦЕНТРАЛЬНЫЙ КОРПУС (Лит. Б) — кирпич             */}
          {/* БТИ: Основной прямоугольник: 24,88 м × 29,31 м. H = 11,60 м. */}
          {/* ════════════════════════════════════════════════════ */}
          <group position={[0, 0, 0]}>
            {/* Цоколь — бордовая шуба, высота 1.5м (видимая часть над землёй) */}
            <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
              <boxGeometry args={[29.81, 1.5, 25.38]} />
              <ConcreteMaterial args={[29.81, 1.5, 25.38]} />
            </mesh>
            {/* Цокольные пилястры Лит. Б — продолжение кирпичных колонн до земли с бордовой отделкой */}
            {(() => {
              const pilPositions = [
                -9.0747, -7.0581, -5.0415, -3.0249, -1.0083, 
                1.0083, 3.0249, 5.0415, 7.0581, 9.0747
              ];
              return (
                <group>
                  {pilPositions.map((pX, idx) => {
                    const isNorthEntrance = Math.abs(pX) < 1.5;
                    const isSouthTambur = pX >= -0.5 && pX <= 7.1;
                    return (
                      <group key={`plinth-pil-${idx}`}>
                        {!isNorthEntrance && (
                          <mesh castShadow receiveShadow position={[pX, 0.75, -12.69 - 0.05]}>
                            <boxGeometry args={[0.55, 1.5, 0.36]} />
                            <ConcreteMaterial args={[0.55, 1.5, 0.36]} />
                          </mesh>
                        )}
                        {!isSouthTambur && (
                          <mesh castShadow receiveShadow position={[pX, 0.75, 12.69 + 0.05]}>
                            <boxGeometry args={[0.55, 1.5, 0.36]} />
                            <ConcreteMaterial args={[0.55, 1.5, 0.36]} />
                          </mesh>
                        )}
                      </group>
                    );
                  })}
                </group>
              );
            })()}
            {/* Низ цоколя — расширенная часть, дополнительный слой объёма */}
            <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
              <boxGeometry args={[30.01, 0.30, 25.58]} />
              <ConcreteMaterial args={[30.01, 0.30, 25.58]} />
            </mesh>
            {/* Светло-серый карнизный поясок над цоколем */}
            <mesh castShadow receiveShadow position={[0, 1.55, 0]}>
              <boxGeometry args={[29.85, 0.18, 25.42]} />
              <BeltMaterial args={[29.85, 0.18, 25.42]} />
            </mesh>
            {/* Основной кирпичный корпус */}
            <SlicedWall
              activeFloor={activeFloor}
              position={[0, 7.3, 0]}
              args={[29.31, 11.6, 24.88]}
              MaterialComponent={BrickMaterial}
              blockType="B"
              wallsOpacity={wallsOpacity}
              customWalls={customWalls}
              selectedWallId={selectedWallId}
              onSelectWall={setSelectedWallId}
              isEditMode={isEditMode}
              onWallMove={onWallMove}
              onDragChange={setIsDraggingWall}
              showProceduralBlueprint={showProceduralBlueprint}
            />
            {/* Центральный холл Лит. Б (левая/западная сторона) — маршевая лестница 1→2 этаж + дверь у основания */}
            <FloorSlice activeFloor={activeFloor} floorIndex={0}>
              <group>
                <CentralLobbyStair
                  position={[-13.8, 1.5, 6.0]}
                  rotation={[0, Math.PI / 2, 0]}
                  width={1.5}
                  rise={2.9}
                  total={16}
                  split={3}
                  tread={0.3}
                />
                {/* Дверь у основания лестницы (светлое дерево) */}
                <group position={[-14.35, 1.5, 6.0]}>
                  <mesh castShadow receiveShadow position={[0, 1.05, 0]}>
                    <boxGeometry args={[0.1, 2.1, 0.95]} />
                    <meshStandardMaterial color="#c9a36a" roughness={0.6} />
                  </mesh>
                  <mesh position={[0.04, 2.18, 0]}>
                    <boxGeometry args={[0.14, 0.12, 1.12]} />
                    <meshStandardMaterial color="#e8e3d8" roughness={0.75} />
                  </mesh>
                  <mesh position={[0.04, 1.05, 0.55]}>
                    <boxGeometry args={[0.14, 2.2, 0.08]} />
                    <meshStandardMaterial color="#e8e3d8" roughness={0.75} />
                  </mesh>
                  <mesh position={[0.04, 1.05, -0.55]}>
                    <boxGeometry args={[0.14, 2.2, 0.08]} />
                    <meshStandardMaterial color="#e8e3d8" roughness={0.75} />
                  </mesh>
                </group>
              </group>
            </FloorSlice>
            <FloorSlice activeFloor={activeFloor} floorIndex={4}>
              {/* Левая надстроечная башня Лит. Б */}
              <group>
                <mesh castShadow receiveShadow position={[-12.83, 15.0, 0]}>
                  <boxGeometry args={[3.65, 3.8, 24.88]} />
                  <BrickMaterial args={[3.65, 3.8, 24.88]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                </mesh>
                <mesh castShadow receiveShadow position={[-12.83, 16.94, 0]}>
                  <boxGeometry args={[3.73, 0.08, 24.96]} />
                  <BeltMaterial args={[3.73, 0.08, 24.96]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                </mesh>
              </group>

              {/* Правая надстроечная башня Лит. Б */}
              <group>
                <mesh castShadow receiveShadow position={[12.83, 15.0, 0]}>
                  <boxGeometry args={[3.65, 3.8, 24.88]} />
                  <BrickMaterial args={[3.65, 3.8, 24.88]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                </mesh>
                <mesh castShadow receiveShadow position={[12.83, 16.94, 0]}>
                  <boxGeometry args={[3.73, 0.08, 24.96]} />
                  <BeltMaterial args={[3.73, 0.08, 24.96]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                </mesh>
              </group>

              {/* Парапеты в средней части (разделенные по зубчикам между колоннами) */}
              {(() => {
                const parapets = [
                  { cx: -10.952, w: 1.62 },
                  { cx: -8.0664, w: 1.44 },
                  { cx: -6.0498, w: 1.44 },
                  { cx: -4.0332, w: 1.44 },
                  { cx: -2.0166, w: 1.44 },
                  { cx: 0.00,    w: 1.44 },
                  { cx: 2.0166,  w: 1.44 },
                  { cx: 4.0332,  w: 1.44 },
                  { cx: 6.0498,  w: 1.44 },
                  { cx: 8.0664,  w: 1.44 },
                  { cx: 10.952,  w: 1.62 },
                ];
                return (
                  <group>
                    {parapets.map((p, idx) => (
                      <group key={`p-mid-${idx}`}>
                        {/* Южная сторона (Фасад) — кирпичный заполняющий пояс */}
                        <mesh castShadow receiveShadow position={[p.cx, 13.35, 12.38]}>
                          <boxGeometry args={[p.w, 0.5, 0.12]} />
                          <BrickMaterial args={[p.w, 0.5, 0.12]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                        </mesh>
                        {/* Южная сторона (Фасад) — бетонная накрывочная плита */}
                        <mesh castShadow receiveShadow position={[p.cx, 13.64, 12.38]}>
                          <boxGeometry args={[p.w + 0.04, 0.08, 0.16]} />
                          <BeltMaterial args={[p.w + 0.04, 0.08, 0.16]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                        </mesh>

                        {/* Северная сторона — кирпичный заполняющий пояс */}
                        <mesh castShadow receiveShadow position={[p.cx, 13.35, -12.38]}>
                          <boxGeometry args={[p.w, 0.5, 0.12]} />
                          <BrickMaterial args={[p.w, 0.5, 0.12]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                        </mesh>
                        {/* Северная сторона — бетонная накрывочная плита */}
                        <mesh castShadow receiveShadow position={[p.cx, 13.64, -12.38]}>
                          <boxGeometry args={[p.w + 0.04, 0.08, 0.16]} />
                          <BeltMaterial args={[p.w + 0.04, 0.08, 0.16]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                        </mesh>
                      </group>
                    ))}
                  </group>
                );
              })()}

              {/* Плоская кровля Лит. Б — рулонная битумная */}
              <RoofTop position={[0, 13.1, 0]} size={[29.0, 24.6]} ventCount={4} wallsOpacity={wallsOpacity} />
            </FloorSlice>
            {/* Продухи цоколя */}
            <Ducts start={-12} end={12} y={1.5} fixed={12.59} axis="x" facing={1} count={4} />
            <Ducts start={-12} end={12} y={1.5} fixed={-12.59} axis="x" facing={-1} count={4} />
            <Ducts start={-9} end={9} y={1.5} fixed={14.81} axis="z" facing={1} count={3} />
            <Ducts start={-9} end={9} y={1.5} fixed={-14.81} axis="z" facing={-1} count={3} />
          </group>

          {/* ════════════════════════════════════════════════════ */}
          {/* ЛЕВОЕ КРЫЛО (Лит. Б1) — серо-зелёные панели       */}
          {/* БТИ: Строгий прямоугольник 16.25 м × 56.47 м. H = 13.20 м. */}
          {/* ════════════════════════════════════════════════════ */}
          <group position={[-22.78, 0, 9.415]}>
            <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
              <boxGeometry args={[16.75, 1.5, 56.97]} />
              <ConcreteMaterial args={[16.75, 1.5, 56.97]} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 1.55, 0]}>
              <boxGeometry args={[16.79, 0.18, 57.01]} />
              <BeltMaterial args={[16.79, 0.18, 57.01]} />
            </mesh>
            <SlicedWall
              activeFloor={activeFloor}
              position={[0, 8.1, 0]}
              args={[16.25, 13.2, 56.47]}
              MaterialComponent={PanelMaterial}
              blockType="B1"
              wallsOpacity={wallsOpacity}
              customWalls={customWalls}
              selectedWallId={selectedWallId}
              onSelectWall={setSelectedWallId}
              isEditMode={isEditMode}
              onWallMove={onWallMove}
              onDragChange={setIsDraggingWall}
              showProceduralBlueprint={showProceduralBlueprint}
            />
            <FloorSlice activeFloor={activeFloor} floorIndex={4}>
              <mesh castShadow receiveShadow position={[0, 14.95, 0]}>
                <boxGeometry args={[16.45, 0.5, 56.67]} />
                <BeltMaterial args={[16.45, 0.5, 56.67]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
              </mesh>
              <RoofTop position={[0, 14.7, 0]} size={[16.0, 56.0]} ventCount={6} wallsOpacity={wallsOpacity} />
              {/* Мезонин Б4 (H=4.9) */}
              <group>
                <mesh castShadow receiveShadow position={[0, 16.1, 18]}>
                  <boxGeometry args={[5, 2.8, 6]} />
                  <StuccoMaterial args={[5, 2.8, 6]} color="#DCDCDC" transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                </mesh>
                <Window position={[-2.52, 16.1, 18 - 1.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.0, 1.2]} />
                <Window position={[-2.52, 16.1, 18 + 1.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.0, 1.2]} />
                <Window position={[2.52, 16.1, 18 - 1.5]} rotation={[0, Math.PI / 2, 0]} size={[1.0, 1.2]} />
                <Window position={[2.52, 16.1, 18 + 1.5]} rotation={[0, Math.PI / 2, 0]} size={[1.0, 1.2]} />
                <Window position={[0, 16.1, 21.02]} rotation={[0, 0, 0]} size={[1.2, 1.2]} />
                <Window position={[0, 16.1, 14.98]} rotation={[0, Math.PI, 0]} size={[1.2, 1.2]} />
              </group>
            </FloorSlice>
            <Ducts start={-26} end={26} y={1.5} fixed={8.28} axis="z" facing={1} count={9} />
            <Ducts start={-26} end={26} y={1.5} fixed={-8.28} axis="z" facing={-1} count={9} />
            <Ducts start={-7} end={7} y={1.5} fixed={28.39} axis="x" facing={1} count={2} />
            <Ducts start={-7} end={7} y={1.5} fixed={-28.39} axis="x" facing={-1} count={2} />
          </group>

          {/* ════════════════════════════════════════════════════ */}
          {/* ПРАВОЕ КРЫЛО (Лит. Б2) — серо-зелёные панели      */}
          {/* БТИ: Строгий прямоугольник 13.30 м × 43.17 м. H = 13.20 м. */}
          {/* ════════════════════════════════════════════════════ */}
          <group position={[21.305, 0, -3.085]}>
            <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
              <boxGeometry args={[13.80, 1.5, 43.67]} />
              <ConcreteMaterial args={[13.80, 1.5, 43.67]} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
              <boxGeometry args={[14.00, 0.30, 43.87]} />
              <ConcreteMaterial args={[14.00, 0.30, 43.87]} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 1.55, 0]}>
              <boxGeometry args={[13.84, 0.18, 43.71]} />
              <BeltMaterial args={[13.84, 0.18, 43.71]} />
            </mesh>
            <SlicedWall
              activeFloor={activeFloor}
              position={[0, 8.1, 0]}
              args={[13.30, 13.2, 43.17]}
              MaterialComponent={PanelMaterial}
              blockType="B2"
              wallsOpacity={wallsOpacity}
              customWalls={customWalls}
              selectedWallId={selectedWallId}
              onSelectWall={setSelectedWallId}
              isEditMode={isEditMode}
              onWallMove={onWallMove}
              onDragChange={setIsDraggingWall}
              showProceduralBlueprint={showProceduralBlueprint}
            />
            <FloorSlice activeFloor={activeFloor} floorIndex={4}>
              <mesh castShadow receiveShadow position={[0, 14.95, 0]}>
                <boxGeometry args={[13.50, 0.5, 43.37]} />
                <BeltMaterial args={[13.50, 0.5, 43.37]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
              </mesh>
              <RoofTop position={[0, 14.7, 0]} size={[13.0, 42.7]} ventCount={5} wallsOpacity={wallsOpacity} />
              {/* Мезонин Б5 (H=3.35) */}
              <group>
                <mesh castShadow receiveShadow position={[0, 15.95, -10]}>
                  <boxGeometry args={[6, 2.5, 6]} />
                  <StuccoMaterial args={[6, 2.5, 6]} color="#DCDCDC" transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
                </mesh>
                <Window position={[-3.02, 15.95, -10 - 1.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.0, 1.1]} />
                <Window position={[-3.02, 15.95, -10 + 1.5]} rotation={[0, -Math.PI / 2, 0]} size={[1.0, 1.1]} />
                <Window position={[3.02, 15.95, -10 - 1.5]} rotation={[0, Math.PI / 2, 0]} size={[1.0, 1.1]} />
                <Window position={[3.02, 15.95, -10 + 1.5]} rotation={[0, Math.PI / 2, 0]} size={[1.0, 1.1]} />
                <Window position={[0, 15.95, -6.98]} rotation={[0, 0, 0]} size={[1.1, 1.1]} />
                <Window position={[0, 15.95, -13.02]} rotation={[0, Math.PI, 0]} size={[1.1, 1.1]} />
              </group>
            </FloorSlice>

            {/* МАРШРУШНАЯ МОЗАИКА */}
            <MuralMosaic position={[6.92, 1.6, -0.1]} rotation={[0, Math.PI / 2, 0]} args={[38, 1.4]} />

            <Ducts start={-20} end={20} y={1.5} fixed={6.80} axis="z" facing={1} count={7} />
            <Ducts start={-20} end={20} y={1.5} fixed={-6.80} axis="z" facing={-1} count={7} />
            <Ducts start={-5} end={5} y={1.5} fixed={21.74} axis="x" facing={1} count={2} />
            <Ducts start={-5} end={5} y={1.5} fixed={-21.74} axis="x" facing={-1} count={2} />
          </group>

          {/* Адресная табличка */}
          <AddressSign
            position={[-14.81 - 0.05, 3.35, -12.0]}
            rotation={[0, -Math.PI / 2, 0]}
          />

          {/* Памятная доска */}
          <group position={[-14.81 - 0.06, 1.8, -10.5]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.65, 0.85, 0.04]} />
              <meshStandardMaterial color="#8a6a3a" roughness={0.5} metalness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.025]}>
              <boxGeometry args={[0.55, 0.75, 0.005]} />
              <meshStandardMaterial color="#d4c890" roughness={0.6} metalness={0.2} />
            </mesh>
          </group>

          {/* Флаг России */}
          <FloorSlice activeFloor={activeFloor} floorIndex={1}>
            <RussianFlag
              position={[-14.66 - 0.1, 5.5, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              size={[1.4, 0.85]}
              poleLength={1.6}
              poleAngle={0.45}
            />
          </FloorSlice>

          {/* Рёбра-колонны */}
          {[-9.0747, -7.0581, -5.0415, -3.0249, -1.0083, 1.0083, 3.0249, 5.0415, 7.0581, 9.0747].map((x, i) => {
            return (
              <SlicedRib key={`rib-n-${i}`} activeFloor={activeFloor} position={[x, 0, -12.44 - 0.3]} height={13.1} wallsOpacity={wallsOpacity} />
            );
          })}
          {[-9.0747, -7.0581, -5.0415, -3.0249, -1.0083, 1.0083, 3.0249, 5.0415, 7.0581, 9.0747].map((x, i) => {
            const isOverlappedByTambur = x >= -0.5 && x <= 7.1;
            if (isOverlappedByTambur) return null;
            return (
              <SlicedRib key={`rib-s-${i}`} activeFloor={activeFloor} position={[x, 0, 12.44 + 0.3]} height={13.1} rotation={[0, Math.PI, 0]} wallsOpacity={wallsOpacity} />
            );
          })}

          {/* Чертёж БТИ на полу, привязанный отдельно по каждому крылу
              (Б/Б1/Б2). Стр. 18→1эт, 19→2эт, 20→3эт, 21→4эт уже учтены
              в /plan_manifest.json. Это устраняет расхождение план↔модель. */}
          <PlanUnderlay
            activeFloor={activeFloor}
            visible={showBlueprintFloor}
            opacity={0.95}
          />

          {/* Окна на фасаде */}
          <WindowsGroup activeFloor={activeFloor} wallsOpacity={wallsOpacity} />

          {/* Северный фасад - Лестница */}
          <group position={[0, 0, -12.44]}>
            <RearEntrancePortal position={[0, 0, 0]} />
            <ModernGlassDoor position={[-0.85, 0.45, -0.01]} />
            <ModernGlassDoor position={[0.85, 0.45, -0.01]} />
            <Staircase
              position={[0, 0, -2.0]}
              args={[4.0, 0.75, 4.0]}
              steps={5}
              direction="north"
              type="main"
            />
          </group>

          {/* ─── ЛИТ. Б3 — тамбур ─── */}
          <group position={[3.375, 0, 12.49]}>
            <group position={[0, 0, 0]}>
              <mesh castShadow receiveShadow position={[0, 1.275, 1.5]}>
                <boxGeometry args={[7.4, 2.55, 3.0]} />
                <ConcreteMaterial args={[7.4, 2.55, 3.0]} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, 4.55, 1.5]}>
                <boxGeometry args={[7.2, 4.0, 3.0]} />
                <BrickMaterial args={[7.2, 4.0, 3.0]} />
              </mesh>
              {/* 4 декоративных кирпичных зубчика над входом (на парапете) */}
              {[-2.7, -0.9, 0.9, 2.7].map((x, idx) => (
                <mesh key={`tambur-merlon-${idx}`} position={[x, 6.85, 2.8]} castShadow receiveShadow>
                  <boxGeometry args={[0.8, 0.6, 0.4]} />
                  <BrickMaterial args={[0.8, 0.6, 0.4]} />
                </mesh>
              ))}
            </group>

            <group position={[0, 0, 3.0]}>
              <mesh castShadow receiveShadow position={[0, 0.6375, 0.75]}>
                <boxGeometry args={[7.2, 1.275, 1.5]} />
                <ConcreteMaterial args={[7.2, 1.275, 1.5]} />
              </mesh>

              <group position={[0, 1.275, 0]}>
                <mesh castShadow receiveShadow position={[0, 1.3, 1.4]}>
                  <boxGeometry args={[6.8, 2.6, 0.2]} />
                  <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                </mesh>
                <mesh castShadow receiveShadow position={[0, 2.5, 0.75]}>
                  <boxGeometry args={[6.8, 0.2, 1.5]} />
                  <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                </mesh>
                
                <group position={[-3.5, 1.3, 0.7]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.2, 2.6, 1.4]} />
                    <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                  </mesh>
                  <mesh position={[0.11, 0, 0]}>
                    <boxGeometry args={[0.02, 2.6, 0.04]} />
                    <meshStandardMaterial color="#909294" roughness={0.8} />
                  </mesh>
                </group>

                <group position={[3.5, 1.3, 0.7]}>
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.2, 2.6, 1.4]} />
                    <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                  </mesh>
                  <mesh position={[-0.11, 0, 0]}>
                    <boxGeometry args={[0.02, 2.6, 0.04]} />
                    <meshStandardMaterial color="#909294" roughness={0.8} />
                  </mesh>
                </group>

                {[-2.26, -1.13, 0, 1.13, 2.26].map((x, i) => (
                  <mesh key={`sf-${i}`} position={[x, 1.3, 1.51]}>
                    <boxGeometry args={[0.03, 2.6, 0.02]} />
                    <meshStandardMaterial color="#909294" roughness={0.8} />
                  </mesh>
                ))}

                <group position={[-1.7, 1.2, 1.55]}>
                  <mesh castShadow>
                    <boxGeometry args={[1.3, 2.4, 0.1]} />
                    <meshStandardMaterial color="#2E1C15" roughness={0.7} metalness={0.3} />
                  </mesh>
                  <mesh position={[0.45, 0.0, 0.08]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
                    <meshStandardMaterial color="#4A4A4A" metalness={0.8} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 0, 0.051]}>
                    <boxGeometry args={[1.1, 2.0, 0.01]} />
                    <meshStandardMaterial color="#241611" roughness={0.8} metalness={0.2} />
                  </mesh>
                </group>

                <group position={[1.7, 1.2, 1.55]}>
                  <mesh castShadow>
                    <boxGeometry args={[1.3, 2.4, 0.1]} />
                    <meshStandardMaterial color="#2E1C15" roughness={0.7} metalness={0.3} />
                  </mesh>
                  <mesh position={[-0.45, 0.0, 0.08]}>
                    <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
                    <meshStandardMaterial color="#4A4A4A" metalness={0.8} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 0, 0.051]}>
                    <boxGeometry args={[1.1, 2.0, 0.01]} />
                    <meshStandardMaterial color="#241611" roughness={0.8} metalness={0.2} />
                  </mesh>
                  <mesh position={[-0.2, 0.1, 0.052]}>
                     <boxGeometry args={[0.2, 0.3, 0.01]} />
                     <meshStandardMaterial color="#ffffff" roughness={0.9} />
                  </mesh>
                </group>

                <group position={[0, 1.4, 1.52]}>
                  <mesh castShadow>
                    <boxGeometry args={[0.8, 0.6, 0.04]} />
                    <meshStandardMaterial color="#053b75" roughness={0.3} metalness={0.3} />
                  </mesh>
                  <mesh position={[0, 0, 0.021]}>
                    <boxGeometry args={[0.76, 0.56, 0.01]} />
                    <meshStandardMaterial color="#c2a259" roughness={0.4} metalness={0.8} />
                  </mesh>
                  <mesh position={[0, 0, 0.022]}>
                    <boxGeometry args={[0.74, 0.54, 0.01]} />
                    <meshStandardMaterial color="#053b75" roughness={0.3} metalness={0.3} />
                  </mesh>
                  
                  <group position={[0, 0.17, 0.025]} scale={0.6}>
                     <mesh position={[0, 0, 0]}>
                       <planeGeometry args={[0.08, 0.1]} />
                       <meshStandardMaterial color="#c2a259" roughness={0.4} metalness={0.8} />
                     </mesh>
                     <mesh position={[-0.04, 0.03, 0]} rotation={[0, 0, 0.3]}>
                       <planeGeometry args={[0.04, 0.06]} />
                       <meshStandardMaterial color="#c2a259" roughness={0.4} metalness={0.8} />
                     </mesh>
                     <mesh position={[0.04, 0.03, 0]} rotation={[0, 0, -0.3]}>
                       <planeGeometry args={[0.04, 0.06]} />
                       <meshStandardMaterial color="#c2a259" roughness={0.4} metalness={0.8} />
                     </mesh>
                     <mesh position={[0, 0.06, 0]}>
                       <circleGeometry args={[0.02, 16]} />
                       <meshStandardMaterial color="#c2a259" roughness={0.4} metalness={0.8} />
                     </mesh>
                  </group>

                  <group position={[0, 0, 0.03]}>
                     <Text position={[0, 0.24, 0]} fontSize={0.018} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center">
                       МИНИСТЕРСТВО НАУКИ И ВЫСШЕГО ОБРАЗОВАНИЯ
                     </Text>
                     <Text position={[0, 0.21, 0]} fontSize={0.018} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center">
                       РОССИЙСКОЙ ФЕДЕРАЦИИ
                     </Text>
                     
                     <Text position={[0, 0.06, 0]} fontSize={0.014} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center">
                       Федеральное государственное бюджетное образовательное
                     </Text>
                     <Text position={[0, 0.035, 0]} fontSize={0.014} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center">
                       учреждение высшего образования
                     </Text>

                     <Text position={[0, -0.01, 0]} fontSize={0.024} color="#c2a259" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center" fontWeight="bold">
                       «ЗАПОЛЯРНЫЙ
                     </Text>
                     <Text position={[0, -0.045, 0]} fontSize={0.024} color="#c2a259" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center" fontWeight="bold">
                       ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ
                     </Text>
                     <Text position={[0, -0.08, 0]} fontSize={0.024} color="#c2a259" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center" fontWeight="bold">
                       ИМ. Н.М. ФЕДОРОВСКОГО»
                     </Text>

                     <Text position={[0, -0.13, 0]} fontSize={0.014} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center">
                       (ЗГУ)
                     </Text>
                     
                     <Text position={[0, -0.21, 0]} fontSize={0.014} color="#ffffff" anchorX="center" anchorY="middle" maxWidth={0.7} textAlign="center">
                       г. Норильск
                     </Text>
                  </group>
                </group>

                <group position={[0, 2.4, 0]}>
                  <group position={[0, 0.9, 2.4]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[7.2, 1.8, 0.2]} />
                      <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                    </mesh>
                    {[-2.88, -1.44, 0, 1.44, 2.88].map((x, i) => (
                      <mesh key={`cs-${i}`} position={[x, 0, 0.11]}>
                        <boxGeometry args={[0.02, 1.8, 0.02]} />
                        <meshStandardMaterial color="#909294" roughness={0.8} />
                      </mesh>
                    ))}
                  </group>

                  <group position={[0, 0.1, 1.15]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[7.2, 0.2, 2.3]} />
                      <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                    </mesh>
                  </group>

                  <group position={[0, 1.75, 1.25]}>
                    <mesh castShadow receiveShadow>
                      <boxGeometry args={[7.2, 0.1, 2.3]} />
                      <meshStandardMaterial color="#D5D7D9" roughness={0.5} metalness={0.1} />
                    </mesh>
                  </group>

                  <mesh position={[-3.5, 0.9, 1.15]} castShadow receiveShadow>
                     <boxGeometry args={[0.2, 1.8, 2.3]} />
                     <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                  </mesh>
                  <mesh position={[3.5, 0.9, 1.15]} castShadow receiveShadow>
                     <boxGeometry args={[0.2, 1.8, 2.3]} />
                     <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                  </mesh>

                  <group position={[0, 2.2, 0.1]}>
                     <mesh castShadow receiveShadow>
                        <boxGeometry args={[7.2, 0.8, 0.2]} />
                        <meshStandardMaterial color="#D5D7D9" roughness={0.3} metalness={0.2} />
                     </mesh>
                     {[-2.88, -1.44, 0, 1.44, 2.88].map((x, i) => (
                       <mesh key={`wall-panel-${i}`} position={[x, 0, 0.11]}>
                         <boxGeometry args={[0.02, 0.8, 0.02]} />
                         <meshStandardMaterial color="#909294" roughness={0.8} />
                       </mesh>
                     ))}
                     <mesh position={[0, -0.39, 0.11]}>
                       <boxGeometry args={[7.2, 0.02, 0.02]} />
                       <meshStandardMaterial color="#909294" roughness={0.8} />
                     </mesh>
                  </group>

                  <group position={[-0.2, 0.9, 2.52]}>
                     <Text
                        position={[-0.1, 0, 0.05]}
                        fontSize={1.1}
                        color="#2d77b8"
                        outlineWidth={0.06}
                        outlineColor="#ffffff"
                        fontWeight="bold"
                        anchorX="left"
                        anchorY="middle"
                     >
                        ЗГУ
                     </Text>
                     <ZguLogoDiamond />
                  </group>

                  <group position={[3.8, -0.4, 1.25]}>
                     <mesh castShadow position={[0, 0, 0]}>
                        <cylinderGeometry args={[0.08, 0.08, 3.0, 12]} />
                        <meshStandardMaterial color="#999" metalness={0.6} roughness={0.3} />
                     </mesh>
                     <mesh castShadow position={[-0.3, 0.5, 0]}>
                        <cylinderGeometry args={[0.08, 0.08, 2.0, 12]} />
                        <meshStandardMaterial color="#999" metalness={0.6} roughness={0.3} />
                     </mesh>
                  </group>

                  <CanopyLights />
                </group>
              </group>

              <group position={[0, 0, -2.95]}>
                <mesh position={[0, 0.6375, 5.5]} castShadow receiveShadow>
                  <boxGeometry args={[7.6, 1.275, 2.0]} />
                  <ConcreteMaterial args={[7.6, 1.275, 2.0]} />
                </mesh>
                <mesh position={[0, 1.275, 5.5]} castShadow receiveShadow>
                  <boxGeometry args={[7.6, 0.04, 2.0]} />
                  <meshStandardMaterial color="#8B3A3A" roughness={0.9} />
                </mesh>

                <group position={[0, 0, 8.625]}>
                  <Staircase
                    position={[0, 0, 0]}
                    args={[7.5, 1.275, 4.25]}
                    steps={17}
                    direction="south"
                    type="main"
                  />
                </group>

                <SolidWall position={[-4.05, 0, 6.5]} width={0.3} length={4.25} y1={1.275} y2={0} />
                <SolidWall position={[3.75, 0, 6.5]} width={0.3} length={4.25} y1={1.275} y2={0} />

                <group position={[0, 0, 0]}>
                  <MetalPlatform 
                    position={[2.25, 0, 6.5]} 
                    width={1.5} length={1.0} y={1.275} showRails={true} railSides={['right']} 
                  />

                  <MetalPlatform 
                    position={[2.25, 0, 7.5]} 
                    width={3.3} length={1.5} y={1.275} showRails={true} railSides={['front', 'right', 'left']} 
                  />

                  <MetalRampFlight 
                    position={[4.05, 0, 5.0]} 
                    rotation={[0, 0, 0]} 
                    width={1.5} length={2.5} y1={0.6375} y2={1.275} showRails={true} 
                  />

                  <MetalPlatform 
                    position={[4.05, 0, 3.5]} 
                    width={3.0} length={1.5} y={0.6375} showRails={true} railSides={['back', 'left', 'right']} 
                  />

                  <MetalRampFlight 
                    position={[5.55, 0, 5.0]} 
                    rotation={[0, 0, 0]} 
                    width={1.5} length={3.0} y1={0.6375} y2={0.0} showRails={true} 
                  />

                  <MetalPlatform 
                    position={[5.55, 0, 8.0]} 
                    width={1.5} length={1.5} y={0.0} showRails={true} railSides={['left', 'right']} 
                  />
                </group>
              </group>

            </group>
          </group>

          {/* Северная лестница правого крыла */}
          <group position={[21.305, 0, -24.67]}>
            <mesh castShadow receiveShadow position={[2.0, 0.60, -0.775]}>
               <boxGeometry args={[2.0, 1.20, 1.55]} /><ConcreteMaterial args={[2.0, 1.20, 1.55]} />
            </mesh>
            <Staircase position={[-1.765, 0, -0.775]} args={[5.53, 1.20, 1.55]} steps={6} direction="west" type="main" />
            
            <mesh castShadow receiveShadow position={[2.0, 1.20, -0.01]}>
               <boxGeometry args={[2.0, 2.0, 0.05]} /><MetalDarkMaterial />
            </mesh>

            {/* Перила */}
            <group position={[0, 0, 0]}>
              <mesh position={[-1.765, 0.60 + 0.9, -0.775]} rotation={[-Math.atan2(1.2, 5.53), 0, 0]}>
                 <boxGeometry args={[0.04, 0.04, 5.66]} />
                 <meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4} />
              </mesh>
              <mesh position={[0.9, 1.20 + 0.9, -0.775]} rotation={[-Math.atan2(1.2, 5.53), 0, 0]}>
                 <boxGeometry args={[0.04, 0.04, 5.66]} />
                 <meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4} />
              </mesh>
              
              {[-1.5, -0.775, -0.05].map((z, i) => (
                <group key={i}>
                  <mesh position={[-1.765, 0.60 + 0.45, z]}><boxGeometry args={[0.04, 0.9, 0.04]}/><meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4} /></mesh>
                  <mesh position={[0.9, 1.20 + 0.45, z]}><boxGeometry args={[0.04, 0.9, 0.04]}/><meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4} /></mesh>
                </group>
              ))}
            </group>

            <mesh position={[2.0, 1.20 + 0.9, -1.5]} rotation={[0, 0, 0]}>
               <boxGeometry args={[2.0, 0.04, 0.04]} />
               <meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[3.0, 1.20 + 0.9, -0.775]} rotation={[0, 0, 0]}>
               <boxGeometry args={[0.04, 0.04, 1.55]} />
               <meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4} />
            </mesh>
            <mesh position={[3.0, 1.20 + 0.45, -1.5]}><boxGeometry args={[0.04, 0.9, 0.04]}/><meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4}/></mesh>
            <mesh position={[3.0, 1.20 + 0.45, -0.05]}><boxGeometry args={[0.04, 0.9, 0.04]}/><meshStandardMaterial color="#A0A0A0" metalness={0.8} roughness={0.4}/></mesh>
          </group>

          {/* Воздуховоды оцинкованные */}
          <AirDucts3D position={[-31.0, 0, 9.415]} count={3} />

          {/* ════════════════════════════════════════════════════ */}
          {/*   УЛУЧШЕННОЕ ОКРУЖЕНИЕ (Среда, Озеленение, Освещение)    */}
          {/* ════════════════════════════════════════════════════ */}
          <CompoundLandscape />

          {/* AsphaltBlueprintBoard отключён */}



          {/* Интерактивные зоны интерьера во внутреннем пространстве */}
          {INTERACTIVE_ZONES.map((zone) => {
            const isZoneOnActiveFloor = activeFloor === 5 || activeFloor === zone.floor;
            if (!isZoneOnActiveFloor) return null;

            const isHovered = hoveredZoneId === zone.id;
            const isSelected = selectedZone?.id === zone.id;

            return (
              <group key={zone.id}>
                {/* Полупрозрачный объем помещения */}
                <mesh
                  position={zone.center}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    setHoveredZoneId(zone.id);
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    setHoveredZoneId(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedZone(zone);
                  }}
                >
                  <boxGeometry args={zone.size} />
                  <meshStandardMaterial
                    color={isSelected ? '#eab308' : isHovered ? '#38bdf8' : '#0284c7'}
                    transparent={true}
                    opacity={isSelected ? 0.35 : isHovered ? 0.22 : 0.08}
                    roughness={0.2}
                    metalness={0.8}
                  />
                </mesh>

                {/* Неоновый контур-сетка с эффектом легкого свечения */}
                <mesh position={zone.center}>
                  <boxGeometry args={[zone.size[0] + 0.02, zone.size[1] + 0.02, zone.size[2] + 0.02]} />
                  <meshBasicMaterial
                    color={isSelected ? '#eab308' : isHovered ? '#38bdf8' : '#0284c7'}
                    wireframe={true}
                    transparent={true}
                    opacity={isSelected ? 0.8 : isHovered ? 0.5 : 0.18}
                  />
                </mesh>

                {/* Высокотехнологичная подпись зоны */}
                <Text
                  position={[zone.center[0], zone.center[1] + zone.size[1] / 2 + 0.6, zone.center[2]]}
                  fontSize={0.35}
                  color={isSelected ? '#facc15' : isHovered ? '#38bdf8' : '#cbd5e1'}
                  anchorX="center"
                  anchorY="middle"
                  fontWeight="bold"
                >
                  {zone.name}
                </Text>
              </group>
            );
          })}
        </group>

        {/* ========================================================= */}
        {/* CAD ROBLOX PRECISION ACTIVE FLOOR GRIDS & LASERS        */}
        {/* ========================================================= */}
        {isEditMode && helperWeights && (
          <group>
            {/* 1. Holographic Dynamic Double Grids (Coarse + Millimetric 10cm Grid) directly on the floor plans */}
            {(() => {
              const baseBlueprintY = 1.5 + (activeFloor - 1) * 2.9 + 0.24 + blueprintHeightOffset;
              const gridY = baseBlueprintY + 0.01;
              const gridYSub = baseBlueprintY + 0.005;
              return (
                <group>
                  {/* CENTRAL BLOCK B GRIDS */}
                  <gridHelper 
                    args={[30.0, 30, '#3b82f6', '#1e293b']} 
                    position={[0, gridY, 0]} 
                    transparent 
                    opacity={0.5} 
                  />
                  <gridHelper 
                    args={[30.0, 300, '#0ea5e9', '#090d16']} 
                    position={[0, gridYSub, 0]} 
                    transparent 
                    opacity={0.18} 
                  />

                  {/* WEST WING BLOCK B1 GRIDS */}
                  <gridHelper 
                    args={[16.0, 16, '#10b981', '#111827']} 
                    position={[-22.78, gridY, 9.415]} 
                    transparent 
                    opacity={0.5} 
                  />
                  <gridHelper 
                    args={[16.0, 160, '#34d399', '#090d16']} 
                    position={[-22.78, gridYSub, 9.415]} 
                    transparent 
                    opacity={0.18} 
                  />

                  {/* EAST WING BLOCK B2 GRIDS */}
                  <gridHelper 
                    args={[14.0, 14, '#f59e0b', '#111827']} 
                    position={[21.305, gridY, -3.085]} 
                    transparent 
                    opacity={0.5} 
                  />
                  <gridHelper 
                    args={[14.0, 140, '#fbbf24', '#090d16']} 
                    position={[21.305, gridYSub, -3.085]} 
                    transparent 
                    opacity={0.18} 
                  />
                </group>
              );
            })()}

            {/* 2. Visual Laser Alignment Beam for Selected Wall */}
            {selectedWallWorldData && (
              <group>
                {/* Vertical Anchor Guide Beam */}
                <mesh position={[selectedWallWorldData.x, selectedWallWorldData.y / 2, selectedWallWorldData.z]}>
                  <boxGeometry args={[0.04, selectedWallWorldData.y, 0.04]} />
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.65} />
                </mesh>

                {/* Horizontal Alignment Guideline stretching 38 meters directly to AsphaltBlueprintBoard */}
                <mesh position={[selectedWallWorldData.x, 0.1, selectedWallWorldData.z + 19.0]}>
                  <boxGeometry args={[0.02, 0.02, 38.0]} />
                  <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} />
                </mesh>

                {/* Micro-Target Projection Node on the blueprint */}
                <mesh position={[selectedWallWorldData.x, 0.22, selectedWallWorldData.z + 38.0]}>
                  <cylinderGeometry args={[0.2, 0.2, 0.04, 16]} />
                  <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} />
                </mesh>

                {/* Floating Metric 3D Callout Label فوق الWall */}
                <Text
                  position={[selectedWallWorldData.x, selectedWallWorldData.y + 1.25, selectedWallWorldData.z]}
                  fontSize={0.42}
                  color="#22c55e"
                  anchorX="center"
                  anchorY="middle"
                  fontWeight="bold"
                >
                  {`Стена: X=${selectedWallObject?.x.toFixed(2)}м Z=${selectedWallObject?.z.toFixed(2)}м L=${selectedWallWorldData.w.toFixed(1)}м`}
                </Text>

                {/* Small indicator pointing downwards */}
                <mesh position={[selectedWallWorldData.x, selectedWallWorldData.y + 0.5, selectedWallWorldData.z]}>
                  <coneGeometry args={[0.12, 0.3, 4]} rotation={[Math.PI, 0, 0]} />
                  <meshBasicMaterial color="#22c55e" />
                </mesh>
              </group>
            )}
            
            {/* 3. Glowing Audit Scanner Spheres (renders scanning nodes in 3D during audit progress) */}
            {auditState === 'running' && (
              <group>
                {[
                  { x: -5, z: -2, col: '#818cf8' },
                  { x: 3, z: 4, col: '#a78bfa' },
                  { x: -10, z: 8, col: '#22d3ee' },
                  { x: 8, z: -6, col: '#f43f5e' },
                  { x: -22.78 + 3, z: 9.415 + 5, col: '#34d399' },
                  { x: 21.305 - 2, z: -3.085 - 4, col: '#fbbf24' }
                ].map((nodeXy, nIdx) => {
                  const isActive = (auditProgress % 6) === nIdx;
                  return (
                    <mesh key={nIdx} position={[nodeXy.x, helperWeights.yB + (isActive ? 0.8 : 0.25), nodeXy.z]}>
                      <sphereGeometry args={[isActive ? 0.45 : 0.25, 16, 16]} />
                      <meshBasicMaterial 
                        color={isActive ? '#38bdf8' : nodeXy.col} 
                        transparent 
                        opacity={isActive ? 0.85 : 0.4} 
                        wireframe={isActive}
                      />
                    </mesh>
                  );
                })}
              </group>
            )}
          </group>
        )}

        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={1.5}
          maxDistance={180}
          maxPolarAngle={Math.PI / 2 - 0.03} // Prevent rotation under the ground plain
          enableDamping={true}
          dampingFactor={0.08}
          enableZoom={cameraMode !== 'flight' && !isDraggingWall}
          enablePan={cameraMode !== 'flight' && !isDraggingWall}
          screenSpacePanning={true}
          enableRotate={cameraMode === 'orbit' && !isDraggingWall}
          enabled={cameraMode !== 'flight' && !isDraggingWall}
        />
        <CameraManager controlsRef={controlsRef} activeFloor={activeFloor} cameraMode={cameraMode} selectedZone={selectedZone} />
        
        <Preload all />
        <FrameTracker onReady={() => setFirstFrameReady(true)} />
        </Suspense>
      </Canvas>
    </div>
  );
}