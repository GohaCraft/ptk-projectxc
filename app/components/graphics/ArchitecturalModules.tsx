"use client";

import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { weatherState } from '../data/weatherState';
import {
  RampFloorMaterial,
  RampMetalMaterial,
  BeltMaterial,
  getProceduralTextures,
  BrickMaterial,
  ConcreteMaterial,
  GreyConcreteMaterial,
  DirtyRubberTreadMaterial
} from './Materials';
import { FloorSlice } from './FloorSlice';
import { CustomWall } from './CustomWalls';

// ──────────────────────────────────────────────────────────────────
//  WINDOW COMPONENT
// ──────────────────────────────────────────────────────────────────
type WindowProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  frame?: 'white' | 'brown';
  size?: [number, number];
  isNight?: boolean;
};

export const Window: React.FC<WindowProps> = ({
  position,
  rotation = [0, 0, 0],
  frame = 'white',
  size = [1.6, 2.1],
  isNight = false,
}) => {
  const [W, H] = size;
  const frameColor = frame === 'white' ? '#F0F0EC' : '#4A2E1B';
  const FW = Math.max(0.04, W * 0.04); // Frame thickness
  const D = 0.04; // Depth of frame
  const isTriple = W >= 1.35; // 3-pane for wide windows
  const isSmallHorizontal = H < 0.6 || W < 0.8;

  // Decide dynamically if the window has a light on when it's night
  const hasLight = React.useMemo(() => Math.random() > 0.65, []);
  const roomTint = React.useMemo(() => {
    const warm = ['#FFE8B0', '#FFEBB2', '#FFE0A0', '#FFF2C8'];
    return warm[Math.floor(Math.random() * warm.length)];
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Глубина комнаты за стеклом — объём внутри помещения */}
      <mesh position={[0, 0, -0.18]}>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial
          color={(isNight && hasLight) ? roomTint : '#0c0f12'}
          emissive={(isNight && hasLight) ? roomTint : '#000000'}
          emissiveIntensity={(isNight && hasLight) ? 1.6 : 0}
          roughness={1}
        />
      </mesh>
      {/* Боковые откосы проёма — добавляют объём */}
      <mesh position={[0, H/2 - 0.005, -0.09]} rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[W, 0.18]} />
        <meshStandardMaterial color="#1a1d20" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -H/2 + 0.005, -0.09]} rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[W, 0.18]} />
        <meshStandardMaterial color="#15181b" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-W/2 + 0.005, 0, -0.09]} rotation={[0, Math.PI/2, 0]}>
        <planeGeometry args={[0.18, H]} />
        <meshStandardMaterial color="#181b1e" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[W/2 - 0.005, 0, -0.09]} rotation={[0, Math.PI/2, 0]}>
        <planeGeometry args={[0.18, H]} />
        <meshStandardMaterial color="#181b1e" roughness={1} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. СТЕКЛО — физически корректное: отражения неба + проход света */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[W - FW, H - FW]} />
        <meshPhysicalMaterial
          color="#afc4cc"
          transmission={isNight ? 0.2 : 0.6}
          thickness={0.4}
          ior={1.45}
          roughness={0.15}
          metalness={0.0}
          reflectivity={0.15}
          clearcoat={0.5}
          clearcoatRoughness={0.1}
          transparent
          opacity={1}
          envMapIntensity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Outer Frame */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, H/2 - FW/2, 0]} castShadow><boxGeometry args={[W, FW, D]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
        <mesh position={[0, -H/2 + FW/2, 0]} castShadow><boxGeometry args={[W, FW, D]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
        <mesh position={[-W/2 + FW/2, 0, 0]} castShadow><boxGeometry args={[FW, H - FW*2, D]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
        <mesh position={[W/2 - FW/2, 0, 0]} castShadow><boxGeometry args={[FW, H - FW*2, D]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
      </group>

      {/* 4. Vertical dividers (Mullions) */}
      {!isSmallHorizontal && (
        isTriple ? (
          <group position={[0, 0, 0]}>
            <mesh position={[-W/6, 0, 0]} castShadow><boxGeometry args={[FW, H - FW*2, D * 0.8]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
            <mesh position={[W/6, 0, 0]} castShadow><boxGeometry args={[FW, H - FW*2, D * 0.8]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
          </group>
        ) : (
          <group position={[0, 0, 0]}>
            <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[FW, H - FW*2, D * 0.8]} /><meshStandardMaterial color={frameColor} roughness={0.6} /></mesh>
          </group>
        )
      )}

      {/* 5. Transom (Horizontal divider) */}
      {!isSmallHorizontal && (
        <mesh position={[0, -H/4, 0]} castShadow>
           <boxGeometry args={[W - FW*2, FW*0.8, D * 0.7]} />
           <meshStandardMaterial color={frameColor} roughness={0.6} />
        </mesh>
      )}

      {/* 6. External window sill (Отлив) */}
      <mesh position={[0, -H/2, 0.02]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[W + 0.04, 0.015, 0.1]} />
        <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* 7. Наружные откосы / Наличники (Projecting window surrounds for real depth) */}
      <group position={[0, 0, 0.012]}>
        {/* Top casing */}
        <mesh position={[0, H/2 + 0.02, 0]} castShadow>
          <boxGeometry args={[W + 0.05, 0.04, 0.03]} />
          <meshStandardMaterial color={frame === 'white' ? '#EFEFED' : '#2D1B10'} roughness={0.5} />
        </mesh>
        {/* Left casing */}
        <mesh position={[-W/2 - 0.02, 0, 0]} castShadow>
          <boxGeometry args={[0.04, H + 0.08, 0.03]} />
          <meshStandardMaterial color={frame === 'white' ? '#EFEFED' : '#2D1B10'} roughness={0.5} />
        </mesh>
        {/* Right casing */}
        <mesh position={[W/2 + 0.02, 0, 0]} castShadow>
          <boxGeometry args={[0.04, H + 0.08, 0.03]} />
          <meshStandardMaterial color={frame === 'white' ? '#EFEFED' : '#2D1B10'} roughness={0.5} />
        </mesh>
        {/* Bottom casing */}
        <mesh position={[0, -H/2 - 0.02, 0]} castShadow>
          <boxGeometry args={[W + 0.05, 0.04, 0.03]} />
          <meshStandardMaterial color={frame === 'white' ? '#EFEFED' : '#2D1B10'} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  MODERN GLASS DOOR
// ──────────────────────────────────────────────────────────────────
export const ModernGlassDoor = ({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
  const W = 1.6;
  const H = 2.1;
  const FW = 0.08; // Profile width/thickness
  const D = 0.08;  // Profile depth
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (typeof weatherState !== 'undefined') {
        setIsNight(weatherState.isNight);
        unsubscribe = weatherState.subscribe((state) => setIsNight(state.isNight));
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <group position={position} rotation={rotation}>
      {/* Стекло с легким отражением и теплым внутренним светом ночью */}
      <mesh position={[0, H/2, 0]}>
        <planeGeometry args={[W - FW, H - FW]} />
        <meshPhysicalMaterial
          color="#afe4fc"
          transmission={0.5}
          thickness={0.2}
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.85}
          emissive={isNight ? "#ffeed1" : "#000000"}
          emissiveIntensity={isNight ? 1.4 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Алюминиевая рама двери (Темный графит) */}
      <group position={[0, H/2, 0]}>
        {/* Верхний профиль */}
        <mesh position={[0, H/2 - FW/2, 0]} castShadow>
          <boxGeometry args={[W, FW, D]} />
          <meshStandardMaterial color="#2a2e33" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Нижний профиль */}
        <mesh position={[0, -H/2 + FW/2, 0]} castShadow>
          <boxGeometry args={[W, FW, D]} />
          <meshStandardMaterial color="#2a2e33" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Левый профиль */}
        <mesh position={[-W/2 + FW/2, 0, 0]} castShadow>
          <boxGeometry args={[FW, H - FW * 2, D]} />
          <meshStandardMaterial color="#2a2e33" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Правый профиль */}
        <mesh position={[W/2 - FW/2, 0, 0]} castShadow>
          <boxGeometry args={[FW, H - FW * 2, D]} />
          <meshStandardMaterial color="#2a2e33" roughness={0.4} metalness={0.8} />
        </mesh>
        
        {/* Горизонтальная центральная перемычка (импост) */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[W - FW * 2, FW * 0.8, D * 0.9]} />
          <meshStandardMaterial color="#2a2e33" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>
      
      {/* Изящная длинная вертикальная ручка из нержавеющей стали */}
      <group position={[W/2 - FW - 0.12, H/2, 0.05]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.015, 0.015, 1.2, 8]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Верхнее крепление ручки */}
        <mesh position={[0, 0.5, -0.025]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.05, 8]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Нижнее крепление ручки */}
        <mesh position={[0, -0.5, -0.025]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.05, 8]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.1} metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  ZGU ENTRANCE PORTAL
// ──────────────────────────────────────────────────────────────────
export const ZGUEntrancePortal = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* 1. Левая и правая опорные стены портала (белый цвет) */}
      <mesh castShadow receiveShadow position={[-1.9, 1.35, -0.6]}>
        <boxGeometry args={[0.25, 2.7, 1.2]} />
        <meshStandardMaterial color="#EFEFED" roughness={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.9, 1.35, -0.6]}>
        <boxGeometry args={[0.25, 2.7, 1.2]} />
        <meshStandardMaterial color="#EFEFED" roughness={0.4} />
      </mesh>

      {/* 2. Основной массивный козырек (белый цвет с синим логотипом ЗГУ) */}
      <mesh castShadow receiveShadow position={[0, 3.1, -0.6]}>
        <boxGeometry args={[4.2, 0.8, 1.3]} />
        <meshStandardMaterial color="#EFEFED" roughness={0.4} />
      </mesh>

      {/* 3. Тонкий темный отлив/козырек на самом верху */}
      <mesh position={[0, 3.52, -0.6]}>
        <boxGeometry args={[4.24, 0.04, 1.34]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* 4. Фирменный знак ЗГУ на передней панели */}
      {/* Квадратный синий логотип/ромб слева */}
      <group position={[-0.8, 3.1, -1.26]}>
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.18, 0.18, 0.02]} />
          <meshStandardMaterial color="#005C9E" roughness={0.2} />
        </mesh>
        <mesh position={[0.12, 0, 0.01]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.12, 0.12, 0.01]} />
          <meshStandardMaterial color="#1FA0DC" roughness={0.2} />
        </mesh>
      </group>

      {/* Текст аббревиатуры ЗГУ */}
      <Text
        position={[0.1, 3.1, -1.27]}
        fontSize={0.48}
        color="#005C9E"
        anchorX="left"
        anchorY="middle"
      >
        ЗГУ
      </Text>

      {/* 5. Точечный свет под козырьком для реалистичности */}
      <pointLight position={[0, 2.4, -0.6]} intensity={4} distance={6} color="#fff2df" castShadow />
      <mesh position={[0, 2.68, -0.6]}>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={3} />
      </mesh>
    </group>
  );
};

