"use client";

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface Shard {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Vector3;
  rotVel: THREE.Vector3;
  scale: THREE.Vector3; // Tiny debris size properties
  color: THREE.Color;
  life: number;
  decaySpeed: number; // Stored locally to avoid Math.random in frame loop
}

export const FloorSlice: React.FC<{
  activeFloor: number;
  floorIndex: number;
  children?: React.ReactNode;
}> = ({ activeFloor, floorIndex, children }) => {
  const isVisible = activeFloor >= floorIndex + 1;
  const groupRef = useRef<THREE.Group>(null);
  
  // EXTREMELY optimized: exactly 20 small shards to avoid any CPU/GPU bottleneck
  const SHARD_COUNT = 20; 
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const shardsRef = useRef<Shard[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const prevIsVisibleRef = useRef(isVisible);

  // Trigger high-velocity wall disintegration with mini debris fragments
  const triggerWallShatter = () => {
    const newShards: Shard[] = [];
    
    for (let i = 0; i < SHARD_COUNT; i++) {
      // Map out starting positions matching the building footprint
      const angle = (i / SHARD_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radiusX = 6 + Math.random() * 10;
      const radiusZ = 3 + Math.random() * 6;
      
      const px = Math.cos(angle) * radiusX;
      // Distributed nicely vertically within the floor boundary
      const py = (Math.random() - 0.5) * 2.0; 
      const pz = Math.sin(angle) * radiusZ;
      
      // Fast explosive outward direction
      const dir = new THREE.Vector3(px, py * 0.1, pz).normalize();
      dir.x += (Math.random() - 0.5) * 0.35;
      dir.z += (Math.random() - 0.5) * 0.35;
      dir.normalize();

      // Increased velocity for a snappy, spectacular explosive puff
      const speed = 42 + Math.random() * 38; 
      const vel = dir.multiplyScalar(speed);
      vel.y = 8 + Math.random() * 15; // Fast upward and outward toss

      // Cute, petite stone & brick chunk proportions
      const shapeRoll = Math.random();
      const scaleVec = new THREE.Vector3(1, 1, 1);
      if (shapeRoll < 0.4) {
        // Small brick-like chip
        scaleVec.set(0.24 + Math.random() * 0.18, 0.12 + Math.random() * 0.1, 0.16 + Math.random() * 0.12);
      } else if (shapeRoll < 0.8) {
        // Flat concrete flake
        scaleVec.set(0.16 + Math.random() * 0.12, 0.24 + Math.random() * 0.18, 0.16 + Math.random() * 0.12);
      } else {
        // Petite cubic stone aggregate
        scaleVec.set(0.18 + Math.random() * 0.14, 0.18 + Math.random() * 0.14, 0.18 + Math.random() * 0.14);
      }

      // Elegant architectural colors matching the Norilsk Poly model
      const colorRoll = Math.random();
      const col = new THREE.Color();
      if (colorRoll < 0.45) {
        // Red Terracotta Brick
        col.setHSL(0.04 + Math.random() * 0.02, 0.78, 0.44 + Math.random() * 0.14);
      } else if (colorRoll < 0.8) {
        // Slate Concrete Gray
        const gray = 0.55 + Math.random() * 0.25;
        col.setRGB(gray, gray, gray);
      } else {
        // Plaster & Limestone cream white
        const cream = 0.9 + Math.random() * 0.1;
        col.setRGB(cream, cream * 0.84, cream * 0.7);
      }

      // Quick snappy decay: expires cleanly in ~0.22 - 0.36 seconds
      const decaySpeed = 2.8 + Math.random() * 1.8;

      newShards.push({
        pos: new THREE.Vector3(px, py, pz),
        vel,
        rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 24
        ),
        scale: scaleVec,
        color: col,
        life: 1.0,
        decaySpeed
      });
    }

    shardsRef.current = newShards;
  };

  useEffect(() => {
    if (prevIsVisibleRef.current !== isVisible) {
      prevIsVisibleRef.current = isVisible;
      
      const g = groupRef.current;
      if (!g) return;

      if (isVisible) {
        // --- ASSEMBLY STATE ---
        // Slide perfectly from underneath
        g.position.y = -22;
        g.visible = true;
      } else {
        // --- SHATTER STATE ---
        triggerWallShatter();
      }
    }
  }, [isVisible]);

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;

    // Direct clamping protects physics from breaking or lag skipping during frames drops
    const dt = Math.min(delta, 0.03);

    if (isVisible) {
      // Smoothly slide the active floor up into its slot
      g.position.y = THREE.MathUtils.damp(g.position.y, 0, 7.5, dt);
      g.position.x = 0;
      g.position.z = 0;
      g.rotation.set(0, 0, 0);
      g.scale.set(1, 1, 1);
      g.visible = true;
    } else {
      // PERFORMANCE OPTIMIZATION: If we are not visible and all shards are dead,
      // completely de-register rendering and skip update frames!
      const shards = shardsRef.current;
      const isAnyShardActive = shards.some(s => s.life > 0);
      if (!isAnyShardActive) {
        g.visible = false;
        return; 
      }
    }

    // Update dynamic debris shards
    const shards = shardsRef.current;
    const sMesh = instancedMeshRef.current;
    
    if (sMesh) {
      let isAnyDebrisActive = false;

      for (let i = 0; i < SHARD_COUNT; i++) {
        const s = shards[i];
        if (s && s.life > 0) {
          // Ballistics: Gravity + fast air resistance
          s.vel.y -= 14 * dt; 
          s.vel.multiplyScalar(Math.pow(0.91, dt * 60)); 
          s.pos.addScaledVector(s.vel, dt);

          // Fast tumbling spin
          s.rot.addScaledVector(s.rotVel, dt);

          //Snappy decay
          s.life = Math.max(0, s.life - s.decaySpeed * dt);

          dummy.position.copy(s.pos);
          dummy.rotation.set(s.rot.x, s.rot.y, s.rot.z);

          // Shrink size to zero as life expires
          const dynamicScale = s.scale.clone().multiplyScalar(s.life);
          dummy.scale.copy(dynamicScale);
          dummy.updateMatrix();

          sMesh.setMatrixAt(i, dummy.matrix);
          sMesh.setColorAt(i, s.color);
          isAnyDebrisActive = true;
        } else {
          // Send out-of-bounds
          dummy.position.set(0, -999, 0);
          dummy.scale.set(0, 0, 0);
          dummy.updateMatrix();
          sMesh.setMatrixAt(i, dummy.matrix);
        }
      }

      sMesh.instanceMatrix.needsUpdate = true;
      if (sMesh.instanceColor) sMesh.instanceColor.needsUpdate = true;
      sMesh.visible = isAnyDebrisActive;
    }
  });

  return (
    <group ref={groupRef}>
      {/* 
        CRITICAL PERFORMANCE optimization:
        We toggle visibility of the actual rich floor model child meshes instantly.
        No physics are ever computed on complex scene models anymore!
      */}
      <group visible={isVisible}>
        {children}
      </group>
      
      {/* Super highly optimized single draw-call shards representation */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[null as any, null as any, SHARD_COUNT]}
      >
        <boxGeometry args={[1, 1, 1]} />
        {/* Simple material for ultimate zero-overhead drawing performance */}
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
};
