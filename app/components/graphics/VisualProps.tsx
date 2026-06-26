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

const WORKOUT_PIPE_R = 0.045;
const WORKOUT_SEG = 12;

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