export const RearEntrancePortal = ({ position }: { position: [number, number, number] }) => {
  return (
    <group position={position}>
      {/* 1. Левая и правая простые серые опоры (металлические столбы) */}
      <mesh castShadow receiveShadow position={[-1.7, 1.25, -0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 2.5, 12]} />
        <meshStandardMaterial color="#4A5568" roughness={0.6} />
      </mesh>
      <mesh castShadow receiveShadow position={[1.7, 1.25, -0.4]}>
        <cylinderGeometry args={[0.06, 0.06, 2.5, 12]} />
        <meshStandardMaterial color="#4A5568" roughness={0.6} />
      </mesh>

      {/* 2. Простой плоский серый козырек над входом без брендинга */}
      <mesh castShadow receiveShadow position={[0, 2.5, -0.4]}>
        <boxGeometry args={[3.6, 0.1, 1.0]} />
        <meshStandardMaterial color="#4A5568" roughness={0.6} />
      </mesh>

      {/* 3. Небольшой плоский настенный светильник над дверью */}
      <pointLight position={[0, 2.2, -0.2]} intensity={2} distance={4} color="#ffd4a3" />
      <mesh position={[0, 2.45, -0.1]}>
        <boxGeometry args={[0.3, 0.08, 0.08]} />
        <meshStandardMaterial color="#1a202c" roughness={0.5} />
      </mesh>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  METAL RAMP FLIGHT
// ──────────────────────────────────────────────────────────────────
export const MetalRampFlight = ({ position, rotation = [0,0,0], width, length, y1, y2, showRails = true, railSides = ['left', 'right'] }: { position: [number,number,number], rotation?: [number,number,number], width: number, length: number, y1: number, y2: number, showRails?: boolean, railSides?: ('left'|'right')[] }) => {
  const angle = Math.atan2(y1 - y2, length);
  const slopeLength = Math.sqrt((y2 - y1)**2 + length**2);
  
  return (
    <group position={position} rotation={rotation}>
      {/* Настил (просечно-вытяжной лист / сетка) */}
      <mesh position={[width/2, (y1 + y2)/2, length/2]} rotation={[angle, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.02, slopeLength]} />
        <RampFloorMaterial args={[width, slopeLength]} />
      </mesh>
      
      {/* Продольные направляющие (швеллер по краям) */}
      <mesh position={[0.03, (y1 + y2)/2 - 0.04, length/2]} rotation={[angle, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.1, slopeLength]} />
        <RampMetalMaterial />
      </mesh>
      <mesh position={[width - 0.03, (y1 + y2)/2 - 0.04, length/2]} rotation={[angle, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, 0.1, slopeLength]} />
        <RampMetalMaterial />
      </mesh>
      
      {/* Опоры (ножки), которые проходят насквозь и становятся стойками перил */}
      {[0, 1, 2, 3, 4].map((step) => {
        const z = (length / 4) * step;
        const floorY = y1 + (y2 - y1) * (z / length);
        const postHeight = showRails ? floorY + 0.95 : floorY; // 0.95 height for handrail
        if (postHeight <= 0.1) return null;
        return (
          <group key={`supp-${step}`} position={[0, 0, z]}>
            {(!showRails || railSides.includes('left')) && (
              <mesh position={[0.03, postHeight / 2, 0]} castShadow>
                <boxGeometry args={[0.06, postHeight, 0.06]} />
                <RampMetalMaterial />
              </mesh>
            )}
            {(showRails && !railSides.includes('left') && floorY > 0.1) && (
              <mesh position={[0.03, floorY / 2, 0]} castShadow>
                <boxGeometry args={[0.06, floorY, 0.06]} />
                <RampMetalMaterial />
              </mesh>
            )}

            {(!showRails || railSides.includes('right')) && (
              <mesh position={[width - 0.03, postHeight / 2, 0]} castShadow>
                <boxGeometry args={[0.06, postHeight, 0.06]} />
                <RampMetalMaterial />
              </mesh>
            )}
            {(showRails && !railSides.includes('right') && floorY > 0.1) && (
              <mesh position={[width - 0.03, floorY / 2, 0]} castShadow>
                <boxGeometry args={[0.06, floorY, 0.06]} />
                <RampMetalMaterial />
              </mesh>
            )}
            {/* Поперечная балка между ножками под настилом */}
            <mesh position={[width/2, floorY - 0.06, 0]} castShadow>
              <boxGeometry args={[width - 0.06, 0.04, 0.04]} />
              <RampMetalMaterial />
            </mesh>
          </group>
        );
      })}
      
      {showRails && (
        <group>
          {['left' as const, 'right' as const].map((side) => {
            if (!railSides.includes(side)) return null;
            const dx = side === 'left' ? -width/2 + 0.03 : width/2 - 0.03;
            return (
              <group key={`rails-${side}`}>
                {/* Верхний поручень (0.9m) */}
                <mesh position={[width/2 + dx, (y1 + y2)/2 + 0.9, length/2]} rotation={[angle, 0, 0]} castShadow>
                   <boxGeometry args={[0.04, 0.04, slopeLength]} />
                   <RampMetalMaterial />
                </mesh>
                {/* Нижний поручень (0.7m) */}
                <mesh position={[width/2 + dx, (y1 + y2)/2 + 0.7, length/2]} rotation={[angle, 0, 0]} castShadow>
                   <boxGeometry args={[0.04, 0.04, slopeLength]} />
                   <RampMetalMaterial />
                </mesh>
                {/* Отбойный бортик (0.1m) */}
                <mesh position={[width/2 + dx, (y1 + y2)/2 + 0.1, length/2]} rotation={[angle, 0, 0]} castShadow>
                   <boxGeometry args={[0.02, 0.05, slopeLength]} />
                   <RampMetalMaterial />
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  METAL PLATFORM
// ──────────────────────────────────────────────────────────────────
export const MetalPlatform = ({ position, rotation = [0, 0, 0], width, length, y, showRails = true, railSides = ['left', 'right', 'front'] }: { position: [number,number,number], rotation?: [number,number,number], width: number, length: number, y: number, showRails?: boolean, railSides?: ('left'|'right'|'front'|'back')[] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Настил */}
      <mesh position={[width/2, y, length/2]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.02, length]} />
        <RampFloorMaterial args={[width, length]} />
      </mesh>

      {/* Рама под настилом */}
      <mesh position={[width/2, y - 0.04, 0.03]} castShadow>
         <boxGeometry args={[width, 0.1, 0.06]} />
         <RampMetalMaterial />
      </mesh>
      <mesh position={[width/2, y - 0.04, length - 0.03]} castShadow>
         <boxGeometry args={[width, 0.1, 0.06]} />
         <RampMetalMaterial />
      </mesh>
      <mesh position={[0.03, y - 0.04, length/2]} castShadow>
         <boxGeometry args={[0.06, 0.1, length - 0.12]} />
         <RampMetalMaterial />
      </mesh>
      <mesh position={[width - 0.03, y - 0.04, length/2]} castShadow>
         <boxGeometry args={[0.06, 0.1, length - 0.12]} />
         <RampMetalMaterial />
      </mesh>

      {/* Опоры по углам */}
      {[[0.03, 0.03], [width-0.03, 0.03], [0.03, length-0.03], [width-0.03, length-0.03]].map(([x, z], i) => {
        const postHeight = showRails ? y + 0.95 : y;
        if (postHeight <= 0.1) return null;
        return (
          <mesh key={`p-leg-${i}`} position={[x, postHeight / 2, z]} castShadow>
             <boxGeometry args={[0.06, postHeight, 0.06]} />
             <RampMetalMaterial />
          </mesh>
        );
      })}

      {showRails && (
        <group>
          {railSides.includes('left') && (
            <group position={[0.03, y, length/2]}>
              <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[0.04, 0.04, length]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.04, 0.04, length]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.02, 0.05, length]} /><RampMetalMaterial /></mesh>
            </group>
          )}
          {railSides.includes('right') && (
            <group position={[width - 0.03, y, length/2]}>
              <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[0.04, 0.04, length]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.04, 0.04, length]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[0.02, 0.05, length]} /><RampMetalMaterial /></mesh>
            </group>
          )}
          {railSides.includes('front') && (
            <group position={[width/2, y, length - 0.03]}>
              <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[width, 0.04, 0.04]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[width, 0.04, 0.04]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[width, 0.05, 0.02]} /><RampMetalMaterial /></mesh>
            </group>
          )}
          {railSides.includes('back') && (
            <group position={[width/2, y, 0.03]}>
              <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[width, 0.04, 0.04]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[width, 0.04, 0.04]} /><RampMetalMaterial /></mesh>
              <mesh position={[0, 0.1, 0]} castShadow><boxGeometry args={[width, 0.05, 0.02]} /><RampMetalMaterial /></mesh>
            </group>
          )}
        </group>
      )}
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  SOLID WALL (EXTRUDABLE)
// ──────────────────────────────────────────────────────────────────
export const SolidWall = ({ position, width, length, y1, y2 }: { position: [number,number,number], width: number, length: number, y1: number, y2: number }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(length, 0);
    s.lineTo(length, y2);
    s.lineTo(0, y1);
    return s;
  }, [length, y1, y2]);
  
  return (
    <group position={position}>
      <mesh position={[width, 0, 0]} rotation={[0, -Math.PI/2, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth: width, bevelEnabled: false }]} />
        <meshStandardMaterial color="#6B1A25" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  ЦЕНТРАЛЬНЫЙ ХОЛЛ ЛИТ. Б — маршевая лестница 1→2 этаж (по фото)
//  Прямой марш с ГЛАДКИМ серым закрытым косоуром (боковая стенка),
//  серыми ступенями, верхней площадкой и простым светло-серым
//  ограждением (вертикальные балясины + поручень).
//  Локальная система: марш поднимается вдоль +Z, вверх по +Y от 0.
// ──────────────────────────────────────────────────────────────────
const RailMat = (props: any) => (
  <meshStandardMaterial color="#d2d6d9" metalness={0.3} roughness={0.45} {...props} />
);
const PlasterGray = (props: any) => (
  <meshStandardMaterial color="#bcc0c4" roughness={0.85} {...props} />
);

const SlopeRail = ({ side, run, rise, h = 0.95 }: { side: number; run: number; rise: number; h?: number }) => {
  const ang = Math.atan2(rise, run);
  const L = Math.hypot(run, rise);
  const n = Math.max(3, Math.round(run / 0.22));
  const bal = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const z = t * run;
    const y = t * rise;
    bal.push(
      <mesh key={`bal-${side}-${k}`} castShadow position={[side, y + h / 2, z]}>
        <boxGeometry args={[0.028, h, 0.028]} />
        <RailMat />
      </mesh>
    );
  }
  return (
    <group>
      {bal}
      {/* поручень + промежуточный профиль (вдоль уклона) */}
      <mesh position={[side, rise / 2 + h, run / 2]} rotation={[-ang, 0, 0]}>
        <boxGeometry args={[0.06, 0.05, L]} />
        <RailMat />
      </mesh>
      <mesh position={[side, rise / 2 + h * 0.5, run / 2]} rotation={[-ang, 0, 0]}>
        <boxGeometry args={[0.04, 0.03, L]} />
        <RailMat />
      </mesh>
    </group>
  );
};

export const CentralLobbyStair = ({
  position,
  rotation = [0, 0, 0],
  width = 1.5,
  rise = 2.9,
  steps = 16,
  run = 4.8,
  landing = 1.3,
  railSide = 'right',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
  rise?: number;
  steps?: number;
  run?: number;
  landing?: number;
  railSide?: 'left' | 'right';
}) => {
  const tread = run / steps;
  const riser = rise / steps;
  const sideShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(run, 0);
    s.lineTo(run, rise);
    s.lineTo(0, riser);
    s.closePath();
    return s;
  }, [run, rise, riser]);
  const sx = railSide === 'right' ? width / 2 : -width / 2;
  const railX = sx + (railSide === 'right' ? 0.06 : -0.06);
  const stepMeshes = [];
  for (let i = 0; i < steps; i++) {
    const top = (i + 1) * riser;
    const z = i * tread + tread / 2;
    stepMeshes.push(
      <mesh key={`riser-${i}`} castShadow receiveShadow position={[0, top / 2, z]}>
        <boxGeometry args={[width, top, tread]} />
        <GreyConcreteMaterial />
      </mesh>
    );
    stepMeshes.push(
      <mesh key={`tread-${i}`} receiveShadow position={[0, top + 0.011, z]}>
        <boxGeometry args={[width, 0.022, tread + 0.02]} />
        <meshStandardMaterial color="#d9d5cd" roughness={0.7} />
      </mesh>
    );
  }
  return (
    <group position={position} rotation={rotation as any}>
      {stepMeshes}
      {/* гладкий серый косоур (видимая боковая стенка) */}
      <mesh position={[sx, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[sideShape, { depth: 0.05, bevelEnabled: false }]} />
        <PlasterGray />
      </mesh>
      {/* верхняя площадка */}
      <mesh castShadow receiveShadow position={[0, rise - 0.11, run + landing / 2]}>
        <boxGeometry args={[width, 0.22, landing]} />
        <GreyConcreteMaterial />
      </mesh>
      <mesh receiveShadow position={[0, rise + 0.011, run + landing / 2]}>
        <boxGeometry args={[width, 0.022, landing]} />
        <meshStandardMaterial color="#d9d5cd" roughness={0.7} />
      </mesh>
      {/* ограждение вдоль марша */}
      <SlopeRail side={railX} run={run} rise={rise} />
      {/* ограждение вдоль площадки */}
      <group position={[railX, rise, run]}>
        {[0, landing].map((dz, i) => (
          <mesh key={`lp-${i}`} castShadow position={[0, 0.49, dz]}>
            <boxGeometry args={[0.028, 0.98, 0.028]} />
            <RailMat />
          </mesh>
        ))}
        <mesh position={[0, 0.95, landing / 2]}>
          <boxGeometry args={[0.06, 0.05, landing]} />
          <RailMat />
        </mesh>
      </group>
    </group>
  );
};


