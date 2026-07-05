"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { weatherState } from "../data/weatherState";

// ──────────────────────────────────────────────────────────────────
//  HELPERS: WEATHER SUBSCRIPTION HOOK
// ──────────────────────────────────────────────────────────────────
function useWeather() {
  const [state, setState] = useState({
    isNight: false,
    rain: 0,
    snow: 0,
    cloudCover: 0,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (typeof weatherState !== "undefined") {
        const isNightInit = weatherState.isNight ?? false;
        const rainInit = weatherState.rain ?? 0;
        const snowInit = weatherState.snow ?? 0;
        const cloudCoverInit = rainInit > 0 ? 95 : snowInit > 0 ? 80 : 15;

        setState({
          isNight: isNightInit,
          rain: rainInit,
          snow: snowInit,
          cloudCover: cloudCoverInit,
        });

        unsubscribe = weatherState.subscribe((s) => {
          setState({
            isNight: s.isNight,
            rain: s.rain,
            snow: s.snow,
            cloudCover: s.rain > 0 ? 95 : s.snow > 0 ? 80 : 15,
          });
        });
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return state;
}

// ──────────────────────────────────────────────────────────────────
//  ✨ INTERACTIVE PARTICLES: COLD NORTHERN BLIZZARD / LEAF SHOWER
// ──────────────────────────────────────────────────────────────────
interface FallingParticle {
  id: number;
  position: [number, number, number];
  speed: number;
  rotation: [number, number, number];
  color: string;
  size: number;
}

const FallingLeavesShower = ({
  active,
  isSnowy,
  foliageColor,
}: {
  active: boolean;
  isSnowy: boolean;
  foliageColor: string;
}) => {
  const [particles, setParticles] = useState<FallingParticle[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (active) {
      const list: FallingParticle[] = [];
      const particleCount = 10;
      for (let i = 0; i < particleCount; i++) {
        list.push({
          id: nextId.current++,
          position: [
            (Math.random() - 0.5) * 1.5,
            1.8 + Math.random() * 0.7,
            (Math.random() - 0.5) * 1.5,
          ],
          speed: 1.0 + Math.random() * 1.8,
          rotation: [
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI,
          ],
          color: isSnowy ? "#e2e8f0" : foliageColor,
          size: isSnowy ? 0.07 : 0.06 + Math.random() * 0.08,
        });
      }
      setParticles(list);
    }
  }, [active, isSnowy, foliageColor]);

  useFrame((state, delta) => {
    if (particles.length === 0) return;

    setParticles((prev) => {
      const remaining = prev
        .map((p) => {
          const nextY = p.position[1] - p.speed * delta;
          const nextX = p.position[0] + Math.sin(state.clock.getElapsedTime() * 5.0 + p.id) * 0.3 * delta;
          return {
            ...p,
            position: [nextX, nextY, p.position[2]] as [number, number, number],
            rotation: [
              p.rotation[0] + delta * 2,
              p.rotation[1] + delta * 1.5,
              p.rotation[2],
            ] as [number, number, number],
          };
        })
        .filter((p) => p.position[1] > -0.1);

      return remaining;
    });
  });

  return (
    <group>
      {particles.map((p) => (
        <mesh key={p.id} position={p.position} rotation={p.rotation}>
          {isSnowy ? (
            <sphereGeometry args={[p.size, 4, 4]} />
          ) : (
            <tetrahedronGeometry args={[p.size, 0]} />
          )}
          <meshStandardMaterial
            color={p.color}
            roughness={0.8}
            metalness={0.1}
            emissive={isSnowy ? "#f1f5f9" : "#000000"}
            emissiveIntensity={isSnowy ? 0.2 : 0}
          />
        </mesh>
      ))}
    </group>
  );
};

export const CompoundLandscape = () => {
  const { snow, rain } = useWeather();
  const [fadedSnow, setFadedSnow] = useState(0);

  useEffect(() => {
    setFadedSnow(snow);
  }, [snow]);

  useFrame((state, delta) => {
    if (Math.abs(fadedSnow - snow) > 0.01) {
      setFadedSnow(THREE.MathUtils.lerp(fadedSnow, snow, delta * 2.2));
    }
  });

  // A pristine, clean, dark-slate gray urban asphalt/concrete yard
  const groundColor = useMemo(() => {
    const col = new THREE.Color("#4a4d52"); // Clean dark-slate gray asphalt
    if (rain > 0.05) {
      col.lerp(new THREE.Color("#1a1c1e"), rain * 0.8); // Saturated damp dark tarmac
    }
    if (fadedSnow > 0.05) {
      col.lerp(new THREE.Color("#eceff1"), fadedSnow * 0.99); // Snow sheet
    }
    return col;
  }, [rain, fadedSnow]);

  const groundRoughness = rain > 0.05 
    ? THREE.MathUtils.lerp(0.85, 0.15, rain * 0.9) 
    : 0.85;

  const groundMetalness = rain > 0.05 
    ? THREE.MathUtils.lerp(0.05, 0.45, rain * 0.7) 
    : 0.05;

  return (
    <group>
      {/* 🌑 MASTER SOLID INTEGRAL BASE LAYER (Seamless, neat dark asphalt pavement) */}
      <mesh receiveShadow position={[0, 0.001, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color={groundColor}
          roughness={groundRoughness}
          metalness={groundMetalness}
        />
      </mesh>
    </group>
  );
};
