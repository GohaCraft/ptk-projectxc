"use client";

import React, { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { getProceduralTextures, BeltMaterial } from './Materials';

// ──────────────────────────────────────────────────────────────────
//  ZGU LOGO DIAMOND
// ──────────────────────────────────────────────────────────────────
export const ZguLogoDiamond = () => {
  const shapes = React.useMemo(() => {
    if (typeof THREE === 'undefined') return { backing: null, t1: null, t2: null, t3: null, starWhite: null, starBlue: null };

    const O = new THREE.Vector2(-1, 0);
    const Bottom = new THREE.Vector2(0, -0.7);
    const RightLow = new THREE.Vector2(0.7, -0.2);
    const RightHigh = new THREE.Vector2(1.0, 0.3);
    const Top = new THREE.Vector2(0.3, 0.9);
    const TopLeft = new THREE.Vector2(-0.4, 0.7);
    const FarLeft = new THREE.Vector2(-0.6, 0.5);

    // Backing shape
    const backingShape = new THREE.Shape();
    backingShape.moveTo(O.x, O.y);
    backingShape.lineTo(Bottom.x, Bottom.y);
    backingShape.lineTo(RightLow.x, RightLow.y);
    backingShape.lineTo(RightHigh.x, RightHigh.y);
    backingShape.lineTo(Top.x, Top.y);
    backingShape.lineTo(TopLeft.x, TopLeft.y);
    backingShape.lineTo(FarLeft.x, FarLeft.y);
    backingShape.lineTo(O.x, O.y);

    const T1 = new THREE.Shape();
    T1.moveTo(O.x, O.y); T1.lineTo(Bottom.x, Bottom.y); T1.lineTo(RightLow.x, RightLow.y); T1.lineTo(O.x, O.y);

    const T2 = new THREE.Shape();
    T2.moveTo(O.x, O.y); T2.lineTo(RightHigh.x, RightHigh.y); T2.lineTo(Top.x, Top.y); T2.lineTo(O.x, O.y);

    const T3 = new THREE.Shape();
    T3.moveTo(O.x, O.y); T3.lineTo(TopLeft.x, TopLeft.y); T3.lineTo(FarLeft.x, FarLeft.y); T3.lineTo(O.x, O.y);

    const extrudeWhite = { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.03, bevelSegments: 2 };
    const extrudeBlue = { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 };

    const starS = new THREE.Shape();
    starS.moveTo(0, 0.3); starS.lineTo(0.08, 0.08); starS.lineTo(0.3, 0); starS.lineTo(0.08, -0.08);
    starS.lineTo(0, -0.3); starS.lineTo(-0.08, -0.08); starS.lineTo(-0.3, 0); starS.lineTo(-0.08, 0.08); starS.lineTo(0, 0.3);

    return {
      backing: new THREE.ExtrudeGeometry(backingShape, extrudeWhite),
      t1: new THREE.ExtrudeGeometry(T1, extrudeBlue),
      t2: new THREE.ExtrudeGeometry(T2, extrudeBlue),
      t3: new THREE.ExtrudeGeometry(T3, extrudeBlue),
      starWhite: new THREE.ExtrudeGeometry(starS, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }),
      starBlue: new THREE.ExtrudeGeometry(starS, { depth: 0.04, bevelEnabled: false }),
    };
  }, []);

  if (!shapes.backing) return null;

  return (
    <group scale={0.45} position={[-0.8, 0, 0]}>
      {/* Белая подложка */}
      <mesh geometry={shapes.backing} castShadow>
         <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>
      
      {/* Синие секции */}
      <mesh geometry={shapes.t1} castShadow position={[0, 0, 0.01]}>
         <meshStandardMaterial color="#2d77b8" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh geometry={shapes.t2} castShadow position={[0, 0, 0.01]}>
         <meshStandardMaterial color="#2d77b8" roughness={0.4} metalness={0.1} />
      </mesh>
      <mesh geometry={shapes.t3} castShadow position={[0, 0, 0.01]}>
         <meshStandardMaterial color="#2d77b8" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Звезда */}
      <group position={[0.1, 1.15, 0.04]}>
         <mesh geometry={shapes.starWhite} castShadow>
            <meshStandardMaterial color="#ffffff" roughness={0.4} />
         </mesh>
         <mesh geometry={shapes.starBlue} castShadow position={[0, 0, 0.02]}>
            <meshStandardMaterial color="#2d77b8" roughness={0.4} metalness={0.1} />
         </mesh>
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  TRIANGLE HELPERS
// ──────────────────────────────────────────────────────────────────
export const Triangle = ({ pts, color }: { pts: [number, number][], color: string }) => {
  const vertices = new Float32Array([
    pts[0][0], pts[0][1], 0,
    pts[1][0], pts[1][1], 0,
    pts[2][0], pts[2][1], 0,
  ]);
  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={3}
          array={vertices}
          itemSize={3}
        />
      </bufferGeometry>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
};

export const ZguLogo = ({ position, scale = 1 }: { position: [number, number, number], scale?: number }) => {
  return (
    <group position={position} scale={scale}>
      {/* Main Bottom Face */}
      <Triangle pts={[[-1.1, 0.0], [0.0, -0.9], [0.9, 0.0]]} color="#007AC3" />
      {/* Upper faces */}
      <Triangle pts={[[-1.1, 0.0], [-0.6, 0.4], [0.1, 0.0]]} color="#90CBEB" />
      <Triangle pts={[[-0.6, 0.4], [-0.5, 0.2], [0.1, 0.0]]} color="#007AC3" />
      <Triangle pts={[[-0.5, 0.2], [0.6, 0.5], [0.1, 0.0]]} color="#1FA0DC" />
      <Triangle pts={[[0.6, 0.5], [0.9, 0.0], [0.1, 0.0]]} color="#90CBEB" />
      
      {/* 4-pointed star */}
      <group position={[1.3, 0.7, 0]} rotation={[0, 0, 0]}>
        <Triangle pts={[[0.0, 0.0], [0.0, 0.4], [0.4, 0.0]]} color="#1FA0DC" />
        <Triangle pts={[[0.0, 0.0], [0.4, 0.0], [0.0, -0.4]]} color="#007AC3" />
        <Triangle pts={[[0.0, 0.0], [0.0, -0.4], [-0.4, 0.0]]} color="#1FA0DC" />
        <Triangle pts={[[0.0, 0.0], [-0.4, 0.0], [0.0, 0.4]]} color="#007AC3" />
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  RUSSIAN FLAG
// ──────────────────────────────────────────────────────────────────
export const RussianFlag = ({
  position,
  rotation = [0, 0, 0],
  size = [1.4, 0.85],
  poleLength = 1.6,
  poleAngle = 0.45,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number];
  poleLength?: number;
  poleAngle?: number;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [W, H] = size;
  const stripH = H / 3;
  const refWhite = useRef<THREE.Mesh>(null);
  const refBlue  = useRef<THREE.Mesh>(null);
  const refRed   = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const animateMesh = (m: THREE.Mesh | null) => {
      if (!m) return;
      const g = m.geometry as THREE.PlaneGeometry;
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const distance = (x + W / 2) / W;
        const wave = Math.sin(time * 3.5 - x * 5) * 0.10 * distance
                   + Math.sin(time * 5.2 + x * 2) * 0.05 * distance;
        pos.setZ(i, wave);
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
    };
    animateMesh(refWhite.current);
    animateMesh(refBlue.current);
    animateMesh(refRed.current);
  });

  return (
    <group position={position} rotation={rotation} ref={groupRef}>
      {/* Кронштейн на стене */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.2, 0.1]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.6} roughness={0.5} />
      </mesh>
      <group rotation={[0, 0, poleAngle]}>
        {/* Древко горизонтальное */}
        <mesh position={[poleLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, poleLength, 10]} />
          <meshStandardMaterial color="#D5D5D5" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Шарик на конце */}
        <mesh position={[poleLength - 0.02, 0, 0]} castShadow>
          <sphereGeometry args={[0.06, 14, 14]} />
          <meshStandardMaterial color="#C9A14A" metalness={0.85} roughness={0.25} />
        </mesh>
        
        {/* Белая (верх) */}
        <mesh
          ref={refWhite}
          position={[0.05 + W / 2, stripH, 0]}
          castShadow
        >
          <planeGeometry args={[W, stripH, 20, 4]} />
          <meshStandardMaterial color="#FFFFFF" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        {/* Синяя (середина) */}
        <mesh
          ref={refBlue}
          position={[0.05 + W / 2, 0, 0]}
          castShadow
        >
          <planeGeometry args={[W, stripH, 20, 4]} />
          <meshStandardMaterial color="#0033A0" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        {/* Красная (низ) */}
        <mesh
          ref={refRed}
          position={[0.05 + W / 2, -stripH, 0]}
          castShadow
        >
          <planeGeometry args={[W, stripH, 20, 4]} />
          <meshStandardMaterial color="#D52B1E" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  DUCTS
// ──────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────
//  DUCTS — ОПТИМИЗИРОВАНО: один InstancedMesh вместо count*3
//  отдельных <mesh> с уникальными geometry/material каждый.
//  Geometry и material — module-level singletons (shared, без дублей).
// ──────────────────────────────────────────────────────────────────

const _ductGeomX = new THREE.BoxGeometry(0.08, 0.55, 0.06);
const _ductGeomZ = new THREE.BoxGeometry(0.06, 0.55, 0.08);
const _ductMat   = new THREE.MeshStandardMaterial({ color: '#0E0606', roughness: 1 });
const _ductDummy = new THREE.Object3D();

export const Ducts = ({
  start,
  end,
  y,
  fixed,
  axis,
  facing,
  count = 5,
}: {
  start: number;
  end: number;
  y: number;
  fixed: number;
  axis: 'x' | 'z';
  facing: 1 | -1;
  count?: number;
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const total = count * 3;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const length = end - start;
    let idx = 0;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const center = start + t * length;
      for (let k = -1; k <= 1; k++) {
        const offset = k * 0.18;
        if (axis === 'x') {
          _ductDummy.position.set(center + offset, y, fixed + facing * 0.05);
        } else {
          _ductDummy.position.set(fixed + facing * 0.05, y, center + offset);
        }
        _ductDummy.updateMatrix();
        mesh.setMatrixAt(idx, _ductDummy.matrix);
        idx++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [start, end, y, fixed, axis, facing, count]);

  const geom = axis === 'x' ? _ductGeomX : _ductGeomZ;

  return (
    <instancedMesh ref={meshRef} args={[geom, _ductMat, total]} frustumCulled />
  );
};

// Shared geometries/materials для AirDucts3D — создаются один раз,
// segments снижены с 16 до 8 (визуально незаметно на тонких трубах,
// но вдвое меньше треугольников).
const _airductMainGeom    = new THREE.CylinderGeometry(0.32, 0.32, 1, 8); // высота через scale
const _airductCapGeom     = new THREE.CylinderGeometry(0.5, 0.32, 0.55, 8);
const _airductConeGeom    = new THREE.ConeGeometry(0.42, 0.25, 8);
const _airductBracketGeom = new THREE.BoxGeometry(0.36, 0.06, 0.06);
const _airductMetalMat    = new THREE.MeshStandardMaterial({ color: '#B8BBC0', metalness: 0.7, roughness: 0.45 });
const _airductConeMat     = new THREE.MeshStandardMaterial({ color: '#7a7a7a', metalness: 0.6, roughness: 0.6 });
const _airductBracketMat  = new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.5, roughness: 0.7 });
const _airductDummy = new THREE.Object3D();
const _BRACKET_YS = [2.5, 5.5, 8.5, 11.5, 14.5];