// ──────────────────────────────────────────────────────────────────
//  MURAL MOSAIC & HELPERS
// ──────────────────────────────────────────────────────────────────
export const createMuralTexture = () => {
  const c = document.createElement('canvas');
  c.width = 4096;
  c.height = 150;
  const ctx = c.getContext('2d')!;

  // Фоновый градиент / плашки
  const colors = ['#0F4B8F', '#1F95D6', '#E83F2C', '#F2A900', '#2C3E50', '#E5E7E9'];
  ctx.fillStyle = '#1A365D';
  ctx.fillRect(0, 0, 4096, 150);

  const drawPoly = (pts: number[], color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  };

  // Фон из динамичных «осколков»
  for (let i = 0; i < 60; i++) {
    const xBase = (i / 60) * 4096;
    const color = colors[(i * 3) % colors.length];
    
    drawPoly([
      xBase - 50 + Math.random() * 100, 150,
      xBase + 100 + Math.random() * 200, 0,
      xBase + 150 + Math.random() * 150, 0,
      xBase + 50 + Math.random() * 150, 150
    ], color);
  }

  // Абстрактные элементы в духе социалистического конструктивизма
  const drawGear = (cx: number, cy: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      const rOuter = r * 1.25;
      const a1 = angle - 0.08;
      const a2 = angle + 0.08;
      ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
      ctx.lineTo(cx + Math.cos(a1) * rOuter, cy + Math.sin(a1) * rOuter);
      ctx.lineTo(cx + Math.cos(a2) * rOuter, cy + Math.sin(a2) * rOuter);
      ctx.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2); ctx.stroke();
    
    // Внутренние спицы
    for(let i=0; i<4; i++) {
      const angle = (i * Math.PI) / 4;
      drawPoly([
        cx + Math.cos(angle - 0.05)*r*0.6, cy + Math.sin(angle - 0.05)*r*0.6,
        cx + Math.cos(angle + 0.05)*r*0.6, cy + Math.sin(angle + 0.05)*r*0.6,
        cx - Math.cos(angle - 0.05)*r*0.6, cy - Math.sin(angle - 0.05)*r*0.6,
        cx - Math.cos(angle + 0.05)*r*0.6, cy - Math.sin(angle + 0.05)*r*0.6
      ], color);
    }
  };

  const drawLightning = (cx: number, cy: number, scale: number) => {
    drawPoly([
      cx, cy - 30 * scale,
      cx - 25 * scale, cy + 10 * scale,
      cx + 5 * scale, cy + 10 * scale,
      cx - 15 * scale, cy + 50 * scale,
      cx + 35 * scale, cy - 5 * scale,
      cx - 5 * scale, cy - 5 * scale
    ], '#F2A900');
  };

  const drawFactory = (cx: number, cy: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx, cy - h, w, h);
    drawPoly([cx, cy - h, cx + w / 2, cy - h - w * 0.6, cx + w, cy - h], color);
    ctx.fillRect(cx + w * 0.2, cy - h - w * 0.8, w * 0.15, w * 0.8);
    ctx.fillRect(cx + w * 0.7, cy - h - w * 1.1, w * 0.15, w * 1.1);
  };

  const drawAtom = (cx: number, cy: number, r: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    for (let a = 0; a < 3; a++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.3, (a * Math.PI) / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2); ctx.fill();
  };

  // Размещаем символы по длине в случайном, но ритмичном порядке
  for (let x = 120; x < 4096; x += 180 + Math.random() * 100) {
    const type = Math.floor(Math.random() * 4);
    if (type === 0) drawGear(x, 75, 45, '#E5E7E9');
    else if (type === 1) drawLightning(x, 75, 1.2 + Math.random() * 0.5);
    else if (type === 2) drawFactory(x - 50, 150, 80 + Math.random() * 40, 60 + Math.random() * 30, '#2C3E50');
    else if (type === 3) drawAtom(x, 75, 55, '#E2E8F0');
  }

  // Накладываем сетку «мозаики» сверху
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  for (let x = 0; x < 4096; x += 8) {
    ctx.fillRect(x, 0, 1, 150);
  }
  for (let y = 0; y < 150; y += 8) {
    ctx.fillRect(0, y, 4096, 1);
  }

  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = true;
  return texture;
};

export const MuralMosaic = ({ position, rotation, args }: { position: [number, number, number], rotation: [number, number, number], args: [number, number] }) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Мгновенная инициализация процедурной высококачественной текстуры мозаики без холостых сетевых запросов
    setTex(createMuralTexture());
  }, []);

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <planeGeometry args={[args[0], args[1]]} />
      {tex ? <meshStandardMaterial map={tex} roughness={0.9} side={THREE.DoubleSide} /> : <meshStandardMaterial color="#2B6CB0" side={THREE.DoubleSide} />}
    </mesh>
  );
};

