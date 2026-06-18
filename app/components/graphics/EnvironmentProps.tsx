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

// ──────────────────────────────────────────────────────────────────
//  1️⃣ SUBARCTIC VEGETATION (Stunted Larch & Windswept Dwarf Birch)
// ──────────────────────────────────────────────────────────────────
export const DynamicTree = ({
  position,
  scale = 1.0,
  variant = 0, // 0: Stunted Siberian Larch (Лиственница), 1: Windswept Dwarf Birch (Карликовая береза)
  perfTier = "high",
}: {
  position: [number, number, number];
  scale?: number;
  variant?: number;
  perfTier?: "low" | "medium" | "high";
}) => {
  const { snow, rain } = useWeather();
  const treeGroupRef = useRef<THREE.Group>(null);
  const foliageGroupRef = useRef<THREE.Group>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [rustleActive, setRustleActive] = useState(false);
  const rustleTimeRef = useRef(0);

  const [sprayingSnow, setSprayingSnow] = useState(0);
  useEffect(() => {
    setSprayingSnow(snow);
  }, [snow]);

  const handleTreeClick = (e: any) => {
    e.stopPropagation();
    setRustleActive(true);
    rustleTimeRef.current = 0;
  };

  useFrame((state, delta) => {
    if (Math.abs(sprayingSnow - snow) > 0.01) {
      setSprayingSnow(THREE.MathUtils.lerp(sprayingSnow, snow, delta * 2.0));
    }

    // High northern winds (frequent storms in Norilsk!)
    const windSpeed = 1.8 + rain * 3.5 + snow * 2.5;
    const timeSpeed = state.clock.getElapsedTime() * windSpeed;
    const positionOffset = position[0] * 0.18 + position[2] * 0.25;

    // Larches sway slightly more rigidly; dwarf birches are highly flexible in subarctic air currents
    const flexFactor = variant === 0 ? 0.015 : 0.035;
    let baseSwayAngleX = Math.sin(timeSpeed + positionOffset) * flexFactor * scale;
    let baseSwayAngleZ = Math.cos(timeSpeed * 1.1 + positionOffset) * (flexFactor * 0.8) * scale;

    if (rustleActive) {
      rustleTimeRef.current += delta;
      const decay = Math.max(0, 1.5 - rustleTimeRef.current);
      baseSwayAngleX += Math.sin(rustleTimeRef.current * 36.0) * 0.09 * decay;
      baseSwayAngleZ += Math.cos(rustleTimeRef.current * 30.0) * 0.07 * decay;

      if (rustleTimeRef.current > 1.5) {
        setRustleActive(false);
      }
    }

    if (foliageGroupRef.current) {
      foliageGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        foliageGroupRef.current.rotation.x,
        baseSwayAngleX,
        delta * 6.5
      );
      foliageGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        foliageGroupRef.current.rotation.z,
        baseSwayAngleZ,
        delta * 6.5
      );
    }
  });

  // Authentic tundra foliage coloring: desaturated conifer needle green vs light-yellow windswept dwarf autumn birch
  const leafColor = variant === 0 ? "#1b2c15" : "#857a2f"; // Siberian dark sage conifer vs subarctic tundra gold
  const trunkColor = variant === 0 ? "#2d1b11" : "#d1d5db"; // charcoal-pine bark vs typical northern white birch stripes

  const radialSegments = perfTier === "low" ? 4 : perfTier === "medium" ? 5 : 6;
  const sphereResolution = perfTier === "low" ? 0 : 1;

  return (
    <group
      ref={treeGroupRef}
      position={position}
      scale={[scale, scale, scale]}
      onClick={handleTreeClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
      }}
      onPointerOut={() => setIsHovered(false)}
    >
      {/* RUSTLE SHOWER */}
      {perfTier !== "low" && (
        <FallingLeavesShower
          active={rustleActive}
          isSnowy={snow > 0.15}
          foliageColor={leafColor}
        />
      )}

      {/* STUNTED CROOKED TRUNK */}
      <group rotation={[0.05 * (position[2] % 3), 0, -0.04 * (position[0] % 4)]}>
        <mesh castShadow receiveShadow position={[0, 0.8 * scale, 0]}>
          <cylinderGeometry args={[0.07, 0.16, 1.6 * scale, radialSegments]} />
          <meshStandardMaterial
            color={isHovered ? "#525252" : trunkColor}
            roughness={0.95}
            metalness={0.02}
          />
        </mesh>
      </group>

      {/* WIND-RESISTANT SPARSE FOLIAGE GROUP */}
      <group ref={foliageGroupRef} position={[0, 1.2 * scale, 0]}>
        {variant === 0 ? (
          // 🌲 Stunted Siberian Larch (sparse, step-by-step tiered needles)
          <group>
            {/* Lower branch disc */}
            <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
              <coneGeometry args={[0.9, 0.7, radialSegments]} />
              <meshStandardMaterial color={leafColor} roughness={0.88} />
            </mesh>
            {/* Middle sparse needle disc */}
            <mesh castShadow receiveShadow position={[0, 0.7, 0]}>
              <coneGeometry args={[0.65, 0.6, radialSegments]} />
              <meshStandardMaterial color={leafColor} roughness={0.9} />
            </mesh>
            {/* Top jagged cone */}
            <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
              <coneGeometry args={[0.4, 0.5, radialSegments]} />
              <meshStandardMaterial color={leafColor} roughness={0.92} />
            </mesh>
            {/* Ice/Snow heap overlay on branches */}
            {sprayingSnow > 0.05 && (
              <mesh position={[0, 1.2, 0]} scale={[1.05, 1.05, 1.05]}>
                <coneGeometry args={[0.4, 0.2, radialSegments, 1, true]} />
                <meshStandardMaterial color="#ffffff" roughness={0.95} transparent opacity={sprayingSnow} />
              </mesh>
            )}
          </group>
        ) : (
          // 🌳 Windswept Polar Dwarf Birch (crooked, small scattered shrub leaves)
          <group position={[0.1, 0.4, 0]}>
            {/* Stunted asymmetrical crown */}
            <mesh castShadow receiveShadow position={[0, 0.1, 0]} scale={[0.85, 0.7, 0.85]}>
              <icosahedronGeometry args={[0.7, sphereResolution]} />
              <meshStandardMaterial color={leafColor} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[-0.25, -0.15, 0.2]} scale={0.4}>
              <icosahedronGeometry args={[0.6, sphereResolution]} />
              <meshStandardMaterial color={leafColor} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0.2, -0.2, -0.2]} scale={0.45}>
              <icosahedronGeometry args={[0.6, sphereResolution]} />
              <meshStandardMaterial color={leafColor} roughness={0.9} />
            </mesh>
            {/* Frozen snow dusting */}
            {sprayingSnow > 0.05 && (
              <mesh position={[0, 0.22, 0]} scale={[0.9, 0.5, 0.9]}>
                <icosahedronGeometry args={[0.7, sphereResolution]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.98} transparent opacity={sprayingSnow * 0.95} />
              </mesh>
            )}
          </group>
        )}
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  2️⃣ ARCTIC STREET LIGHTING (Weather-Beaten Concrete & Steel)
// ──────────────────────────────────────────────────────────────────
export const StreetLantern = ({
  position,
  rotationY = 0,
  perfTier = "high",
}: {
  position: [number, number, number];
  rotationY?: number;
  perfTier?: "low" | "medium" | "high";
}) => {
  const { isNight, cloudCover } = useWeather();
  const [hovered, setHovered] = useState(false);
  const [manualOverride, setManualOverride] = useState<boolean | null>(null);

  const autoLightOn = isNight || cloudCover > 80;
  const isLightOn = manualOverride !== null ? manualOverride : autoLightOn;

  const handleLanternClick = (e: any) => {
    e.stopPropagation();
    setManualOverride(!isLightOn);
  };

  const [flickerIntensity, setFlickerIntensity] = useState(1.0);
  useFrame((state) => {
    if (isLightOn) {
      if (cloudCover > 85 && Math.random() < 0.08) {
        // Dramatic polar blizzard atmospheric line noise
        setFlickerIntensity(0.7 + Math.random() * 0.45);
      } else {
        setFlickerIntensity(0.96 + Math.sin(state.clock.getElapsedTime() * 12.0) * 0.04);
      }
    }
  });

  // Weather-beaten peeling grey industrial paint typical of Norilsk housing block lighting
  const baseMetalColor = hovered ? "#475569" : "#334155";
  const lightColorHex = "#ffdf80"; // warm amber to cut through fog & heavy blizzards

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={handleLanternClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Heavy Concrete Base Blocks (withstands strong Siberian wind and permafrost swelling) */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.5]} />
        <meshStandardMaterial color="#505050" roughness={0.9} />
      </mesh>

      {/* Industrial metal pole */}
      <mesh castShadow position={[0, 3.1, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 5.0, 6]} />
        <meshStandardMaterial color={baseMetalColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Angled utility lamp bracket */}
      <mesh castShadow position={[0.25, 5.5, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 5]} />
        <meshStandardMaterial color={baseMetalColor} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Protective metal hood cover */}
      <mesh castShadow position={[0.45, 5.25, 0]}>
        <boxGeometry args={[0.3, 0.15, 0.22]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
      </mesh>

      {/* Amber Light Core */}
      <mesh position={[0.45, 5.16, 0]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial
          color={isLightOn ? lightColorHex : "#4a4a4a"}
          transparent
          opacity={isLightOn ? 1.0 : 0.6}
        />
      </mesh>

      {/* COLD VOLUMETRIC ICE MIST CONE */}
      {isLightOn && perfTier !== "low" && (
        <mesh position={[0.45, 2.5, 0]}>
          <coneGeometry args={[1.5, 5.0, 10, 1, true]} />
          <meshBasicMaterial
            color={lightColorHex}
            transparent
            opacity={0.08 * flickerIntensity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* CORE INTENSIVITY NODE */}
      {isLightOn && (
        <pointLight
          position={[0.45, 4.9, 0]}
          color={lightColorHex}
          intensity={5.5 * flickerIntensity}
          distance={14}
          decay={1.8}
          castShadow={perfTier === "high"}
          shadow-bias={-0.003}
          shadow-mapSize={[512, 512]}
        />
      )}

      {/* Light glow reflection on concrete floor */}
      {isLightOn && (
        <mesh position={[0.45, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 2.4]} />
          <meshBasicMaterial color={lightColorHex} transparent opacity={0.14 * flickerIntensity} />
        </mesh>
      )}
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  3️⃣ RUGGED STEEL AND CHIPPED WOOD BENCH (With Northern Guest!)
// ──────────────────────────────────────────────────────────────────
export const CourtyardBench = ({
  position,
  rotationY = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
}) => {
  const [hovered, setHovered] = useState(false);
  const [guestOnBench, setGuestOnBench] = useState(false);

  const handleBenchClick = (e: any) => {
    e.stopPropagation();
    setGuestOnBench((prev) => !prev);
  };

  const legMaterial = hovered ? "#5c5c5c" : "#404040";

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={handleBenchClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      // Typo prevention from instructions: define hovered variable cleanly
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Heavy iron channel supports (rigidly built to prevent frost heave bending) */}
      <mesh castShadow position={[-0.8, 0.22, 0]}>
        <boxGeometry args={[0.12, 0.44, 0.5]} />
        <meshStandardMaterial color={legMaterial} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.8, 0.22, 0]}>
        <boxGeometry args={[0.12, 0.44, 0.5]} />
        <meshStandardMaterial color={legMaterial} roughness={0.8} />
      </mesh>

      {/* Rough planks painted weathered green-blue typical of Norilsk courtyards */}
      <mesh castShadow position={[0, 0.45, 0.1]}>
        <boxGeometry args={[1.8, 0.05, 0.15]} />
        <meshStandardMaterial color="#0b5a5e" roughness={0.85} /> {/* weathered teal */}
      </mesh>
      <mesh castShadow position={[0, 0.45, -0.1]}>
        <boxGeometry args={[1.8, 0.05, 0.15]} />
        <meshStandardMaterial color="#0b5a5e" roughness={0.85} />
      </mesh>

      {/* Backrest brackets */}
      <mesh castShadow position={[-0.75, 0.65, -0.22]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.05, 0.45, 0.05]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0.75, 0.65, -0.22]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.05, 0.45, 0.05]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>

      {/* Backrest teal plank */}
      <mesh castShadow position={[0, 0.8, -0.24]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[1.8, 0.14, 0.04]} />
        <meshStandardMaterial color="#0b5a5e" roughness={0.85} />
      </mesh>

      {/* 🐶 SLEEPING NORTHERN WHITE SAMOYED DOG / CAT FLIP-STATE */}
      {guestOnBench && (
        <group position={[0.1, 0.48, 0.0]} rotation={[0, -Math.PI / 6, 0]}>
          {/* Curved white fluffy body */}
          <mesh castShadow position={[0, 0.07, 0]}>
            <boxGeometry args={[0.3, 0.15, 0.2]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.95} />
          </mesh>
          {/* Floppy Head with ears */}
          <mesh castShadow position={[0.18, 0.14, 0]}>
            <sphereGeometry args={[0.09, 5, 5]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
          </mesh>
          {/* Little black nose mesh */}
          <mesh position={[0.26, 0.12, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.02]} />
            <meshBasicMaterial color="#111" />
          </mesh>
          {/* Dense furry tail wrapped around */}
          <mesh position={[-0.14, 0.06, 0.05]} rotation={[0, 0.4, 0]}>
            <boxGeometry args={[0.16, 0.04, 0.05]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  4️⃣ STRONG TUBULAR STEEL FENCES (Weather-Protected Barriers)
// ──────────────────────────────────────────────────────────────────
export const CompoundFence = ({
  startPos,
  endPos,
  polesCount = 6,
}: {
  startPos: [number, number];
  endPos: [number, number];
  polesCount?: number;
}) => {
  const poles = useMemo(() => {
    const list = [];
    const dx = endPos[0] - startPos[0];
    const dz = endPos[1] - startPos[1];
    
    for (let i = 0; i < polesCount; i++) {
      const t = i / (polesCount - 1);
      const x = startPos[0] + dx * t;
      const z = startPos[1] + dz * t;
      list.push({ x, z });
    }
    return list;
  }, [startPos, endPos, polesCount]);

  const dx = endPos[0] - startPos[0];
  const dz = endPos[1] - startPos[1];
  const length = Math.sqrt(dx * dx + dz * dz);
  const midX = (startPos[0] + endPos[0]) / 2;
  const midZ = (startPos[1] + endPos[1]) / 2;
  const angle = Math.atan2(dx, dz);

  return (
    <group>
      {/* Heavily industrial vertical tubular poles */}
      {poles.map((p, idx) => (
        <group key={`fence-p-${idx}`} position={[p.x, 0, p.z]}>
          <mesh castShadow position={[0, 0.8, 0]}>
            <cylinderGeometry args={[0.05, 0.06, 1.6, 5]} />
            <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.6} />
          </mesh>
          {/* Post cap covers to prevent rain freezing inside */}
          <mesh position={[0, 1.62, 0]}>
            <boxGeometry args={[0.12, 0.04, 0.12]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Double horizontal reinforcement pipes */}
      <mesh
        castShadow
        position={[midX, 1.2, midZ]}
        rotation={[0, angle + Math.PI / 2, 0]}
      >
        <cylinderGeometry args={[0.02, 0.02, length]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh
        castShadow
        position={[midX, 0.4, midZ]}
        rotation={[0, angle + Math.PI / 2, 0]}
      >
        <cylinderGeometry args={[0.02, 0.02, length]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  5️⃣ REALISTIC ARCTIC URBAN LANDSCAPE (Clean Asphalt Yard)
// ──────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────
//  6️⃣ DYNAMIC COAL CRY / SEAGULL FLOCK (Northern Birds)
// ──────────────────────────────────────────────────────────────────
export const DynamicBirdsFlock = ({
  center = [0, 16, 22],
  count = 5,
  perfTier = "high",
}: {
  center?: [number, number, number];
  count?: number;
  perfTier?: "low" | "medium" | "high";
}) => {
  const { rain, snow } = useWeather();
  const birdsGroupRef = useRef<THREE.Group>(null);
  
  // Severe northern storms suppress all flying wildlife
  const isStorming = rain > 0.35 || snow > 0.5;

  const positions = useMemo(() => {
    const list: Array<{ radius: number; speed: number; heightVal: number; offset: number }> = [];
    for (let i = 0; i < count; i++) {
      list.push({
        radius: 9.0 + Math.random() * 6.0,
        speed: 0.6 + Math.random() * 0.4, // heavy winds force slower flight speeds
        heightVal: (Math.random() - 0.5) * 3.0,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return list;
  }, [count]);

  const birdMeshesRef = useRef<Array<THREE.Group | null>>([]);

  useFrame((state) => {
    if (isStorming || perfTier === "low") return;

    const time = state.clock.getElapsedTime();

    positions.forEach((b, idx) => {
      const mesh = birdMeshesRef.current[idx];
      if (mesh) {
        const theta = time * b.speed + b.offset;
        const x = center[0] + Math.sin(theta) * b.radius;
        const z = center[2] + Math.cos(theta) * b.radius;
        const y = center[1] + b.heightVal + Math.sin(time * 1.5 + b.offset) * 0.5;

        mesh.position.set(x, y, z);
        mesh.rotation.y = theta + Math.PI / 2;

        const leftWing = mesh.children[1] as THREE.Mesh;
        const rightWing = mesh.children[2] as THREE.Mesh;
        if (leftWing && rightWing) {
          const flap = Math.cos(time * 9.0 + b.offset * 2.5) * 0.55;
          leftWing.rotation.z = flap;
          rightWing.rotation.z = -flap;
        }
      }
    });
  });

  if (isStorming || perfTier === "low") return null;

  return (
    <group ref={birdsGroupRef}>
      {positions.map((_, idx) => (
        <group
          key={idx}
          ref={(el: THREE.Group | null) => {
            birdMeshesRef.current[idx] = el;
          }}
        >
          {/* Grey Hooded Crow / Polar Seagull (Черный ворон или полярная чайка) */}
          <mesh castShadow>
            <boxGeometry args={[0.07, 0.05, 0.28]} />
            <meshStandardMaterial color="#475569" roughness={0.7} /> {/* slate-gray core */}
          </mesh>
          <mesh position={[-0.14, 0, 0]}>
            <boxGeometry args={[0.24, 0.015, 0.07]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          <mesh position={[0.14, 0, 0]}>
            <boxGeometry args={[0.24, 0.015, 0.07]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  7️⃣ 🌟 MASTER INDUSTRIAL EXTRA: ABOVE-GROUND HEATING PIPELINES
// ──────────────────────────────────────────────────────────────────
// Complete above-ground pipelines (Теплотрассы) - Norilsk's absolute visual hallmark!
export const NorilskHeatingPipeline = () => {
  const { snow } = useWeather();
  const [fadedSnow, setFadedSnow] = useState(0);

  useEffect(() => {
    setFadedSnow(snow);
  }, [snow]);

  useFrame((state, delta) => {
    if (Math.abs(fadedSnow - snow) > 0.01) {
      setFadedSnow(THREE.MathUtils.lerp(fadedSnow, snow, delta * 2.0));
    }
  });

  // Structural coordinate supports grid placements for the pipelines
  const supports = useMemo(() => {
    return [
      { x: -40, z: -32 },
      { x: -24, z: -32 },
      { x: -8, z: -32 },
      { x: 8, z: -32 },
      { x: 24, z: -32 },
      { x: 40, z: -33 },
    ];
  }, []);

  return (
    <group>
      {/* Support Columns with heavy concrete footings */}
      {supports.map((s, idx) => (
        <group key={`pipeline-support-${idx}`} position={[s.x, 0, s.z]}>
          {/* Concrete pedestal */}
          <mesh castShadow position={[0, 0.3, 0]}>
            <boxGeometry args={[0.8, 0.6, 1.2]} />
            <meshStandardMaterial color="#4b5563" roughness={0.9} />
          </mesh>
          {/* Dual steel columns */}
          <mesh castShadow position={[-0.25, 1.1, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 1.2, 5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0.25, 1.1, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 1.2, 5]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.4} />
          </mesh>
          {/* Solid cross-beam carrying pipes */}
          <mesh castShadow position={[0, 1.6, 0]}>
            <boxGeometry args={[1.0, 0.1, 1.1]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* THE TWO GIANT DOUBLE INSULATED METALLIC PIPELINES (Диаметр трубы ~35см с изоляцией) */}
      <group position={[0, 1.95, -32.05]}>
        {/* Pipe 1: hot feed line with metallic sheathing */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 91.0, 8]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Snowy cap sheet on Pipe 1 */}
        {fadedSnow > 0.05 && (
          <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.03, 1.0, 1.0]}>
            <cylinderGeometry args={[0.24, 0.24, 91.0, 8, 1, true]} />
            <meshStandardMaterial color="#ffffff" roughness={0.95} transparent opacity={fadedSnow * 0.95} />
          </mesh>
        )}
      </group>

      <group position={[0, 1.95, -31.45]}>
        {/* Pipe 2: return line */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.24, 0.24, 91.0, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Snowy cap sheet on Pipe 2 */}
        {fadedSnow > 0.05 && (
          <mesh position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.03, 1.0, 1.0]}>
            <cylinderGeometry args={[0.24, 0.24, 91.0, 8, 1, true]} />
            <meshStandardMaterial color="#ffffff" roughness={0.95} transparent opacity={fadedSnow * 0.95} />
          </mesh>
        )}
      </group>

      {/* Industrial Valve Station (сбросные вентили на трубе для атмосферности) */}
      <group position={[12, 1.95, -31.45]}>
        {/* Connecting valve bracket block */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.5} /> {/* vibrant red control box */}
        </mesh>
        {/* Wheel wheel */}
        <mesh position={[0, 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.03, 4, 12]} />
          <meshStandardMaterial color="#ef4444" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  8️⃣ 🌟 MASTER GEOGRAPHIC EXTRA: THE TALNAKH BASALT MOUNTAINS
// ──────────────────────────────────────────────────────────────────
// Beautifully realistic flat-topped basalt mesas representing Krasnye Kamni / Putorana Plateau in background!
export const TalnakhBasaltMountains = () => {
  const { snow } = useWeather();
  const [fadedSnow, setFadedSnow] = useState(0);

  useEffect(() => {
    setFadedSnow(snow);
  }, [snow]);

  useFrame((state, delta) => {
    if (Math.abs(fadedSnow - snow) > 0.01) {
      setFadedSnow(THREE.MathUtils.lerp(fadedSnow, snow, delta * 1.5));
    }
  });

  return (
    <group position={[0, -2, -90]} scale={[1.8, 1.8, 1.8]}>
      {/* 🏔️ EAST RIDGE FLAT MESAS (Гора Хараелах) */}
      <group position={[32, 5, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[14, 18, 12, 5, 1, false]} />
          <meshStandardMaterial color="#302621" roughness={0.95} />
        </mesh>
        {/* Layered volcanic basalt trap lines (террасы) */}
        <mesh position={[0, 1, 0]} scale={[1.02, 0.1, 1.02]}>
          <cylinderGeometry args={[14, 15, 2, 5]} />
          <meshStandardMaterial color="#1a1412" roughness={0.99} />
        </mesh>
        {/* Snowy flat mesa top cover */}
        <mesh position={[0, 6.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[26, 26]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.98} transparent opacity={fadedSnow * 0.95 + 0.05} />
        </mesh>
      </group>

      {/* 🏔️ CENTRAL DIVIDING GORGE (Краснокаменное ущелье / Krasnye Kamni Basin) */}
      <group position={[-25, 4, -8]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[11, 15, 10, 4, 1, false]} />
          <meshStandardMaterial color="#2d221c" roughness={0.96} />
        </mesh>
        {/* Basalt terracing ring */}
        <mesh position={[0, 0.5, 0]} scale={[1.02, 0.08, 1.02]}>
          <cylinderGeometry args={[11, 12, 2, 4]} />
          <meshStandardMaterial color="#150f0c" roughness={0.98} />
        </mesh>
        {/* Snow covered mesa peaks */}
        <mesh position={[0, 5.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.98} transparent opacity={fadedSnow * 0.95 + 0.05} />
        </mesh>
      </group>

      {/* 🏔️ FAR DISTANT WESTERN PEAKS RIDGE */}
      <group position={[-65, 3, 5]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[16, 21, 9, 6]} />
          <meshStandardMaterial color="#3a322e" roughness={0.98} />
        </mesh>
        <mesh position={[0, 4.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#eceff1" roughness={0.95} transparent opacity={fadedSnow * 0.9 + 0.1} />
        </mesh>
      </group>
    </group>
  );
};

// ──────────────────────────────────────────────────────────────────
//  9️⃣ INTERACTIVE EXTRA: NORILSK MINING SHAFT TOWER (Копер рудника)
// ──────────────────────────────────────────────────────────────────
// The majestic headframe tower of Talnakh's "Oktyabrsky" copper-nickel mine! Visible on horizon.
export const MiningShaftTower = () => {
  const sheaveRef1 = useRef<THREE.Mesh>(null);
  const sheaveRef2 = useRef<THREE.Mesh>(null);

  // Rotate sheave pulley wheels (шкивы) to convey mining action!
  useFrame((state) => {
    const rotSpeed = state.clock.getElapsedTime() * 1.8;
    if (sheaveRef1.current) {
      sheaveRef1.current.rotation.z = rotSpeed;
    }
    if (sheaveRef2.current) {
      sheaveRef2.current.rotation.z = -rotSpeed * 0.8;
    }
  });

  return (
    <group position={[38, 0, -68]} scale={[1.4, 1.4, 1.4]} rotation={[0, -Math.PI / 4, 0]}>
      {/* Heavy industrial tower concrete foundation blocks */}
      <mesh castShadow position={[0, 1.0, 0]}>
        <boxGeometry args={[4.0, 2.0, 4.0]} />
        <meshStandardMaterial color="#475569" roughness={0.9} />
      </mesh>

      {/* Tower Main Shaft Frame (weather-proofed blue & red metal cladding panels) */}
      <mesh castShadow position={[0, 11.0, 0]}>
        <boxGeometry args={[3.0, 18.0, 3.0]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.65} metalness={0.6} /> {/* blue paneling */}
      </mesh>

      {/* Decorative colored visual safety stripes on the tower */}
      <mesh position={[0, 18.0, 0]} scale={[1.01, 1.0, 1.01]}>
        <boxGeometry args={[3.0, 1.5, 3.0]} />
        <meshStandardMaterial color="#dc2626" roughness={0.7} /> {/* warning red trim */}
      </mesh>

      {/* Top Deck housing station */}
      <mesh castShadow position={[0, 20.5, 0]}>
        <boxGeometry args={[3.6, 2.0, 3.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>

      {/* Spinning pully wheel brackets */}
      <mesh position={[-0.9, 21.8, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* ☸️ Spinning Sheave Pully Wheel 1 */}
      <mesh ref={sheaveRef1} position={[-0.9, 21.8, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.08, 12]} />
        <meshStandardMaterial color="#dc2626" metalness={0.9} roughness={0.1} />
      </mesh>

      <mesh position={[0.9, 21.8, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.6]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      {/* ☸️ Spinning Sheave Pully Wheel 2 */}
      <mesh ref={sheaveRef2} position={[0.9, 21.8, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.08, 12]} />
        <meshStandardMaterial color="#dc2626" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Giant steel angled gallows brace leg (Косые укосины копра) */}
      <mesh castShadow position={[-2.2, 9.0, 0]} rotation={[0, 0, Math.PI / 12]}>
        <boxGeometry args={[0.8, 19.0, 1.5]} />
        <meshStandardMaterial color="#111" metalness={0.7} roughness={0.5} />
      </mesh>
    </group>
  );
};