export const AirDucts3D = ({ position, count = 3 }: { position: [number, number, number]; count?: number }) => {
  const totalH = 13.20 + 3.0;
  const bracketsRef = useRef<THREE.InstancedMesh>(null);

  // Кронштейны для всех труб через один InstancedMesh
  useEffect(() => {
    const mesh = bracketsRef.current;
    if (!mesh) return;
    let idx = 0;
    for (let i = 0; i < count; i++) {
      const z = -10 + i * 10;
      _BRACKET_YS.forEach((y) => {
        _airductDummy.position.set(0.18, y, z);
        _airductDummy.updateMatrix();
        mesh.setMatrixAt(idx, _airductDummy.matrix);
        idx++;
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count]);

  const ducts: any[] = [];
  for (let i = 0; i < count; i++) {
    const z = -10 + i * 10;
    ducts.push(
      <group key={`duct3d-${i}`} position={[0, 0, z]}>
        {/* Вертикальная труба — scale.y задаёт высоту общей геометрии */}
        <mesh position={[0.5, totalH / 2, 0]} scale={[1, totalH, 1]} geometry={_airductMainGeom} material={_airductMetalMat} castShadow />
        {/* Шапка-зонтик сверху */}
        <mesh position={[0.5, totalH + 0.35, 0]} geometry={_airductCapGeom} material={_airductMetalMat} castShadow />
        {/* Защитная сетка-конус сверху шапки */}
        <mesh position={[0.5, totalH + 0.7, 0]} geometry={_airductConeGeom} material={_airductConeMat} />
      </group>
    );
  }
  return (
    <group position={position}>
      {ducts}
      <instancedMesh ref={bracketsRef} args={[_airductBracketGeom, _airductBracketMat, count * _BRACKET_YS.length]} />
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  CARPET RACK
// ──────────────────────────────────────────────────────────────────
export const CarpetRack = ({
  position,
  rotation = 0,
  archCount = 7,
  spacing = 1.1,
  archWidth = 1.6,
  archHeights = [2.0, 1.85, 1.7, 1.55, 1.4, 1.25, 1.1],
}: {
  position: [number, number, number];
  rotation?: number;
  archCount?: number;
  spacing?: number;
  archWidth?: number;
  archHeights?: number[];
}) => {
  const PIPE_R = 0.028;
  const BEND_R = 0.18;
  const SEG = 12;
  const greenMat = (
    <meshStandardMaterial color="#2D5A4A" metalness={0.4} roughness={0.6} />
  );
  const rustMat = (
    <meshStandardMaterial color="#6B3A2A" metalness={0.2} roughness={0.95} />
  );

  const archEls: any[] = [];
  const totalLength = (archCount - 1) * spacing;
  for (let i = 0; i < archCount; i++) {
    const offsetX = -totalLength / 2 + i * spacing;
    const h = archHeights[Math.min(i, archHeights.length - 1)];
    const halfW = archWidth / 2;
    const legH = h - BEND_R;
    archEls.push(
      <group key={`arch-${i}`} position={[offsetX, 0, 0]}>
        {/* Левая нога */}
        <mesh position={[0, legH / 2, -halfW]} castShadow>
          <cylinderGeometry args={[PIPE_R, PIPE_R, legH, SEG]} />
          {greenMat}
        </mesh>
        {/* Правая нога */}
        <mesh position={[0, legH / 2, halfW]} castShadow>
          <cylinderGeometry args={[PIPE_R, PIPE_R, legH, SEG]} />
          {greenMat}
        </mesh>
        {/* Ржавчина у оснований */}
        <mesh position={[0, 0.08, -halfW]}>
          <cylinderGeometry args={[PIPE_R * 1.2, PIPE_R * 1.2, 0.16, SEG]} />
          {rustMat}
        </mesh>
        <mesh position={[0, 0.08, halfW]}>
          <cylinderGeometry args={[PIPE_R * 1.2, PIPE_R * 1.2, 0.16, SEG]} />
          {rustMat}
        </mesh>
        {/* Левый верхний скруглённый угол */}
        <mesh
          position={[0, h - BEND_R, -halfW + BEND_R]}
          rotation={[Math.PI, 0, 0]}
          castShadow
        >
          <torusGeometry args={[BEND_R, PIPE_R, 8, 16, Math.PI / 2]} />
          {greenMat}
        </mesh>
        {/* Правый верхний скруглённый угол */}
        <mesh
          position={[0, h - BEND_R, halfW - BEND_R]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <torusGeometry args={[BEND_R, PIPE_R, 8, 16, Math.PI / 2]} />
          {greenMat}
        </mesh>
        {/* Верхняя горизонталь (по оси Z) */}
        <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[PIPE_R, PIPE_R, archWidth - 2 * BEND_R, SEG]} />
          {greenMat}
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {archEls}
      {/* Нижние горизонтали по краям арок */}
      {[-archWidth / 2 + 0.05, archWidth / 2 - 0.05].map((zOff, j) => (
        <mesh
          key={`tie-${j}`}
          position={[0, 0.4, zOff]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[PIPE_R, PIPE_R, totalLength + 0.4, SEG]} />
          {greenMat}
        </mesh>
      ))}
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  BOLLARD LINE
// ──────────────────────────────────────────────────────────────────
type BollardLineProps = {
  start: [number, number];
  end: [number, number];
  y: number;
  axis: 'x' | 'z';
  blockCount: number;
};

export const BollardLine: React.FC<BollardLineProps> = ({
  start,
  end,
  y,
  axis,
  blockCount,
}) => {
  const tex = getProceduralTextures();
  const blocks: any[] = [];
  const blockLen = 2.0, blockH = 0.85;
  const widthBottom = 0.85, widthTop = 0.55;
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];

  for (let i = 0; i < blockCount; i++) {
    const t = (i + 0.5) / blockCount;
    const cx = start[0] + dx * t;
    const cz = start[1] + dz * t;
    const baseArgs: [number, number, number] = axis === 'x'
      ? [blockLen, blockH * 0.45, widthBottom]
      : [widthBottom, blockH * 0.45, blockLen];
    const topArgs: [number, number, number] = axis === 'x'
      ? [blockLen, blockH * 0.55, widthTop]
      : [widthTop, blockH * 0.55, blockLen];
    blocks.push(
      <mesh key={`bol-bot-${i}`} position={[cx, y + blockH * 0.225, cz]} castShadow receiveShadow>
        <boxGeometry args={baseArgs} />
        {tex ? (
          <meshStandardMaterial map={tex.blockStripeMap} roughness={0.92} />
        ) : (
          <meshStandardMaterial color="#9C9994" roughness={0.92} />
        )}
      </mesh>
    );
    blocks.push(
      <mesh key={`bol-top-${i}`} position={[cx, y + blockH * 0.45 + blockH * 0.275, cz]} castShadow receiveShadow>
        <boxGeometry args={topArgs} />
        {tex ? (
          <meshStandardMaterial map={tex.blockStripeMap} roughness={0.92} />
        ) : (
          <meshStandardMaterial color="#9C9994" roughness={0.92} />
        )}
      </mesh>
    );
  }
  return <group>{blocks}</group>;
};

// ──────────────────────────────────────────────────────────────────
//  WORKOUT AREA
// ──────────────────────────────────────────────────────────────────
const WORKOUT_PIPE_R = 0.045;
const WORKOUT_SEG = 12;

export const VerticalPost = ({ x, z, h, hw }: { x: number; z: number; h: number; hw: number }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, h / 2, 0]} castShadow>
      <cylinderGeometry args={[WORKOUT_PIPE_R, WORKOUT_PIPE_R, h, WORKOUT_SEG]} />
      <meshStandardMaterial color="#2D6FB8" metalness={0.5} roughness={0.55} />
    </mesh>
    <mesh position={[0, 0.08, 0]}>
      <boxGeometry args={[0.3, 0.16, 0.3]} />
      <meshStandardMaterial color="#7A7470" roughness={0.95} />
    </mesh>
  </group>
);

export const StepRungs = ({ x, ys, ladderWidth }: { x: number; ys: number[]; ladderWidth: number }) => (
  <group>
    {ys.map((y) => (
      <mesh key={`step-${x}-${y}`} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[WORKOUT_PIPE_R * 0.7, WORKOUT_PIPE_R * 0.7, ladderWidth, WORKOUT_SEG]} />
        <meshStandardMaterial color="#2D6FB8" metalness={0.5} roughness={0.55} />
      </mesh>
    ))}
  </group>
);

export const MonkeyBar = ({ startX, endX, y, rungSpacing, ladderWidth, hw }: { startX: number; endX: number; y: number; rungSpacing: number; ladderWidth: number; hw: number }) => {
  const len = endX - startX;
  const midX = startX + len / 2;
  const steps = [];
  for (let rx = startX + rungSpacing; rx < endX - 0.1; rx += rungSpacing) {
    steps.push(
      <mesh key={`mb-${rx}`} position={[rx, y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[WORKOUT_PIPE_R * 0.7, WORKOUT_PIPE_R * 0.7, ladderWidth, WORKOUT_SEG]} />
        <meshStandardMaterial color="#2D6FB8" metalness={0.5} roughness={0.55} />
      </mesh>
    );
  }
  return (
    <group>
      <mesh position={[midX, y, -hw]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[WORKOUT_PIPE_R * 0.85, WORKOUT_PIPE_R * 0.85, len, WORKOUT_SEG]} />
        <meshStandardMaterial color="#2D6FB8" metalness={0.5} roughness={0.55} />
      </mesh>
      <mesh position={[midX, y, hw]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[WORKOUT_PIPE_R * 0.85, WORKOUT_PIPE_R * 0.85, len, WORKOUT_SEG]} />
        <meshStandardMaterial color="#2D6FB8" metalness={0.5} roughness={0.55} />
      </mesh>
      {steps}
    </group>
  );
};

export const SwedishWall = ({ x, z, rungSpacing, hw, ladderWidth, rotationY = 0 }: { x: number; z: number; rungSpacing: number; hw: number; ladderWidth: number; rotationY?: number }) => {
  const wallH = 2.8;
  const ys = [];
  for (let y = 0.4; y < wallH - 0.1; y += rungSpacing) ys.push(y);
  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <VerticalPost x={0} z={-hw} h={wallH} hw={hw} />
      <VerticalPost x={0} z={hw} h={wallH} hw={hw} />
      <StepRungs x={0} ys={ys} ladderWidth={ladderWidth} />
    </group>
  );
};

export const WorkoutArea = ({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) => {
  const w1 = 3.0;
  const w2 = 3.0;
  const ladderWidth = 0.8;
  const h1 = 2.2;
  const h2 = 2.6;
  const postH1 = 2.4;
  const postH2 = 2.8;
  const rungSpacing = 0.4;
  const hw = ladderWidth / 2;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group position={[3.0, 0, 0]} rotation={[0, Math.PI, 0]}>
        <group position={[-3.0, 0, 0]}>
          <VerticalPost x={0} z={-hw} h={postH1} hw={hw} />
          <VerticalPost x={0} z={hw} h={postH1} hw={hw} />
          <StepRungs x={0} ys={[0.4, 0.8, 1.2]} ladderWidth={ladderWidth} />

          <VerticalPost x={w1} z={-hw} h={postH2} hw={hw} />
          <VerticalPost x={w1} z={hw} h={postH2} hw={hw} />

          <VerticalPost x={w1 + w2} z={-hw} h={postH2} hw={hw} />
          <VerticalPost x={w1 + w2} z={hw} h={postH2} hw={hw} />
          <StepRungs x={w1 + w2} ys={[0.4, 0.8, 1.2]} ladderWidth={ladderWidth} />

          <MonkeyBar startX={0} endX={w1} y={h1} rungSpacing={rungSpacing} ladderWidth={ladderWidth} hw={hw} />
          <MonkeyBar startX={w1} endX={w1 + w2} y={h2} rungSpacing={rungSpacing} ladderWidth={ladderWidth} hw={hw} />
        </group>
      </group>

      <SwedishWall x={-1.0} z={0} rungSpacing={rungSpacing} hw={hw} ladderWidth={ladderWidth} rotationY={-Math.PI / 2} />
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  ADDRESS SIGN
// ──────────────────────────────────────────────────────────────────
export const AddressSign = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.7, 0.04]} />
        <meshStandardMaterial color="#5ba4e5" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.31, 0.022]}>
        <boxGeometry args={[0.5, 0.04, 0.005]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, -0.31, 0.022]}>
        <boxGeometry args={[0.5, 0.04, 0.005]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Text
        position={[0, 0.13, 0.025]}
        fontSize={0.22}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        23А
      </Text>
      <Text
        position={[0, -0.13, 0.025]}
        fontSize={0.06}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.45}
        textAlign="center"
      >
        проезд Молодёжный
      </Text>
    </group>
  );
};