// ──────────────────────────────────────────────────────────────────
//  BLUEPRINT GENERATING MATERIALS FOR OVERLAYS
// ──────────────────────────────────────────────────────────────────
export const B1FloorBlueprintMaterial = ({ width, depth, floorIdx }: { width: number, depth: number, floorIdx: number }) => {
  const tex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 4096;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill with clean white background for contrast
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 4096);

    // Coordinate conversions:
    const xW = -7.525;
    const xE = +7.525;
    const zN = -27.635;
    const zS = +27.635;

    function toX(valX: number) {
      return ((valX - xW) / (xE - xW)) * 1024;
    }
    function toY(valZ: number) {
      return ((valZ - zN) / (zS - zN)) * 4096;
    }

    // Draw precise millimeter / centimeter / meter grid rules
    // Fine 100mm (10cm) sub-grid:
    ctx.strokeStyle = 'rgba(15, 60, 200, 0.035)';
    ctx.lineWidth = 1;
    for (let m = -8.0; m <= 8.0; m += 0.1) {
      if (Math.abs(m - Math.round(m)) < 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(toX(m), 0);
      ctx.lineTo(toX(m), 4096);
      ctx.stroke();
    }
    for (let m = -28.0; m <= 28.0; m += 0.1) {
      if (Math.abs(m - Math.round(m)) < 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(0, toY(m));
      ctx.lineTo(1024, toY(m));
      ctx.stroke();
    }

    // Main 1m (1000mm) grid:
    ctx.strokeStyle = 'rgba(15, 60, 200, 0.09)';
    ctx.lineWidth = 1;
    for (let m = -8; m <= 8; m += 1) {
      ctx.beginPath();
      ctx.moveTo(toX(m), 0);
      ctx.lineTo(toX(m), 4096);
      ctx.stroke();
    }
    for (let m = -28; m <= 28; m += 1) {
      ctx.beginPath();
      ctx.moveTo(0, toY(m));
      ctx.lineTo(1024, toY(m));
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 1016, 4088);

    // Draw ruler ticks and meter captions for extreme alignment precision
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let m = -27; m <= 27; m += 1) {
      const yVal = toY(m);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, yVal); ctx.lineTo(16, yVal);
      ctx.moveTo(1020, yVal); ctx.lineTo(1008, yVal);
      ctx.stroke();

      ctx.fillText(`${m}m`, 28, yVal);
      ctx.fillText(`${m}m`, 996, yVal);
    }
    for (let m = -7; m <= 7; m += 1) {
      const xVal = toX(m);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xVal, 4); ctx.lineTo(xVal, 16);
      ctx.moveTo(xVal, 4092); ctx.lineTo(xVal, 4080);
      ctx.stroke();

      ctx.fillText(`${m}m`, xVal, 24);
      ctx.fillText(`${m}m`, xVal, 4072);
    }

    const drawLine = (x1: number, z1: number, x2: number, z2: number, w = 4, color = '#000000', dashed = false) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      if (dashed) {
        ctx.setLineDash([15, 10]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(toX(x1), toY(z1));
      ctx.lineTo(toX(x2), toY(z2));
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawRect = (x1: number, z1: number, x2: number, z2: number, color: string) => {
      ctx.fillStyle = color;
      const rx1 = toX(x1);
      const rz1 = toY(z1);
      const rx2 = toX(x2);
      const rz2 = toY(z2);
      ctx.fillRect(rx1, rz1, rx2 - rx1, rz2 - rz1);
    };

    const drawRoomLabel = (text: string, num: string, x: number, z: number) => {
      const px = toX(x);
      const py = toY(z);
      
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.font = 'bold 32px monospace';
      ctx.fillText(num, px, py - 22);
      
      ctx.font = '24px monospace';
      ctx.fillText(text, px, py + 22);
    };

    const drawDimension = (val: string, x1: number, z1: number, x2: number, z2: number, isHoriz = true) => {
      const px1 = toX(x1);
      const py1 = toY(z1);
      const px2 = toX(x2);
      const py2 = toY(z2);
      const mx = (px1 + px2) / 2;
      const my = (py1 + py2) / 2;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();

      // Architectural ticks
      if (isHoriz) {
        drawLine(x1, z1 - 0.25, x1, z1 + 0.25, 2, '#ef4444');
        drawLine(x2, z2 - 0.25, x2, z2 + 0.25, 2, '#ef4444');
      } else {
        drawLine(x1 - 0.25, z1, x1 + 0.25, z1, 2, '#ef4444');
        drawLine(x2 - 0.25, z2, x2 + 0.25, z2, 2, '#ef4444');
      }

      ctx.font = 'italic bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val, mx, isHoriz ? my - 22 : my + 30);
    };

    const corrXW = -1.125;
    const corrXE = 1.105;
    const fNum = floorIdx + 1;

    if (floorIdx === 0) {
      // ─────────── 1st FLOOR (GROUND) ───────────
      // 1st Floor Colored Zones (matches official navigation plan)
      // West Classrooms (light blue)
      drawRect(xW, -27.635, corrXW, -21.115, '#cce4f0'); // Room 108/109
      drawRect(xW, -21.115, corrXW, -18.785, '#cce4f0'); // Room 107
      drawRect(xW, -18.785, corrXW, -7.055, '#cce4f0');  // Мастерская
      drawRect(xW, -7.055, corrXW, -1.055, '#cce4f0');   // Каб. 103В
      drawRect(xW, -1.055, corrXW, +1.875, '#cce4f0');   // Каб. 103А
      drawRect(xW, +8.045, corrXW, +13.425, '#cce4f0');  // Каб. 103
      drawRect(xW, +13.425, corrXW, 27.635, '#cce4f0');   // Каб. 101

      // West Stairs (orange-peach)
      drawRect(xW, +1.875, corrXW, +8.045, '#fad7b1'); 

      // East Classrooms (light blue)
      drawRect(corrXE, +2.255, xE, +12.575, '#cce4f0');  // Каб. 104
      drawRect(corrXE, +15.575, xE, 27.635, '#cce4f0');  // Каб. 102

      // East Cash Desk / Stairs (orange)
      drawRect(corrXE, -10.405, xE, -4.625, '#fad7b1'); // Касса
      drawRect(corrXE, +12.575, xE, +15.575, '#fad7b1');  // Stairs East

      // Draw Main Walls
      drawLine(corrXW, -21.115, corrXW, 27.635, 6, '#000000');
      drawLine(corrXE, -21.115, corrXE, -10.405, 6, '#000000');
      drawLine(corrXE, +2.255, corrXE, 27.635, 6, '#000000');
      drawLine(corrXE, -27.635, corrXE, -21.115, 6, '#000000');
      drawLine(xW, -21.115, corrXW, -21.115, 6, '#000000');
      drawLine(corrXE, -21.115, xE, -21.115, 6, '#000000');

      // Room 108/109 Partition
      drawLine(corrXW - 1.5, -27.635, corrXW - 1.5, -21.115, 5, '#000000');

      // Section 2: West rooms partitions
      drawLine(xW, -18.785, corrXW, -18.785, 5, '#000000');
      drawLine(xW, -7.055, corrXW, -7.055, 5, '#000000');
      drawLine(xW, -1.055, corrXW, -1.055, 5, '#000000');
      drawLine(xW, +1.875, corrXW, +1.875, 5, '#000000');

      // West Stairs partition
      drawLine(xW, +8.045, corrXW, +8.045, 5, '#000000');
      const restroomMidX = (xW + corrXW) / 2;
      
      // Draw stair steps decor instead of toilet walls
      for (let sy = +2.4; sy <= +7.4; sy += 0.5) {
        drawLine(xW, sy, corrXW, sy, 2, '#475569');
      }

      drawLine(xW, +13.425, corrXW, +13.425, 5, '#000000');
      drawLine(xW, +19.795, corrXW, +19.795, 5, '#000000');

      // Section 3: East rooms partitions
      drawLine(corrXE, -13.295, xE, -13.295, 5, '#000000');
      drawLine(corrXE, -4.625, xE, -4.625, 5, '#000000');

      // Draw eastern restroom partition
      const eastRestroomMidX = 5.8;
      drawLine(eastRestroomMidX, -13.295, eastRestroomMidX, -10.405, 4, '#000000');
      drawLine(corrXE, -11.85, eastRestroomMidX, -11.85, 3, '#777777');

      drawLine(corrXE, -1.975, xE, -1.975, 5, '#000000');
      drawLine(corrXE, +2.255, xE, +2.255, 5, '#000000');
      drawLine(corrXE, +12.575, xE, +12.575, 5, '#000000');
      drawLine(corrXE, +15.575, xE, +15.575, 5, '#000000');
      drawLine(corrXE, +27.635, xE, +27.635, 5, '#000000');

      // Room Label Annotations (matches official navigation chart)
      drawRoomLabel('84.0 м²', 'Каб. 108', (xW + corrXW - 1.5)/2, -24.375);
      drawRoomLabel('15.4 м²', 'Каб. 109', (corrXW - 1.5 + corrXW)/2, -24.375);
      drawRoomLabel('19.4 м²', 'Каб. 107', (xW + corrXW)/2, -19.95);
      drawRoomLabel('Мастерская', 'Каб. 105', (xW + corrXW)/2, -12.92);
      drawRoomLabel('38.4 м²', 'Каб. 103В', (xW + corrXW)/2, -4.055);
      drawRoomLabel('18.2 м²', 'Каб. 103А', (xW + corrXW)/2, +0.41);
      drawRoomLabel('Лестница', 'Спуск/Подъем', (xW + corrXW)/2, +4.96);
      drawRoomLabel('53.8 м²', 'Каб. 103', (xW + corrXW)/2, +10.735);
      drawRoomLabel('53.8 м²', 'Каб. 101', (xW + corrXW)/2, +16.61);

      drawRoomLabel('Коридор 1', 'Каб. 100', (corrXW + corrXE)/2, 0.0);

      drawRoomLabel('Вход/Тамбур', 'Лит. Б1', (corrXE + xE)/2, -24.375);
      drawRoomLabel('22.1 м²', 'Пом. 23', (corrXE + xE)/2, -18.89);
      drawRoomLabel('18.7 м²', 'Пом. 24', (corrXE + xE)/2, -14.98);
      drawRoomLabel('Санузлы', 'Муж/Жен', (corrXE + xE)/2, -11.85);
      drawRoomLabel('Касса', 'Пом. 28', (corrXE + xE)/2, -7.515);
      drawRoomLabel('17.2 м²', 'Каб. 104Б', (corrXE + xE)/2, -3.3);
      drawRoomLabel('64.3 м²', 'Каб. 104', (corrXE + xE)/2, +7.415);
      drawRoomLabel('Лестница 2', 'Коридор', (corrXE + xE)/2, +14.075);
      drawRoomLabel('74.0 м²', 'Каб. 102', (corrXE + xE)/2, +21.605);
    } else {
      // ─────────── TYPICAL FLOORS (2-4) ───────────
      drawLine(corrXW, -27.635, corrXW, 27.635, 6, '#000000');
      drawLine(corrXE, -27.635, corrXE, 27.635, 6, '#000000');

      // West partitions (3 simple typical partitions forming 4 large classrooms)
      drawLine(xW, -14.0, corrXW, -14.0, 5, '#000000');
      drawLine(xW, 0.0, corrXW, 0.0, 5, '#000000');
      drawLine(xW, 14.0, corrXW, 14.0, 5, '#000000');

      // East partitions (3 simple typical partitions forming 4 large classrooms)
      drawLine(corrXE, -14.0, xE, -14.0, 5, '#000000');
      drawLine(corrXE, 0.0, xE, 0.0, 5, '#000000');
      drawLine(corrXE, 14.0, xE, 14.0, 5, '#000000');

      // West room labels
      drawRoomLabel('135.0 м²', `лаб. ${fNum}11`, (xW + corrXW)/2, -21.0);
      drawRoomLabel('135.0 м²', `каб. ${fNum}13`, (xW + corrXW)/2, -7.0);
      drawRoomLabel('135.0 м²', `каб. ${fNum}15`, (xW + corrXW)/2, +7.0);
      drawRoomLabel('135.0 м²', `лаб. ${fNum}17`, (xW + corrXW)/2, +21.0);

      // Corridor label
      drawRoomLabel('79.7 м²', `коридор ${fNum}0`, (corrXW + corrXE)/2, 0.0);

      // East room labels
      drawRoomLabel('130.0 м²', `лекц. ${fNum}21`, (corrXE + xE)/2, -21.0);
      drawRoomLabel('130.0 м²', `каб. ${fNum}23`, (corrXE + xE)/2, -7.0);
      drawRoomLabel('130.0 м²', `лаб. ${fNum}25`, (corrXE + xE)/2, +7.0);
      drawRoomLabel('130.0 м²', `лекц. ${fNum}27`, (corrXE + xE)/2, +21.0);
    }

    // Draw Stairs indicator
    drawLine(xE - 2.3, -13.295, xE, -13.295, 3, '#000000');
    drawLine(xE - 2.3, -10.405, xE, -10.405, 3, '#000000');
    for (let sy = -13.295; sy <= -10.405; sy += 0.3) {
      drawLine(xE - 2.3, sy, xE, sy, 1.5, '#888888');
    }
    drawLine(xE - 2.3, +8.345, xE, +8.345, 3, '#000000');
    drawLine(xE - 2.3, +11.345, xE, +11.345, 3, '#000000');
    for (let sy = +8.345; sy <= +11.345; sy += 0.4) {
      drawLine(xE - 2.3, sy, xE, sy, 1.5, '#888888');
    }

    // Dimensions
    drawDimension('6.40', xW + 0.1, -27.2, corrXW - 0.1, -27.2, true);
    drawDimension('2.23', corrXW + 0.1, -27.2, corrXE - 0.1, -27.2, true);
    drawDimension('6.20', corrXE + 0.1, -27.2, xE - 0.1, -27.2, true);

    drawDimension('6.52', xW + 0.3, zN, xW + 0.3, -21.115, false);
    drawDimension('2.33', xW + 0.3, -21.115, xW + 0.3, -18.785, false);
    drawDimension('11.73', xW + 0.3, -18.785, xW + 0.3, -7.055, false);
    drawDimension('6.00', xW + 0.3, -7.055, xW + 0.3, -1.055, false);
    drawDimension('2.93', xW + 0.3, -1.055, xW + 0.3, +1.875, false);
    drawDimension('6.17', xW + 0.3, +1.875, xW + 0.3, +8.045, false);
    drawDimension('5.38', xW + 0.3, +8.045, xW + 0.3, +13.425, false);
    drawDimension('6.37', xW + 0.3, +13.425, xW + 0.3, +19.795, false);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [floorIdx]);

  if (!tex) return <meshStandardMaterial color="#cccccc" />;
  return (
    <meshStandardMaterial 
      map={tex} 
      roughness={0.9} 
      side={THREE.DoubleSide} 
      polygonOffset={true}
      polygonOffsetFactor={-1.5}
      polygonOffsetUnits={-1.5}
    />
  );
};

