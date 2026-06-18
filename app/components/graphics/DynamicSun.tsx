"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import SunCalc from "suncalc";
import { weatherState } from "../data/weatherState";

/* ------------------------------------------------------------------
   OvercastDome – A soft dome that fades in with increased cloudCover
   to simulate realistic overcast weather instead of constant blue sky.
   Uses a custom high-performance gradient shader with atmospheric
   value noise to mimic real-life cloudy/misty northern skies.
   ------------------------------------------------------------------ */
function OvercastDome({ cloudCover, isNight }: { cloudCover: number; isNight: boolean }) {
  const domeRef = useRef<THREE.Mesh>(null);
  
  // Fades in from 10% cloud cover to 75% cloud cover
  const factor = Math.min(1.0, Math.max(0.0, (cloudCover - 10) / 65));

  // Initialize shader uniforms WITHOUT isNight as a dependency.
  // This is CRITICAL: re-creating uniforms resets uOpacity immediately to 0.0,
  // which causes the entire sky to flash transparently for 1 frame.
  const uniforms = useMemo(() => {
    return {
      uColorHorizon: { value: new THREE.Color(isNight ? "#060912" : "#d8e2ed") }, 
      uColorZenith: { value: new THREE.Color(isNight ? "#020306" : "#6c7a8d") },  
      uOpacity: { value: 0.0 },
      uTime: { value: 0.0 }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Static memory allocation

  useFrame((state, delta) => {
    if (!domeRef.current) return;
    
    // Smoothly transition colors between day & night modes, preventing sudden jumps
    const targetHorizon = new THREE.Color(isNight ? "#04060b" : "#ccd6e2");
    const targetZenith = new THREE.Color(isNight ? "#010203" : "#5d6d82");
    const clampedDelta = Math.min(0.1, delta);
    
    uniforms.uColorHorizon.value.lerp(targetHorizon, clampedDelta * 2.5);
    uniforms.uColorZenith.value.lerp(targetZenith, clampedDelta * 2.5);
    uniforms.uOpacity.value = THREE.MathUtils.lerp(uniforms.uOpacity.value, factor * 0.98, clampedDelta * 2.5);
    uniforms.uTime.value = state.clock.getElapsedTime();
  });

  // Custom high-performance atmospheric gradient shader (memoized forever)
  const shader = useMemo(() => {
    return {
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorHorizon;
        uniform vec3 uColorZenith;
        uniform float uOpacity;
        uniform float uTime;
        varying vec3 vWorldPosition;

        // Fast pseudo-random hash
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        // 2D Value Noise for natural atmospheric drifting clouds/mist
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        void main() {
          // Calculate sky direction
          vec3 dir = normalize(vWorldPosition);
          float h = max(0.0, dir.y);

          // Advanced atmospheric extinction curve: blends horizon to zenith naturally
          float gradFactor = pow(h, 0.55);
          vec3 baseColor = mix(uColorHorizon, uColorZenith, gradFactor);

          // Subtle procedural cloud noise for sky texture depth
          vec2 noiseUV = dir.xz * 3.8 + vec2(uTime * 0.003, uTime * 0.0015);
          float cloudNoise = noise(noiseUV) * 0.12 + noise(noiseUV * 2.2) * 0.06;
          
          // Blend noise smoothly with the base gradient
          vec3 finalColor = baseColor + vec3(cloudNoise * 0.05);

          gl_FragColor = vec4(finalColor, uOpacity);
        }
      `
    };
  }, []);

  return (
    <mesh ref={domeRef}>
      <sphereGeometry args={[440, 32, 16]} />
      <shaderMaterial
        vertexShader={shader.vertexShader}
        fragmentShader={shader.fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// Statically generate 25 cloud presets so they NEVER get reset or randomized again when unmounted.
// This completely stops clouds from suddenly jumping/flashing positions when cloudCover updates.
const STATIC_CLOUD_PRESETS = Array.from({ length: 25 }).map((_, id) => {
  // Pure deterministic distribution
  const angle = (id / 25) * Math.PI * 2;
  const radius = 100 + (id * 17) % 220;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = 92 + (id * 7) % 36; // floating height
  const speedFactor = 0.35 + ((id * 3) % 7) * 0.09;
  
  // Deterministic sub-spheres for fluffy cloud profile
  const subSpheresCount = 6 + (id % 4);
  const parts = Array.from({ length: subSpheresCount }).map((_, sId) => {
    // Generate predictable fluffy offsets
    const seedX = Math.sin(id * 12 + sId * 45) * 11;
    const seedY = Math.cos(id * 7 + sId * 33) * 4;
    const seedZ = Math.sin(id * 19 + sId * 82) * 11;
    
    const scaleX = 14 + ((sId * 7) % 15);
    const scaleY = 9 + ((sId * 3) % 9);
    const scaleZ = 14 + ((sId * 5) % 15);

    return {
      offset: [seedX, seedY, seedZ] as [number, number, number],
      scale: [scaleX, scaleY, scaleZ] as [number, number, number]
    };
  });

  return { id, x, y, z, parts, speedFactor };
});

/* ------------------------------------------------------------------
   VolumetricClouds – Highly realistic, drifting, fluffy, beautifully shaded,
   multi-part procedural clouds that scale and darken with increased cloudCover.
   Designed for the unique polar atmosphere of Norilsk (cool pearl tones).
   ------------------------------------------------------------------ */
function VolumetricClouds({ 
  cloudCover, 
  windSpeed, 
  windDir, 
  isNight 
}: { 
  cloudCover: number; 
  windSpeed: number; 
  windDir: number; 
  isNight: boolean; 
 }) {
  const cloudRefs = useRef<{ [key: number]: THREE.Group | null }>({});
  
  // Overall visibility scaling
  const activeFraction = Math.min(1.0, cloudCover / 100);

  // Maintain runtime drift offsets separately to prevent resetting positions on state changes
  const positionsOffset = useRef<{ [key: number]: { x: number, z: number } }>({});
  useEffect(() => {
    STATIC_CLOUD_PRESETS.forEach((preset) => {
      if (!positionsOffset.current[preset.id]) {
        positionsOffset.current[preset.id] = { x: preset.x, z: preset.z }; // Use static coordinates
      }
    });
  }, []);

  useFrame((state, delta) => {
    const angle = (windDir * Math.PI) / 180;
    // Base speed scaled elegantly in world units
    const baseSpeed = Math.max(1.8, windSpeed) * 0.22;
    const clampedDelta = Math.min(0.1, delta);
    const dx = -Math.sin(angle) * baseSpeed * clampedDelta;
    const dz = Math.cos(angle) * baseSpeed * clampedDelta;

    // High quality physical lighting coloring for realistic scattering
    // Dynamic transition target: pearl-frost white in daylight, slate gray on overcast, midnight slate at night
    const targetCloudColor = isNight
      ? new THREE.Color("#111823")
      : new THREE.Color().lerpColors(
          new THREE.Color("#fbfcfd"), // bright pearl/frost white
          new THREE.Color("#5a6878"), // dense lead/slate grey
          activeFraction * 0.8
        );

    STATIC_CLOUD_PRESETS.forEach((preset) => {
      const ref = cloudRefs.current[preset.id];
      if (ref) {
        // Init state fallback coordinates
        if (!positionsOffset.current[preset.id]) {
          positionsOffset.current[preset.id] = { x: preset.x, z: preset.z };
        }

        // Drift the cloud coordinate map
        positionsOffset.current[preset.id].x += dx * preset.speedFactor;
        positionsOffset.current[preset.id].z += dz * preset.speedFactor;

        // Wrap coordinate limits infinitely
        const maxLimit = 360;
        if (positionsOffset.current[preset.id].x > maxLimit) positionsOffset.current[preset.id].x = -maxLimit;
        if (positionsOffset.current[preset.id].x < -maxLimit) positionsOffset.current[preset.id].x = maxLimit;
        if (positionsOffset.current[preset.id].z > maxLimit) positionsOffset.current[preset.id].z = -maxLimit;
        if (positionsOffset.current[preset.id].z < -maxLimit) positionsOffset.current[preset.id].z = maxLimit;

        // Apply updated positions and gentle breathing vertical float
        ref.position.x = positionsOffset.current[preset.id].x;
        ref.position.z = positionsOffset.current[preset.id].z;
        ref.position.y = preset.y + Math.sin(state.clock.elapsedTime * 0.035 + preset.id) * 3.0;

        // Dynamic visual fade and color transitions on child meshes
        ref.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat) {
              const maxOpacity = isNight ? 0.38 : 0.72;
              const targetOpacity = activeFraction > 0.05 ? maxOpacity * activeFraction : 0.01;
              
              mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, clampedDelta * 2.2);
              mat.color.lerp(targetCloudColor, clampedDelta * 2.2);
            }
          }
        });
      }
    });
  });

  // Render presets. Avoid hard-unmounting which resets state, use 3D layer visibility check
  return (
    <group visible={activeFraction > 0.05}>
      {STATIC_CLOUD_PRESETS.map((preset) => (
        <group
          key={preset.id}
          ref={(el) => { cloudRefs.current[preset.id] = el; }}
          position={[preset.x, preset.y, preset.z]}
        >
          {preset.parts.map((p, pIdx) => (
            <mesh key={pIdx} position={p.offset} scale={p.scale} castShadow receiveShadow={false}>
              <sphereGeometry args={[1, 16, 16]} />
              <meshStandardMaterial
                color={isNight ? "#111823" : "#fbfcfd"}
                roughness={0.92}
                metalness={0.03}
                transparent
                opacity={0} // Smoothly updated in useFrame
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------
   DynamicSun – updates sun position, sky colour, ambient light,
   and coordinates smooth transitions to prevent any lighting pops.
   ------------------------------------------------------------------ */
export default function DynamicSun({ lightingMode = "noon" }: { lightingMode?: "noon" | "sunset" | "night" | "realtime" }) {
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null);

  const [data, setData] = useState<{
    brightness: number;
    isNight: boolean;
    cloudCover: number;   // 0‑100
    rain: number;         // 0‑5
    snow: number;         // 0‑5
    windSpeed: number;    // m/s
    windDir: number;      // degrees
    isReady: boolean;
  }>({
    brightness: 1,
    isNight: false,
    cloudCover: 50,
    rain: 0,
    snow: 0,
    windSpeed: 0,
    windDir: 0,
    isReady: false,
  });

  // Interpolated targets reference to drive frame updates smoothly
  const sunTargets = useRef({
    pos: new THREE.Vector3(35, 45, 25),
    intensity: 3.4,
    color: new THREE.Color("#f4f8ff"),
    isNight: false,
  });

  // Calculate skyPosition strictly for the background sky shader (which we lerp for cinematic view)
  const currentSkyPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 250, 0));
  const skyRef = useRef<any>(null);

  // 1. Fetch weather parameters periodically
  useEffect(() => {
    let isMounted = true;
    let currentCloudCover = 50;
    let currentRain = 0;
    let currentSnow = 0;
    let currentWindSpeed = 3.5;
    let currentWindDir = 180;

    const fetchWeather = async () => {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
        const json = await res.json();
        if (json?.current !== undefined) {
          currentCloudCover = json.current.cloud_cover ?? 50;
          currentWindSpeed = json.current.wind_speed_10m ?? 3.5;
          currentWindDir = json.current.wind_direction_10m ?? 180;

          const code = json.current.weather_code ?? 0;
          // rain mapping
          if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
            currentRain = (code === 65 || code === 82) ? 5 : (code === 61 || code === 51) ? 1 : 2;
          }
          // snow mapping
          if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
            currentSnow = (code === 75 || code === 86) ? 5 : (code === 71) ? 1 : 2;
          }
        }
        if (isMounted) {
          setData((prev) => ({
            ...prev,
            cloudCover: currentCloudCover,
            rain: currentRain,
            snow: currentSnow,
            windSpeed: currentWindSpeed,
            windDir: currentWindDir,
          }));
        }
      } catch (e) {
        console.warn("[DynamicSun] Weather API fetch failed. Keeping current state gracefully.", e);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000); // 5 minutes standard cycle
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync state for global usage (Weather controllers, Architectural materials, etc.)
  useEffect(() => {
    weatherState.setState({ isNight: data.isNight, rain: data.rain, snow: data.snow });
  }, [data.isNight, data.rain, data.snow]);

  // 2. Compute Target Sun vectors and colors based on selected mood
  useEffect(() => {
    let altitude = 0;
    let azimuth = 0;
    let finalBrightness = 1.0;
    let isNight = false;
    let sunColor = "#ffffff";

    if (lightingMode === "noon") {
      altitude = Math.PI / 3; // 60 degrees standard high
      azimuth = 2.4;
      isNight = false;
      finalBrightness = 1.25;
      sunColor = "#f4f8ff"; // beautiful pure daylight Arctica white
    } else if (lightingMode === "sunset") {
      altitude = 0.08; // grazing elevation angles
      azimuth = 1.8;
      isNight = false;
      finalBrightness = 0.85;
      sunColor = "#fff2e8"; // soft warm polar pearl gold
    } else if (lightingMode === "night") {
      altitude = -0.5; // polar night elevation
      azimuth = 0;
      isNight = true;
      finalBrightness = 0.20;
      sunColor = "#44648c"; // midnight polar teal blue moon illumination
    } else {
      // Realtime polar coordinates computation
      const lat = 69.3558; // Norilsk
      const lng = 88.1893;
      const date = new Date();
      const pos = SunCalc.getPosition(date, lat, lng);
      altitude = pos.altitude;
      azimuth = pos.azimuth;
      isNight = altitude < -0.08; // astronomical twilight boundary
      
      const baseBrightness = Math.max(0.15, Math.min(1.2, (altitude + 0.1) / 0.4));
      const cloudFactor = data.cloudCover / 100;
      finalBrightness = baseBrightness * (1 - cloudFactor * 0.5);
      
      if (isNight) {
        sunColor = "#2b3d54";
      } else if (altitude < 0.12) {
        sunColor = "#fff2e8"; // low-gradient ivory/champagne
      } else if (altitude < 0.28) {
        sunColor = "#fafbff";
      } else {
        sunColor = "#f4f8ff";
      }
    }

    const distance = 250;
    const x = -distance * Math.cos(altitude) * Math.sin(azimuth);
    const z = distance * Math.cos(altitude) * Math.cos(azimuth);
    const y = distance * Math.sin(altitude);

    // Save targets to target state references (allows useFrame to lerp)
    sunTargets.current = {
      pos: new THREE.Vector3(x, y, z),
      intensity: isNight ? 0.0 : finalBrightness * 3.4,
      color: new THREE.Color(sunColor),
      isNight,
    };

    setData((prev) => ({
      ...prev,
      isNight,
      brightness: finalBrightness,
      isReady: true,
    }));
  }, [lightingMode, data.cloudCover]);

  // Compute a modified, slightly elevated skyPosition for the visual Sky dome to preserve aesthetic horizon gradients
  const skyPosTarget = useMemo(() => {
    const distance = 250;
    let alt = Math.PI / 4;
    let az = 2.4;
    
    if (lightingMode === "noon") {
      alt = Math.PI / 3;
      az = 2.4;
    } else if (lightingMode === "sunset") {
      alt = 0.25; // elevated so horizon doesn't turn muddy orange
      az = 1.8;
    } else if (lightingMode === "night") {
      alt = -0.3;
      az = 0;
    } else {
      // Realtime
      const lat = 69.3558;
      const lng = 88.1893;
      const pos = SunCalc.getPosition(new Date(), lat, lng);
      alt = Math.max(0.22, pos.altitude); // hold clean slate visual minimum
      az = pos.azimuth;
    }
    
    const x = -distance * Math.cos(alt) * Math.sin(az);
    const z = -distance * Math.cos(alt) * Math.cos(az); // corrected sign alignment
    const y = distance * Math.sin(alt);
    return new THREE.Vector3(x, y, z);
  }, [lightingMode]);

  // 3. Smooth Lerps Frame Loop: prevents ALL visual flashing or jumping of lighting parameters
  useFrame((state, delta) => {
    const clampedDelta = Math.min(0.08, delta); // strong shield against frame spikes/inactive tab lags

    // A. Lerp Directional Sun Light
    if (sunLightRef.current) {
      sunLightRef.current.position.lerp(sunTargets.current.pos, clampedDelta * 2.2);
      sunLightRef.current.intensity = THREE.MathUtils.lerp(
        sunLightRef.current.intensity,
        sunTargets.current.intensity,
        clampedDelta * 2.2
      );
      sunLightRef.current.color.lerp(sunTargets.current.color, clampedDelta * 2.2);
    }

    // B. Lerp Background Sky Dome sun coordinates
    currentSkyPosRef.current.lerp(skyPosTarget, clampedDelta * 2.0);
    if (skyRef.current?.material?.uniforms?.sunPosition?.value) {
      skyRef.current.material.uniforms.sunPosition.value.copy(currentSkyPosRef.current);
    }

    // C. Lerp Ambient light values
    if (ambientLightRef.current) {
      const targetAmbientIntensity = 0.30 + data.brightness * 0.15 + (data.cloudCover / 100) * 0.25;
      const targetAmbientColor = new THREE.Color(data.isNight ? "#1f2d40" : "#d8e9ff");

      ambientLightRef.current.intensity = THREE.MathUtils.lerp(
        ambientLightRef.current.intensity,
        targetAmbientIntensity,
        clampedDelta * 2.2
      );
      ambientLightRef.current.color.lerp(targetAmbientColor, clampedDelta * 2.2);
    }

    // D. Lerp Hemisphere bounced light values
    if (hemisphereLightRef.current) {
      const targetHemiSkyColor = new THREE.Color(data.isNight ? '#1e293b' : '#bfe3ff');
      const targetHemiGroundColor = new THREE.Color(data.isNight ? '#0b0f19' : '#f1f5f9');
      const targetHemiIntensity = data.isNight ? 0.25 : 0.85;

      hemisphereLightRef.current.intensity = THREE.MathUtils.lerp(
        hemisphereLightRef.current.intensity,
        targetHemiIntensity,
        clampedDelta * 2.2
      );
      hemisphereLightRef.current.color.lerp(targetHemiSkyColor, clampedDelta * 2.2);
      hemisphereLightRef.current.groundColor.lerp(targetHemiGroundColor, clampedDelta * 2.2);
    }
  });

  return (
    <>
      {/* ----- Procedural Atmospheric Sky Canvas ----- */}
      <Sky
        ref={skyRef}
        distance={450000}
        sunPosition={skyPosTarget}
        inclination={0}
        azimuth={0.25}
        turbidity={0.6 + (data.cloudCover / 100) * 1.2} // crystal clear arctic air density scaling
        rayleigh={data.isNight ? 0.2 : 0.75}             // ultra-clean scattering, prevents muddy orange pollution
        mieCoefficient={0.0004 + (data.cloudCover / 100) * 0.0006}
        mieDirectionalG={0.82}
      />

      {/* Atmospheric Overcast Overlay & Procedural Volumetric Clouds */}
      <OvercastDome cloudCover={data.cloudCover} isNight={data.isNight} />
      
      <VolumetricClouds 
        cloudCover={data.cloudCover} 
        windSpeed={data.windSpeed} 
        windDir={data.windDir} 
        isNight={data.isNight} 
      />

      {/* Gentle Constellation field on night atmospheres */}
      {data.isNight && data.cloudCover < 80 && (
        <Stars radius={300} depth={50} count={3500} factor={4} saturation={0} fade speed={0.4} />
      )}

      {/* Shadow-Casting Directional Sun Light Source */}
      <directionalLight
        ref={sunLightRef}
        position={[35, 45, 25]} // Initial load placeholder, mutated smoothly in useFrame
        intensity={0}
        color="#ffffff"
        castShadow={true}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.03}
      >
        <orthographicCamera attach="shadow-camera" args={[-70, 70, 70, -70, 0.5, 400]} />
      </directionalLight>

      {/* Ground Albedo Bounced Light (Simulating high snow reflectance) */}
      <hemisphereLight
        ref={hemisphereLightRef}
        args={['#bfe3ff', '#f1f5f9', 0.85]}
      />

      {/* Ambient Fill Light */}
      <ambientLight
        ref={ambientLightRef}
        intensity={0.4}
        color="#d8e9ff"
      />
    </>
  );
}