export const BFloorBlueprintMaterial = ({ width, depth, floorIdx }: { width: number, depth: number, floorIdx: number }) => {
  const tex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 1024);

    const xW = -14.05;
    const xE = +14.05;
    const zN = -11.84;
    const zS = +11.84;

    function toX(valX: number) { return ((valX - xW) / (xE - xW)) * 1024; }
    function toY(valZ: number) { return ((valZ - zN) / (zS - zN)) * 1024; }

    // Draw precise millimeter / centimeter / meter grid rules
    // Fine 100mm (10cm) sub-grid:
    ctx.strokeStyle = 'rgba(15, 60, 200, 0.035)';
    ctx.lineWidth = 1;
    for (let m = -14.0; m <= 14.0; m += 0.1) {
      if (Math.abs(m - Math.round(m)) < 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(toX(m), 0);
      ctx.lineTo(toX(m), 1024);
      ctx.stroke();
    }
    for (let m = -12.0; m <= 12.0; m += 0.1) {
      if (Math.abs(m - Math.round(m)) < 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(0, toY(m));
      ctx.lineTo(1024, toY(m));
      ctx.stroke();
    }

    // Main 1m (1000mm) grid:
    ctx.strokeStyle = 'rgba(15, 60, 200, 0.09)';
    ctx.lineWidth = 1;
    for (let m = -14; m <= 14; m += 1) {
      ctx.beginPath();
      ctx.moveTo(toX(m), 0);
      ctx.lineTo(toX(m), 1024);
      ctx.stroke();
    }
    for (let m = -12; m <= 12; m += 1) {
      ctx.beginPath();
      ctx.moveTo(0, toY(m));
      ctx.lineTo(1024, toY(m));
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 1016, 1016);

    // Draw ruler ticks and meter captions for extreme alignment precision
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let m = -11; m <= 11; m += 1) {
      const yVal = toY(m);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(4, yVal); ctx.lineTo(14, yVal);
      ctx.moveTo(1020, yVal); ctx.lineTo(1010, yVal);
      ctx.stroke();

      ctx.fillText(`${m}m`, 24, yVal);
      ctx.fillText(`${m}m`, 1000, yVal);
    }
    for (let m = -14; m <= 14; m += 1) {
      const xVal = toX(m);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xVal, 4); ctx.lineTo(xVal, 14);
      ctx.moveTo(xVal, 1020); ctx.lineTo(xVal, 1010);
      ctx.stroke();

      ctx.fillText(`${m}m`, xVal, 22);
      ctx.fillText(`${m}m`, xVal, 1002);
    }

    const drawRect = (x1: number, z1: number, x2: number, z2: number, color: string) => {
      ctx.fillStyle = color;
      const rx1 = toX(x1);
      const rz1 = toY(z1);
      const rx2 = toX(x2);
      const rz2 = toY(z2);
      ctx.fillRect(rx1, rz1, rx2 - rx1, rz2 - rz1);
    };

    const drawLine = (x1: number, z1: number, x2: number, z2: number, w = 4, color = '#000000') => {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(toX(x1), toY(z1));
      ctx.lineTo(toX(x2), toY(z2));
      ctx.stroke();
    };

    const drawRoomLabel = (text: string, num: string, x: number, z: number) => {
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(num, toX(x), toY(z) - 15);
      ctx.font = '18px monospace';
      ctx.fillText(text, toX(x), toY(z) + 15);
    };

    const fNum = floorIdx + 1;

    if (floorIdx === 0) {
      // Ground floor - Lit. B
      // Colored backgrounds matching the navigation layout
      drawRect(-14.05, -11.84, -3.5, -7.5, '#cce4f0'); // Room 110 (blue)
      drawRect(3.5, -11.84, 14.05, -7.5, '#cce4f0');   // Room 112 (blue)
      drawRect(-3.5, -11.84, 3.5, -10.0, '#fad7b1');    // Stairs North (orange)
      drawRect(-14.05, -2.5, 14.05, 1.4, '#fbcfe8');    // Гардероб (pink)

      drawLine(-3.5, -10.0, 3.5, -10.0, 6);
      drawLine(-3.5, -11.84, -3.5, -10.0, 6);
      drawLine(3.5, -11.84, 3.5, -10.0, 6);
      for (let sy = -11.84; sy <= -10.0; sy += 0.3) {
        drawLine(-3.5, sy, 3.5, sy, 2, '#475569');
      }

      // Northwest room partitions
      drawLine(-7.0, -11.84, -7.0, -7.5, 5);
      drawLine(-14.05, -7.5, 14.05, -7.5, 6);

      // Northeast room partitions
      drawLine(7.0, -11.84, 7.0, -7.5, 5);

      // Central dividers
      drawLine(-2.0, -7.5, -2.0, -2.5, 5);
      drawLine(2.0, -7.5, 2.0, -2.5, 5);
      drawLine(-2.0, -5.0, 2.0, -5.0, 5);

      // Corridor walls
      drawLine(-14.05, -2.5, 14.05, -2.5, 6);
      drawLine(-14.05, 1.4, 14.05, 1.4, 6); // Bottom wall of Garderob

      // Columns
      [-9.5, -4.5, +4.5, +9.5].forEach(cxVal => {
        const px1 = toX(cxVal), py1 = toY(-1.0);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px1 - 10, py1 - 10, 20, 20);
        const px2 = toX(cxVal), py2 = toY(4.0);
        ctx.fillRect(px2 - 10, py2 - 10, 20, 20);
      });

      // Labels
      drawRoomLabel('Гардероб', 'S = 184 м²', 0, -0.5);
      drawRoomLabel('Каб. 110', '72.5 м²', -8.5, -9.5);
      drawRoomLabel('Каб. 112', '72.5 м²', 8.5, -9.5);
      drawRoomLabel('Лестница', 'Служебн.', 0, -11.0);

      // Draw ВЫ ЗДЕСЬ target locator in the lobby at the front door!
      const startX = toX(0);
      const startY = toY(7.0);
      
      // Draw smooth concentric animation rings
      ctx.beginPath();
      ctx.arc(startX, startY, 24, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(startX, startY, 14, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = '#1d4ed8';
      ctx.textAlign = 'center';
      ctx.fillText('ВЫ ЗДЕСЬ', startX, startY + 54);
    } else {
      // Typical floor - corridors, cabinets
      drawLine(-12.0, -7.5, -12.0, 11.84, 6);
      drawLine(12.0, -7.5, 12.0, 11.84, 6);
      drawLine(-12.0, -2.5, 12.0, -2.5, 5);
      drawLine(-12.0, 5.0, 12.0, 5.0, 5);

      drawRoomLabel('61.8 м²', `коридор ${fNum}06`, 0, 1.0);
      drawRoomLabel('53.4 м²', `пом. ${fNum}07`, -6.0, -5.0);
      drawRoomLabel('54.0 м²', `пом. ${fNum}08`, 6.0, -5.0);
      drawRoomLabel('Библиотека', `пом. ${fNum}21`, -13.0, 2.0);
      drawRoomLabel('Библиотека', `пом. ${fNum}23`, 13.0, 2.0);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [floorIdx]);

  if (!tex) return <meshStandardMaterial color="#cccccc" />;
  return (
    <meshStandardMaterial 
      map={tex} 
      roughness={0.9} 
      side={THREE.DoubleSide} 
      polygonOffset={true}
      polygonOffsetFactor={-1.5}
      polygonOffsetUnits={-1.5}
    />
  );
};

export const B2FloorBlueprintMaterial = ({ width, depth, floorIdx }: { width: number, depth: number, floorIdx: number }) => {
  const tex = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Fill white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 2048);

    const xW = -6.55;
    const xE = +6.55;
    const zN = -21.485;
    const zS = +21.485;

    function toX(valX: number) { return ((valX - xW) / (xE - xW)) * 512; }
    function toY(valZ: number) { return ((valZ - zN) / (zS - zN)) * 2048; }

    // Draw precise millimeter / centimeter / meter grid rules
    // Fine 100mm (10cm) sub-grid:
    ctx.strokeStyle = 'rgba(15, 60, 200, 0.035)';
    ctx.lineWidth = 1;
    for (let m = -7.0; m <= 7.0; m += 0.1) {
      if (Math.abs(m - Math.round(m)) < 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(toX(m), 0);
      ctx.lineTo(toX(m), 2048);
      ctx.stroke();
    }
    for (let m = -21.0; m <= 21.0; m += 0.1) {
      if (Math.abs(m - Math.round(m)) < 0.01) continue;
      ctx.beginPath();
      ctx.moveTo(0, toY(m));
      ctx.lineTo(512, toY(m));
      ctx.stroke();
    }

    // Main 1m (1000mm) grid:
    ctx.strokeStyle = 'rgba(15, 60, 200, 0.09)';
    ctx.lineWidth = 1;
    for (let m = -6; m <= 6; m += 1) {
      ctx.beginPath();
      ctx.moveTo(toX(m), 0);
      ctx.lineTo(toX(m), 2048);
      ctx.stroke();
    }
    for (let m = -21; m <= 21; m += 1) {
      ctx.beginPath();
      ctx.moveTo(0, toY(m));
      ctx.lineTo(512, toY(m));
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 2040);

    // Draw ruler ticks and meter captions for extreme alignment precision
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let m = -21; m <= 21; m += 1) {
      const yVal = toY(m);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(4, yVal); ctx.lineTo(12, yVal);
      ctx.moveTo(508, yVal); ctx.lineTo(500, yVal);
      ctx.stroke();

      ctx.fillText(`${m}m`, 18, yVal);
      ctx.fillText(`${m}m`, 494, yVal);
    }
    for (let m = -6; m <= 6; m += 1) {
      const xVal = toX(m);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xVal, 4); ctx.lineTo(xVal, 12);
      ctx.moveTo(xVal, 2044); ctx.lineTo(xVal, 2036);
      ctx.stroke();

      ctx.fillText(`${m}m`, xVal, 17);
      ctx.fillText(`${m}m`, xVal, 2029);
    }

    const drawRect = (x1: number, z1: number, x2: number, z2: number, color: string) => {
      ctx.fillStyle = color;
      const rx1 = toX(x1);
      const rz1 = toY(z1);
      const rx2 = toX(x2);
      const rz2 = toY(z2);
      ctx.fillRect(rx1, rz1, rx2 - rx1, rz2 - rz1);
    };

    const drawLine = (x1: number, z1: number, x2: number, z2: number, w = 4) => {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(toX(x1), toY(z1));
      ctx.lineTo(toX(x2), toY(z2));
      ctx.stroke();
    };

    const drawRoomLabel = (text: string, num: string, x: number, z: number) => {
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(num, toX(x), toY(z) - 12);
      ctx.font = '15px monospace';
      ctx.fillText(text, toX(x), toY(z) + 12);
    };

    const corrXW = -1.0;
    const corrXE = +1.0;
    const fNum = floorIdx + 1;

    if (floorIdx === 0) {
      // Ground B2
      // Fills first
      // Left side classrooms (light blue)
      drawRect(xW, -18.0, corrXW, -13.0, '#cce4f0');
      drawRect(xW, -13.0, corrXW, -10.0, '#cce4f0');
      drawRect(xW, -10.0, corrXW, -7.0, '#cce4f0');
      drawRect(xW, -7.0, corrXW, -2.0, '#cce4f0');

      // Right side classrooms (light blue)
      drawRect(corrXE, -18.0, xE, -13.0, '#cce4f0');
      drawRect(corrXE, -13.0, xE, -10.0, '#cce4f0');
      drawRect(corrXE, -10.0, xE, -7.0, '#cce4f0');
      drawRect(corrXE, -7.0, xE, -4.0, '#cce4f0');
      drawRect(corrXE, -4.0, xE, -2.0, '#cce4f0');

      // Dining Room (Столовая - warm peach/orange background!)
      drawRect(xW, -2.0, xE, zS, '#fad7b1');

      drawLine(xW, -19.0, xE, -19.0, 5);
      drawLine(xW, -16.0, xE, -16.0, 5);
      drawLine(-3.0, -19.0, -3.0, -16.0, 4);
      drawLine(3.0, -19.0, 3.0, -16.0, 4);

      // Corridor
      drawLine(corrXW, -16.0, corrXW, -4.915, 5);
      drawLine(corrXE, -16.0, corrXE, -2.0, 5);

      [-13.0, -10.0, -7.0].forEach(zVal => {
        drawLine(xW, zVal, corrXW, zVal, 4);
      });
      [-13.0, -10.0, -7.0, -4.0].forEach(zVal => {
        drawLine(corrXE, zVal, xE, zVal, 4);
      });

      drawLine(xW, -2.0, xE, -2.0, 5);
      drawLine(xW, 18.0, xE, 18.0, 5);

      // Columns
      [-3.0, 3.0].forEach(cxVal => {
        [-1.0, 7.0, 15.0].forEach(czVal => {
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(toX(cxVal) - 8, toY(czVal) - 8, 16, 16);
        });
      });

      // Standard-sized labels matching blueprint
      drawRoomLabel('Столовая', 'S = 186 м²', 0.0, 8.0);
      drawRoomLabel('Коридор', 'Пом. 29', 0, -5.0);

      drawRoomLabel('Каб. 115', '24.2 м²', (xW + corrXW)/2, -14.5);
      drawRoomLabel('Каб. 117', '18.1 м²', (xW + corrXW)/2, -11.5);
      drawRoomLabel('Каб. 119', '18.1 м²', (xW + corrXW)/2, -8.5);
      drawRoomLabel('Каб. 121', '24.2 м²', (xW + corrXW)/2, -4.5);

      drawRoomLabel('Каб. 116', '16.1 м²', (corrXE + xE)/2, -14.5);
      drawRoomLabel('Каб. 118', '16.1 м²', (corrXE + xE)/2, -11.5);
      drawRoomLabel('Каб. 120', '16.1 м²', (corrXE + xE)/2, -8.5);
      drawRoomLabel('Каб. 122', '16.1 м²', (corrXE + xE)/2, -5.5);
      drawRoomLabel('Кабинет', '12.2 м²', (corrXE + xE)/2, -3.0);
    } else {
      // Typical B2
      drawLine(corrXW, zN, corrXW, zS, 5);
      drawLine(corrXE, zN, corrXE, zS, 5);

      // Simplify: write partitions at -10.0 and +10.0 forming 3 spacious classrooms per side
      [-10.0, 10.0].forEach(zVal => {
        drawLine(xW, zVal, corrXW, zVal, 4);
        drawLine(corrXE, zVal, xE, zVal, 4);
      });

      drawRoomLabel('каб. ' + fNum + '31', '94.0 м²', -3.7, -15.0);
      drawRoomLabel('лаб. ' + fNum + '33', '94.0 м²', -3.7, 0.0);
      drawRoomLabel('каб. ' + fNum + '35', '94.0 м²', -3.7, 15.0);

      drawRoomLabel('лекц. ' + fNum + '32', '94.0 м²', 3.7, -15.0);
      drawRoomLabel('каб. ' + fNum + '34', '94.0 м²', 3.7, 0.0);
      drawRoomLabel('лаб. ' + fNum + '36', '94.0 м²', 3.7, 15.0);

      drawRoomLabel('Коридор', `кор. ${fNum}50`, 0, 0);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }, [floorIdx]);

  if (!tex) return <meshStandardMaterial color="#cccccc" />;
  return (
    <meshStandardMaterial 
      map={tex} 
      roughness={0.9} 
      side={THREE.DoubleSide} 
      polygonOffset={true}
      polygonOffsetFactor={-1.5}
      polygonOffsetUnits={-1.5}
    />
  );
};

// ──────────────────────────────────────────────────────────────────
//  BLUEPRINT OVERLAY
// ──────────────────────────────────────────────────────────────────
export const BlueprintOverlay = ({ url, opacity, scale, offset, activeFloor, heightOffset = 0 }: { url: string, opacity: number, scale: number, offset: {x: number, z: number}, activeFloor: number, heightOffset?: number }) => {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (url) {
      new THREE.TextureLoader().load(url, (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.anisotropy = 16;
        setTex(loadedTex);
      });
    } else {
      setTex(null);
    }
  }, [url]);

  if (!tex || activeFloor > 4) return null; // No blueprint for roof (floor 5)

  const floorIdx = activeFloor - 1;
  // Use the exact floor height of the central block B (baseY = 1.5, floorH = 2.9)
  // Plus 0.24 so it lies perfectly 2cm above the floor slice floorplan graphics (which are at +0.22)
  const floorY = 1.5 + floorIdx * 2.9 + 0.24 + heightOffset;

  return (
    <mesh position={[offset.x, floorY, offset.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[tex.image.width * scale, tex.image.height * scale]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} color="#ffffff" />
    </mesh>
  );
};

// ──────────────────────────────────────────────────────────────────
//  ROOFTOP COMPONENT
// ──────────────────────────────────────────────────────────────────
export const RoofTop = ({
  position,
  size,
  ventCount = 4,
  wallsOpacity = 1.0,
}: {
  position: [number, number, number];
  size: [number, number]; // [width, depth]
  ventCount?: number;
  wallsOpacity?: number;
}) => {
  const [W, D] = size;
  if (wallsOpacity === 0) return null; // Complete hide when walls are hidden

  const roofOpacity = wallsOpacity < 1.0 ? wallsOpacity * 0.35 : 1.0;
  const isTransparent = roofOpacity < 1.0;

  // Битумно-серая плита покрытия
  return (
    <group position={position}>
      {/* Сама плита кровли */}
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[W, 0.1, D]} />
        <meshStandardMaterial 
          color="#3A3833" 
          roughness={0.95} 
          metalness={0.0} 
          transparent={isTransparent}
          opacity={roofOpacity}
        />
      </mesh>
      {/* Россыпь "вздутий" — небольшие тёмные пятна на кровле */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = (Math.sin(i * 13.7) * 0.5) * (W - 2);
        const z = (Math.cos(i * 9.3) * 0.5) * (D - 2);
        return (
          <mesh key={`bub-${i}`} position={[x, 0.105, z]}>
            <cylinderGeometry args={[0.4 + (i % 3) * 0.2, 0.4 + (i % 3) * 0.2, 0.04, 12]} />
            <meshStandardMaterial 
              color="#2A2825" 
              roughness={1} 
              transparent={isTransparent}
              opacity={roofOpacity}
            />
          </mesh>
        );
      })}
      {/* Вентиляционные шахты — металлические трубы с шапками */}
      {Array.from({ length: ventCount }).map((_, i) => {
        const t = (i + 0.5) / ventCount;
        const x = -W / 2 + 2 + t * (W - 4);
        const z = (i % 2 === 0 ? -1 : 1) * D / 4;
        return (
          <group key={`vent-${i}`} position={[x, 0, z]}>
            {/* Бетонный «стакан»-основание вокруг трубы */}
            <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.9, 0.5, 0.9]} />
              <meshStandardMaterial 
                color="#7A7470" 
                roughness={0.95} 
                transparent={isTransparent}
                opacity={roofOpacity}
              />
            </mesh>
            {/* Сама труба */}
            <mesh position={[0, 0.85, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 1.0, 14]} />
              <meshStandardMaterial 
                color="#888880" 
                metalness={0.6} 
                roughness={0.55} 
                transparent={isTransparent}
                opacity={roofOpacity}
              />
            </mesh>
            {/* Шапка-зонтик */}
            <mesh position={[0, 1.42, 0]} castShadow>
              <cylinderGeometry args={[0.36, 0.22, 0.12, 14]} />
              <meshStandardMaterial 
                color="#777" 
                metalness={0.6} 
                roughness={0.55} 
                transparent={isTransparent}
                opacity={roofOpacity}
              />
            </mesh>
          </group>
        );
      })}
      {/* Антенна / молниеотвод */}
      <mesh position={[W / 3, 1.5, D / 3]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 3, 6]} />
        <meshStandardMaterial 
          color="#444" 
          metalness={0.7} 
          roughness={0.5} 
          transparent={isTransparent}
          opacity={roofOpacity}
        />
      </mesh>
    </group>
  );
};

const frameTypeFor = (key: string): 'white' | 'brown' => {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return ((h & 0xff) % 100) < 65 ? 'white' : 'brown';
};

export const WindowsGroup = ({ activeFloor, wallsOpacity = 1.0 }: { activeFloor: number, wallsOpacity?: number }) => {
  const [isNight, setIsNight] = useState(false);
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    // delay subscription slightly to ensure weatherState is initialized
    const timer = setTimeout(() => {
      if (typeof weatherState !== 'undefined') {
        setIsNight(weatherState.isNight);
        unsubscribe = weatherState.subscribe((state) => setIsNight(state.isNight));
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (wallsOpacity === 0) return null;

  const yLevels = [3.15, 6.45, 9.75, 13.05];   // 4 этажа крыльев (корпус 1.5..14.7, этаж 3.3)
  const yLevelsB = [2.95, 5.85, 8.75, 11.65];  // 4 этажа Лит. Б (корпус 1.5..13.1, этаж 2.9)
  // Храним окна по этажам
  const r: { [key: number]: any[] } = { 0: [], 1: [], 2: [], 3: [], 4: [] };

  // Размещаем группу из N окон вплотную, центр группы в `cx`.
  // Шаг между центрами окон в группе = 1.55 м.
  const placeGroup = (
    n: number,
    cx: number,
    fixed: number,
    facing: 1 | -1,
    axis: 'x' | 'z',
    keyPrefix: string,
    f: number,
    y: number,
    frame: 'white' | 'brown' | 'auto' = 'auto',
    size: [number, number] = [1.45, 1.55]
  ) => {
    const pitch = size[0] + 0.1;
    const startOffset = -((n - 1) / 2) * pitch;
    const rot: [number, number, number] = axis === 'z'
      ? [0, facing === 1 ? -Math.PI / 2 : Math.PI / 2, 0]
      : [0, facing === 1 ? 0 : Math.PI, 0];
    for (let i = 0; i < n; i++) {
      const offset = startOffset + i * pitch;
      const pos: [number, number, number] = axis === 'x'
        ? [cx + offset, y, fixed + facing * 0.02]
        : [fixed + facing * 0.02, y, cx + offset];
      const fr = frame === 'auto' ? frameTypeFor(`${keyPrefix}${i}${f}`) : frame;
      const el = <Window key={`${keyPrefix}-${i}-${f}`} position={pos} rotation={rot} frame={fr} size={size} isNight={isNight} />;
      if (!r[f]) r[f] = [];
      r[f].push(el);
    }
  };

  const positionsB = [
    -12.83,   // Левая башня (0)
    -10.952,  // Обычное окно 1 (1)
    -8.0664,  // Обычное окно 2 (2)
    -6.0498,  // Обычное окно 3 (3)
    -4.0332,  // Обычное окно 4 (4)
    -2.0166,  // Обычное окно 5 (5)
    0.00,     // Обычное окно 6 (6)
    2.0166,   // Обычное окно 7 (7)
    4.0332,   // Обычное окно 8 (8)
    6.0498,   // Обычное окно 9 (9)
    8.0664,   // Обычное окно 10 (10)
    10.952,   // Обычное окно 11 (11)
    12.83     // Правая башня (12)
  ];

  for (let f = 0; f < yLevelsB.length; f++) {
    const y = yLevelsB[f];
    positionsB.forEach((x, i) => {
      const isStaircase = i === 0;
      const isRightTower = i === positionsB.length - 1;

      const isCoveredByNorthPortal = f === 0 && Math.abs(x) < 1.5;
      const hasNorthWindow = !isCoveredByNorthPortal;

      if (hasNorthWindow) {
        if (!r[f]) r[f] = [];
        if (isStaircase || isRightTower) {
          if (f === 0) {
            const prefix = `b-n-${isStaircase ? 'stair' : 'rt'}`;
            const windowConfig = [
              { floorIdx: 4, heights: [13.8, 14.8, 15.8], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 3, heights: [11.0, 12.2], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 2, heights: [8.2, 9.4], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 1, heights: [5.3], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 0, heights: [2.5], size: [0.9, 1.4], frame: 'brown' as const, hasPanel: false }
            ];

            windowConfig.forEach(({ floorIdx, heights, size, frame, hasPanel }) => {
              if (!r[floorIdx]) r[floorIdx] = [];
              heights.forEach((wy, idx) => {
                r[floorIdx].push(
                  <Window key={`${prefix}-w-${floorIdx}-${idx}`}
                    position={[x, wy, -12.46]}
                    rotation={[0, Math.PI, 0]}
                    frame={frame}
                    size={size as [number, number]}
                    isNight={isNight}
                  />
                );
                if (hasPanel) {
                  r[floorIdx].push(
                    <mesh key={`${prefix}-panel-${floorIdx}-${idx}`} castShadow receiveShadow position={[x, wy - 0.28, -12.42]}>
                      <boxGeometry args={[1.1, 0.12, 0.18]} />
                      <BeltMaterial args={[1.1, 0.12, 0.18]} />
                    </mesh>
                  );
                }
              });
            });
          }
        } else {
          const bayW = (i === 1 || i === positionsB.length - 2) ? 1.62 : 1.44;
          if (f === 0) {
            r[f].push(
              <Window key={`b-n-${i}-${f}`}
                position={[x, 2.95, -12.26]}
                rotation={[0, Math.PI, 0]}
                frame="brown"
                size={[0.9, 2.3]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-n-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 1.65, -12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-n-panel-mid-${i}-${f}`} castShadow receiveShadow position={[x, 4.45, -12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
          } else if (f === 1) {
            r[f].push(
              <Window key={`b-n-${i}-${f}`}
                position={[x, 5.85, -12.26]}
                rotation={[0, Math.PI, 0]}
                frame="white"
                size={[0.9, 2.1]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-n-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 4.6, -12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-n-panel-mid-${i}-${f}`} castShadow receiveShadow position={[x, 7.1, -12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
          } else if (f === 2) {
            r[f].push(
              <Window key={`b-n-${i}-${f}`}
                position={[x, 8.75, -12.26]}
                rotation={[0, Math.PI, 0]}
                frame="white"
                size={[0.9, 2.1]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-n-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 7.5, -12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-n-panel-mid-${i}-${f}`} castShadow receiveShadow position={[x, 10.0, -12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
          } else if (f === 3) {
            r[f].push(
              <Window key={`b-n-${i}-${f}`}
                position={[x, 11.65, -12.26]}
                rotation={[0, Math.PI, 0]}
                frame="white"
                size={[0.9, 2.1]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-n-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 10.4, -12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-n-panel-top-${i}-${f}`} castShadow receiveShadow position={[x, 12.9, -12.22]}>
                <boxGeometry args={[bayW, 0.45, 0.2]} />
                <BeltMaterial args={[bayW, 0.45, 0.2]} />
              </mesh>
            );
          }
        }
      }

      const isCoveredBySouthTambur = (f === 0 || f === 1) && x >= -0.5 && x <= 7.1;
      const hasSouthWindow = !isCoveredBySouthTambur;

      if (hasSouthWindow) {
        if (!r[f]) r[f] = [];
        if (isStaircase || isRightTower) {
          if (f === 0) {
            const prefix = `b-s-${isStaircase ? 'stair' : 'rt'}`;
            const windowConfig = [
              { floorIdx: 4, heights: [13.8, 14.8, 15.8], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 3, heights: [11.0, 12.2], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 2, heights: [8.2, 9.4], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 1, heights: [5.3], size: [0.9, 0.42], frame: 'white' as const, hasPanel: true },
              { floorIdx: 0, heights: [2.5], size: [0.9, 1.4], frame: 'brown' as const, hasPanel: false }
            ];

            windowConfig.forEach(({ floorIdx, heights, size, frame, hasPanel }) => {
              if (!r[floorIdx]) r[floorIdx] = [];
              heights.forEach((wy, idx) => {
                r[floorIdx].push(
                  <Window key={`${prefix}-w-${floorIdx}-${idx}`}
                    position={[x, wy, 12.46]}
                    frame={frame}
                    size={size as [number, number]}
                    isNight={isNight}
                  />
                );
                if (hasPanel) {
                  r[floorIdx].push(
                    <mesh key={`${prefix}-panel-${floorIdx}-${idx}`} castShadow receiveShadow position={[x, wy - 0.28, 12.42]}>
                      <boxGeometry args={[1.1, 0.12, 0.18]} />
                      <BeltMaterial args={[1.1, 0.12, 0.18]} />
                    </mesh>
                  );
                }
              });
            });
          }
        } else {
          const bayW = (i === 1 || i === positionsB.length - 2) ? 1.62 : 1.44;
          if (f === 0) {
            r[f].push(
              <Window key={`b-s-${i}-${f}`}
                position={[x, 2.95, 12.26]}
                frame="brown"
                size={[0.9, 2.3]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-s-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 1.65, 12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-s-panel-mid-${i}-${f}`} castShadow receiveShadow position={[x, 4.45, 12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
          } else if (f === 1) {
            r[f].push(
              <Window key={`b-s-${i}-${f}`}
                position={[x, 5.85, 12.26]}
                frame="white"
                size={[0.9, 2.1]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-s-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 4.6, 12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-s-panel-mid-${i}-${f}`} castShadow receiveShadow position={[x, 7.1, 12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
          } else if (f === 2) {
            r[f].push(
              <Window key={`b-s-${i}-${f}`}
                position={[x, 8.75, 12.26]}
                frame="white"
                size={[0.9, 2.1]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-s-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 7.5, 12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-s-panel-mid-${i}-${f}`} castShadow receiveShadow position={[x, 10.0, 12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
          } else if (f === 3) {
            r[f].push(
              <Window key={`b-s-${i}-${f}`}
                position={[x, 11.65, 12.26]}
                frame="white"
                size={[0.9, 2.1]}
                isNight={isNight}
              />
            );
            r[f].push(
              <mesh key={`b-s-panel-sill-${i}-${f}`} castShadow receiveShadow position={[x, 10.4, 12.22]}>
                <boxGeometry args={[bayW, 0.3, 0.18]} />
                <BeltMaterial args={[bayW, 0.3, 0.18]} />
              </mesh>
            );
            r[f].push(
              <mesh key={`b-s-panel-top-${i}-${f}`} castShadow receiveShadow position={[x, 12.9, 12.22]}>
                <boxGeometry args={[bayW, 0.45, 0.2]} />
                <BeltMaterial args={[bayW, 0.45, 0.2]} />
              </mesh>
            );
          }
        }
      }
    });
  }

  const B1_W = -30.90, B1_E = -14.66;
  const B1_S = -18.82, B1_N = +37.65;
  const B1_groupZ = [-2.5, 7.5, 17.5, 27.5];
  const B1_singleZ = [34];
  const B2_W = +14.66, B2_E = +27.95;
  const B2_N = -24.67, B2_S = +18.50;
  const B2_groupZ = [-18, -6.5, 5.5];
  const B2_singleZ = [-21.5, 12, 16];

  for (let f = 0; f < yLevels.length; f++) {
    const y = yLevels[f];
    
    const z2Start = 16.5;
    const z2End = 35.5;
    for (let i = 0; i < 8; i++) {
      const zPos = z2Start + i * ((z2End - z2Start) / 7);
      placeGroup(1, zPos, B1_E, +1, 'z', `zone2-s${i}`, f, y, 'auto', [1.7, 1.55]);
    }

    placeGroup(1, -22.78, B1_S, -1, 'x', `zone3`, f, y, 'auto', [2.1, 1.55]);

    B1_groupZ.forEach((z, gi) => {
      placeGroup(4, z, B1_W, -1, 'z', `zone4-g${gi}`, f, y);
    });
    B1_singleZ.forEach((z, si) => {
      placeGroup(1, z, B1_W, -1, 'z', `zone4-s${si}`, f, y);
    });
    const garageZPos = [-18.1, -16.8, -15.5, -14.2, -12.9];
    garageZPos.forEach((z, i) => {
      placeGroup(1, z, B1_W, -1, 'z', `zone4-garage-${i}`, f, y, 'auto', [1.1, 1.55]);
    });

    placeGroup(1, -22.78, B1_N, +1, 'x', `zone5`, f, y, 'auto', [2.1, 1.55]);

    placeGroup(3, 21.305, B2_S, +1, 'x', `zone7`, f, y);

    B2_groupZ.forEach((z, gi) => {
      placeGroup(4, z, B2_E, +1, 'z', `zone8-g${gi}`, f, y);
    });
    B2_singleZ.forEach((z, si) => {
      placeGroup(1, z, B2_E, +1, 'z', `zone8-s${si}`, f, y);
    });

    placeGroup(3, 21.305, B2_N, -1, 'x', `zone9`, f, y);

    B2_groupZ.forEach((z, gi) => {
      if (z < -14.15) placeGroup(4, z, B2_W, -1, 'z', `zone10-g${gi}`, f, y);
    });
    B2_singleZ.forEach((z, si) => {
      if (z < -14.15) placeGroup(1, z, B2_W, -1, 'z', `zone10-s${si}`, f, y);
    });

    B1_groupZ.forEach((z, gi) => {
      if (z < -14.15) placeGroup(4, z, B1_E, +1, 'z', `zone11-g${gi}`, f, y);
    });
    B1_singleZ.forEach((z, si) => {
      if (z < -14.15) placeGroup(1, z, B1_E, +1, 'z', `zone11-s${si}`, f, y);
    });

    B2_groupZ.forEach((z, gi) => {
      if (z > 14.15) placeGroup(4, z, B2_W, -1, 'z', `zone12-g${gi}`, f, y);
    });
    B2_singleZ.forEach((z, si) => {
      if (z > 14.15) placeGroup(1, z, B2_W, -1, 'z', `zone12-s${si}`, f, y);
    });
  }

  const markers: any[] = [];
  const addMarker = (text: string, position: [number, number, number], rotation: [number, number, number]) => {
    markers.push(
      <Text
        key={`marker-${text}`}
        position={position}
        rotation={rotation}
        fontSize={10}
        color="red"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.3}
        outlineColor="white"
      >
        {text}
      </Text>
    );
  };

  const markerY = 16;
  addMarker("1", [0, markerY, 14.15 + 0.5], [0, 0, 0]);               // ZONE 1
  addMarker("2", [B1_E + 0.5, markerY, 26], [0, Math.PI / 2, 0]);     // ZONE 2
  addMarker("3", [-22.78, markerY, B1_S - 0.5], [0, Math.PI, 0]);     // ZONE 3
  addMarker("4", [B1_W - 0.5, markerY, 5], [0, -Math.PI / 2, 0]);     // ZONE 4
  addMarker("5", [-22.78, markerY, B1_N + 0.5], [0, 0, 0]);           // ZONE 5
  addMarker("6", [0, markerY, -14.15 - 0.5], [0, Math.PI, 0]);        // ZONE 6
  addMarker("7", [21.305, markerY, B2_S + 0.5], [0, 0, 0]);           // ZONE 7
  addMarker("8", [B2_E + 0.5, markerY, -4], [0, Math.PI / 2, 0]);     // ZONE 8
  addMarker("9", [21.305, markerY, B2_N - 0.5], [0, Math.PI, 0]);     // ZONE 9
  addMarker("10", [B2_W - 0.5, markerY, -20], [0, -Math.PI / 2, 0]);  // ZONE 10
  addMarker("11", [B1_E + 0.5, markerY, -16.5], [0, Math.PI / 2, 0]); // ZONE 11
  addMarker("12", [B2_W - 0.5, markerY, 16.5], [0, -Math.PI / 2, 0]); // ZONE 12

  return (
    <group>
      {markers}
      {[0, 1, 2, 3, 4].map(f => (
        <FloorSlice key={f} activeFloor={activeFloor} floorIndex={f}>
          {r[f]}
        </FloorSlice>
      ))}
    </group>
  );
};

export const Rib = ({ position, height = 13.20, rotation = [0, 0, 0], onlyBrick = false }: any) => {
  const baseHeight = 1.5;
  const topHeight = height - baseHeight;
  if (onlyBrick) {
    return (
      <group position={[position[0], height/2, position[2]]} rotation={rotation}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, height, 0.6]} />
          <BrickMaterial args={[1.2, height, 0.6]} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={[position[0], 0, position[2]]} rotation={rotation}>
      <mesh castShadow receiveShadow position={[0, baseHeight / 2, 0]}>
        <boxGeometry args={[1.26, baseHeight, 0.64]} />
        <ConcreteMaterial args={[1.26, baseHeight, 0.64]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, baseHeight + topHeight / 2, 0]}>
        <boxGeometry args={[1.2, topHeight, 0.6]} />
        <BrickMaterial args={[1.2, topHeight, 0.6]} />
      </mesh>
    </group>
  );
};

export const SlicedRib = ({ activeFloor, position, height = 13.20, rotation = [0, 0, 0], onlyBrick = false, wallsOpacity = 1.0, skipFirstFloor = false }: any) => {
  const baseHeight = onlyBrick ? 0 : 1.5;
  const topHeight = height - baseHeight;
  const floors = 4;
  const sliceHeight = topHeight / floors;
  const isInsideTower = position[0] < -11.0 || position[0] > 11.0;
  
  if (wallsOpacity === 0) return null;
  
  return (
    <group position={[position[0], 0, position[2]]} rotation={rotation}>
      {!onlyBrick && !skipFirstFloor && (
        <mesh castShadow receiveShadow position={[0, baseHeight / 2, 0]}>
          <boxGeometry args={[0.64, baseHeight, 0.54]} />
          <ConcreteMaterial args={[0.64, baseHeight, 0.54]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
        </mesh>
      )}
      {[0, 1, 2, 3].map(f => {
        if (f === 0 && skipFirstFloor) return null;
        return (
          <FloorSlice key={f} activeFloor={activeFloor} floorIndex={f}>
            <mesh castShadow receiveShadow position={[0, baseHeight + sliceHeight / 2 + f * sliceHeight, 0]}>
              <boxGeometry args={[0.58, sliceHeight, 0.5]} />
              <BrickMaterial args={[0.58, sliceHeight, 0.5]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
            </mesh>
          </FloorSlice>
        );
      })}
      {!isInsideTower ? (
        <FloorSlice activeFloor={activeFloor} floorIndex={4}>
          <mesh castShadow receiveShadow position={[0, baseHeight + topHeight + 0.55, 0]}>
            <boxGeometry args={[0.58, 1.1, 0.5]} />
            <BrickMaterial args={[0.58, 1.1, 0.5]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, baseHeight + topHeight + 1.1 + 0.04, 0]}>
            <boxGeometry args={[0.66, 0.08, 0.56]} />
            <ConcreteMaterial args={[0.66, 0.08, 0.56]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
          </mesh>
        </FloorSlice>
      ) : (
        <FloorSlice activeFloor={activeFloor} floorIndex={4}>
          <mesh castShadow receiveShadow position={[0, 13.1 + 1.9, 0]}>
            <boxGeometry args={[0.58, 3.8, 0.5]} />
            <BrickMaterial args={[0.58, 3.8, 0.5]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 16.9 + 0.04, 0]}>
            <boxGeometry args={[0.66, 0.08, 0.56]} />
            <ConcreteMaterial args={[0.66, 0.08, 0.56]} transparent={wallsOpacity < 1.0} opacity={wallsOpacity} />
          </mesh>
        </FloorSlice>
      )}
    </group>
  );
};

export const Staircase = ({ position, args, steps = 5, direction = 'south', type = 'simple' }: any) => {
  const [w, h, d] = args;
  const [px, py, pz] = position;
  const stepH = h / steps;

  const r = [];
  for (let i = 0; i < steps; i++) {
    const currentHeight = (i + 1) * stepH;

    let cx = px, cz = pz;
    if (direction === 'south') {
      const stepD = d / steps;
      cz = pz + d / 2 - stepD / 2 - i * stepD;
    } else if (direction === 'north') {
      const stepD = d / steps;
      cz = pz - d / 2 + stepD / 2 + i * stepD;
    } else if (direction === 'east') {
      const stepW = w / steps;
      cx = px + w / 2 - stepW / 2 - i * stepW;
    } else if (direction === 'west') {
      const stepW = w / steps;
      cx = px - w / 2 + stepW / 2 + i * stepW;
    }

    if (type === 'simple') {
      r.push(
        <mesh castShadow receiveShadow key={`simp-${i}`} position={[cx, py + currentHeight / 2, cz]}>
          <boxGeometry args={[direction === 'east' || direction === 'west' ? w / steps : w, currentHeight, direction === 'north' || direction === 'south' ? d / steps : d]} />
          <GreyConcreteMaterial />
        </mesh>
      );
    } else if (type === 'main') {
      const stepW = direction === 'east' || direction === 'west' ? w / steps : w;
      const stepD = direction === 'north' || direction === 'south' ? d / steps : d;
      
      const boxW = stepW;
      const boxD = stepD;

      const treadThickness = 0.007;
      r.push(
        <mesh castShadow receiveShadow key={`tread-${i}`} position={[cx, py + currentHeight - treadThickness / 2, cz]}>
          <boxGeometry args={[boxW, treadThickness, boxD]} />
          <DirtyRubberTreadMaterial />
        </mesh>
      );
      r.push(
        <mesh castShadow receiveShadow key={`riser-${i}`} position={[cx, py + currentHeight / 2 - treadThickness / 2, cz]}>
          <boxGeometry args={[boxW, currentHeight - treadThickness, boxD]} />
          <GreyConcreteMaterial />
        </mesh>
      );
    }
  }

  if (type === 'main') {
    const sideT = 0.12;
    const sideH = h + 0.1;
    let clx1 = px, clz1 = pz;
    let clx2 = px, clz2 = pz;
    let curbW = w, curbD = d;
    
    if (direction === 'north' || direction === 'south') {
      clx1 = px - w / 2 - sideT / 2;
      clx2 = px + w / 2 + sideT / 2;
      curbW = sideT;
      curbD = d;
    } else {
      clz1 = pz - d / 2 - sideT / 2;
      clz2 = pz + d / 2 + sideT / 2;
      curbW = w;
      curbD = sideT;
    }

    r.push(
      <mesh castShadow receiveShadow key="curb-1" position={[clx1, py + sideH / 2, clz1]}>
        <boxGeometry args={[curbW, sideH, curbD]} />
        <GreyConcreteMaterial />
      </mesh>
    );
    r.push(
      <mesh castShadow receiveShadow key="curb-2" position={[clx2, py + sideH / 2, clz2]}>
        <boxGeometry args={[curbW, sideH, curbD]} />
        <GreyConcreteMaterial />
      </mesh>
    );
  }

  return <group>{r}</group>;
};

export const CanopyLights = () => {
  const [isNight, setIsNight] = useState(false);
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (typeof weatherState !== 'undefined') {
        setIsNight(weatherState.isNight);
        unsubscribe = weatherState.subscribe((state) => setIsNight(state.isNight));
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <>
      {[-3.0, -1.8, -0.6, 0.6, 1.8, 3.0].map((x, i) => (
        <group key={`led-${i}`} position={[x, 0.0, 1.6]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.04, 0.3]} />
            <meshStandardMaterial color="#505050" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0, -0.021, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.28, 0.28]} />
            <meshStandardMaterial 
              color={isNight ? "#FFEBB2" : "#A0A0A0"} 
              emissive={isNight ? "#FFEBB2" : "#000000"} 
              emissiveIntensity={isNight ? 1.5 : 0} 
            />
          </mesh>
          {isNight && <pointLight position={[0, -0.2, 0]} intensity={isNight ? 0.8 : 0} distance={6} color="#FFEBB2" />}
        </group>
      ))}
    </>
  );
};

// Layout drawings plan overlay lying on the asphalt yard floor, next to the building with dynamic CAD projective sync and precise 3D grids
export const AsphaltBlueprintBoard = ({ 
  activeFloor, 
  show,
  customWalls = [],
  selectedWallId = null
}: { 
  activeFloor: number; 
  show: boolean;
  customWalls?: CustomWall[];
  selectedWallId?: string | null;
}) => {
  // Find currently selected wall values to render indicators
  const selectedProjWall = useMemo(() => {
    if (!selectedWallId) return null;
    return customWalls.find(w => w.id === selectedWallId) || null;
  }, [customWalls, selectedWallId]);

  if (!show || activeFloor > 4) return null;
  const floorIdx = activeFloor - 1;

  return (
    <group position={[0, 0.015, 38.0]}>
      {/* Background Drawing Sheet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[72, 64]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} /> {/* Changed to blueprint dark blue/slate for stunning neon contrast */}
      </mesh>
      
      {/* Stylized Sheet Border */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[71.4, 63.4]} />
        <meshBasicMaterial color="#38bdf8" wireframe={true} transparent opacity={0.3} />
      </mesh>

      {/* 1. MASTER CAD MEASUREMENT GRID OVERLAY (0.1m and 1m intervals) */}
      {/* Coarse grid across the drafting board */}
      <gridHelper 
        args={[72, 72, '#38bdf8', '#1e293b']} 
        position={[0, 0.004, 0]} 
        transparent 
        opacity={0.35} 
      />
      {/* Fine-grain high-density grid lines for checking precise positions */}
      <gridHelper 
        args={[72, 144, '#0ea5e9', '#0f172a']} 
        position={[0, 0.003, 0]} 
        transparent 
        opacity={0.15} 
      />
      
      {/* Block B1 (West Wing) Sheet */}
      <group position={[-22.78, 0.002, 9.415]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[15.05, 55.27]} />
          <B1FloorBlueprintMaterial width={15.05} depth={55.27} floorIdx={floorIdx} />
        </mesh>
        {/* Local West Wing Micro-Grid */}
        <gridHelper 
          args={[60, 60, '#10b981', '#1e293b']} 
          position={[0, 0.005, 0]} 
          transparent 
          opacity={0.25} 
        />
        <Text
          position={[0, 0.008, -28.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.2}
          color="#34d399"
        >
          БЛОК Б1 (ЗАПАДНОЕ КРЫЛО)
        </Text>
      </group>
      
      {/* Block B (Central) Sheet */}
      <group position={[0, 0.002, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28.1, 23.68]} />
          <BFloorBlueprintMaterial width={28.1} depth={23.68} floorIdx={floorIdx} />
        </mesh>
        {/* Local Center Micro-Grid */}
        <gridHelper 
          args={[30, 30, '#3b82f6', '#1e293b']} 
          position={[0, 0.005, 0]} 
          transparent 
          opacity={0.25} 
        />
        <Text
          position={[0, 0.008, -12.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.2}
          color="#60a5fa"
        >
          БЛОК Б (ГЛАВНЫЙ КОРПУС)
        </Text>
      </group>
      
      {/* Block B2 (East Wing) Sheet */}
      <group position={[21.305, 0.002, -3.085]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[13.1, 42.97]} />
          <B2FloorBlueprintMaterial width={13.1} depth={42.97} floorIdx={floorIdx} />
        </mesh>
        {/* Local East Wing Micro-Grid */}
        <gridHelper 
          args={[45, 45, '#d97706', '#1e293b']} 
          position={[0, 0.005, 0]} 
          transparent 
          opacity={0.25} 
        />
        <Text
          position={[0, 0.008, -22.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.2}
          color="#f59e0b"
        >
          БЛОК Б2 (ВОСТОЧНОЕ КРЫЛО)
        </Text>
      </group>

      {/* 2. REAL-TIME SYNCHRONIZED VECTOR WALLS PROJECTED ONTO SHEET */}
      {customWalls
        .filter(w => w.floorIdx === floorIdx)
        .map(w => {
          let cx = 0;
          let cz = 0;
          if (w.blockType === 'B1') {
            cx = -22.78;
            cz = 9.415;
          } else if (w.blockType === 'B2') {
            cx = 21.305;
            cz = -3.085;
          }

          const isSelected = w.id === selectedWallId;
          const isFixed = w.isStairs || w.isColumn;
          
          let wallColor = '#2563eb'; // standard custom blueprint wall is sharp blue
          if (isSelected) wallColor = '#10b981'; // selected is glowing green
          else if (isFixed) wallColor = '#64748b'; // columns/stairs are grey

          return (
            <group key={`bp-proj-${w.id}`} position={[cx + w.x, 0.007, cz + w.z]} rotation={[0, w.angle || 0, 0]}>
              {/* Flat Solid wall projection */}
              <mesh castShadow={false} receiveShadow={false}>
                <boxGeometry args={[w.w, 0.04, w.d]} />
                <meshStandardMaterial 
                  color={wallColor} 
                  transparent 
                  opacity={isSelected ? 0.95 : 0.65} 
                  emissive={isSelected ? '#10b981' : '#000000'}
                  emissiveIntensity={isSelected ? 1.4 : 0.0}
                  roughness={0.1}
                  metalness={0.8}
                />
              </mesh>

              {/* Glowing Outline Box to show precise wireframe border on blueprint */}
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[w.w + 0.04, 0.01, w.d + 0.04]} />
                <meshBasicMaterial 
                  color={isSelected ? '#00ff88' : '#38bdf8'} 
                  wireframe 
                  transparent 
                  opacity={isSelected ? 0.9 : 0.4} 
                />
              </mesh>

              {/* Individual exact dimensions written next to the projected wall for millimetric alignment */}
              {isSelected && (
                <Text
                  position={[0, 0.15, -w.d / 2 - 0.4]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={0.35}
                  color="#10b981"
                  fontWeight="bold"
                >
                  {`X:${w.x.toFixed(2)}м Z:${w.z.toFixed(2)}м L:${w.d.toFixed(2)}м`}
                </Text>
              )}
            </group>
          );
        })}

      {/* 3. CO-ORGANIZED RADAR BULLSEYE ON THE CURRENT SELECTED WALL AREA */}
      {selectedProjWall && (
        <group>
          {(() => {
            let cx = 0;
            let cz = 0;
            if (selectedProjWall.blockType === 'B1') {
              cx = -22.78;
              cz = 9.415;
            } else if (selectedProjWall.blockType === 'B2') {
              cx = 21.305;
              cz = -3.085;
            }
            const sx = cx + selectedProjWall.x;
            const sz = cz + selectedProjWall.z;

            return (
              <group position={[sx, 0.05, sz]}>
                {/* Dual glowing rings targeting the precise intersection */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.5, 0.55, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[1.2, 1.25, 32]} />
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
                </mesh>
                
                {/* Horizontal & Vertical Crosshair Guidelines on the Drafting Board */}
                <mesh position={[0, -0.01, 0]}>
                  <boxGeometry args={[0.02, 0.01, 10.0]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.5} />
                </mesh>
                <mesh position={[0, -0.01, 0]}>
                  <boxGeometry args={[10.0, 0.01, 0.02]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.5} />
                </mesh>

                <Text
                  position={[0, 0.1, -1.8]}
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={0.45}
                  color="#10b981"
                  fontWeight="bold"
                  anchorX="center"
                >
                  🚧 АКТИВНЫЙ ФОКУС ПРИВЯЗКИ
                </Text>
              </group>
            );
          })()}
        </group>
      )}
    </group>
  );
};


