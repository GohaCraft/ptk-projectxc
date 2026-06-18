"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { weatherState } from "../data/weatherState";

/* --------------------------------------------------------------
   1️⃣ Noise texture – cheap 2‑D white‑noise used for puddles &
      ripple distortion. Generated once on the client.
   -------------------------------------------------------------- */
function createNoiseTexture() {
  if (typeof window === "undefined") return null;
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/* --------------------------------------------------------------
   1b️⃣ Реальный двор колледжа (по фото): светло-серый асфальт
   ~#8a8a86, крупные мягкие светлые/тёмные пятна-разводы,
   лёгкая зернистость, минимум трещин (асфальт в целом ровный).
   -------------------------------------------------------------- */
function createAsphaltTexture() {
  if (typeof window === "undefined") return null;
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // База — светло-серый асфальт
  ctx.fillStyle = "#8c8b87";
  ctx.fillRect(0, 0, size, size);

  // Лёгкая зернистость
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 0.85 + Math.random() * 0.25;
    const c = Math.floor(140 * v);
    ctx.fillStyle = `rgba(${c},${c - 1},${c - 3},0.25)`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Крупные светлые разводы (выгоревший/протёртый асфальт)
  ctx.globalCompositeOperation = "lighten";
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 100 + Math.random() * 220;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(168,166,160,0.30)");
    grad.addColorStop(1, "rgba(168,166,160,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";

  // Тёмные мягкие пятна (влажные/масляные участки) — немного
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 100;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(70,68,64,0.22)");
    grad.addColorStop(1, "rgba(70,68,64,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Тонкие швы/трещины — единичные, длинные, едва заметные
  // (на фото асфальт в основном цельный, без активной сетки трещин)
  for (let i = 0; i < 3; i++) {
    const x0 = Math.random() * size;
    const y0 = Math.random() * size;
    const angle = Math.random() * Math.PI * 2;
    const len = 200 + Math.random() * 300;
    ctx.strokeStyle = "rgba(55,53,50,0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    const segs = 4;
    let cx = x0, cy = y0, a = angle;
    for (let s = 0; s < segs; s++) {
      a += (Math.random() - 0.5) * 0.6;
      cx += Math.cos(a) * (len / segs);
      cy += Math.sin(a) * (len / segs);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}


const floorVertex = `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const floorFragment = `
  uniform sampler2D tNoise;
  uniform float uTime;
  uniform float uRain;          // 0‑1
  uniform float uSnow;          // 0‑1
  uniform float uWaterLevel;    // 0‑1  (puddle amount)
  uniform float uSnowLevel;     // 0‑1  (snow cover)
  uniform vec3 uBaseColor;      // dry asphalt
  uniform vec3 uWetColor;       // wet asphalt (darker)
  uniform vec3 uSnowColor;      // fresh snow
  uniform float uRippleSpeed;
  uniform float uRippleScale;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  float noise(vec2 uv) {
    return texture2D(tNoise, uv).r;
  }
  // simple fbm – 2 octaves are enough for puddle shape
  float fbm(vec2 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 2; i++) {
      total += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return total;
  }

  void main() {
    // ---- base colour (dry/wet) -------------------------------------------------
    float wet = smoothstep(0.0, 0.5, uWaterLevel) * uRain;
    vec3 baseCol = mix(uBaseColor, uWetColor, wet);

    // ---- puddle mask (using noise + time) --------------------------------------
    vec2 seed = vWorldPos.xz * 0.1;
    float puddleNoise = fbm(seed + uTime * 0.03);
    float puddleMask = smoothstep(0.4, 0.6, puddleNoise); // 0‑1 inside a puddle
    puddleMask = clamp(puddleMask * uRain * uWaterLevel, 0.0, 1.0);

    // ---- ripple animation (concentric circles) --------------------------------
    // ripple centre drifts slowly to avoid perfect repetition
    vec2 rippleUV = vUv;
    float ripple = sin(
      length(rippleUV - vec2(0.5)) * uRippleScale - uTime * uRippleSpeed
    ) * 0.5 + 0.5;
    ripple = smoothstep(0.45, 0.55, ripple); // thin ring
    // ripple adds a little specular (makes wet surface shinier)
    float rippleSpec = ripple * 0.3 * uRain * uWaterLevel;

    // ---- snow cover ------------------------------------------------------------
    float snow = smoothstep(0.0, 0.5, uSnowLevel) * uSnow;
    vec3 col = mix(baseCol, uWetColor, wet); // dry → wet
    col = mix(col, uSnowColor, snow);        // wet → snow‑topped

    // ---- final colour ----------------------------------------------------------
    // add a faint specular highlight from ripples
    col += vec3(0.02) * rippleSpec;
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* --------------------------------------------------------------
   3️⃣ Floor component – uses the shader above
   -------------------------------------------------------------- */
export const Floor = ({
  rainIntensity = 0,
  snowIntensity = 0,
  size = 800,
}: { rainIntensity?: number; snowIntensity?: number; size?: number; tex?: any }) => {
  const ref = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const asphaltTex = useMemo(() => {
    const t = createAsphaltTexture();
    if (t) {
      // 800м плоскость, текстура 1024px повторяется каждые ~8м двора
      t.repeat.set(size / 8, size / 8);
    }
    return t;
  }, [size]);

  useFrame((state, delta) => {
    if (!materialRef.current) return;
    const targetWater = rainIntensity > 0 ? rainIntensity : 0.0;
    const targetSnow = snowIntensity > 0 ? snowIntensity : 0.0;

    // Базовый цвет — реальный асфальт двора колледжа (светло-серый)
    const baseColor = new THREE.Color(0x8c8b87);
    const wetColor = new THREE.Color(0x5e5d5a);
    const snowColor = new THREE.Color(0xeeeeee);
    
    // Blend colors
    const finalColor = baseColor.clone();
    finalColor.lerp(wetColor, targetWater);
    finalColor.lerp(snowColor, targetSnow);
    
    materialRef.current.color.lerp(finalColor, delta * 2.0);
    
    // By keeping the wet roughness slightly higher and disabling strong envMapIntensity,
    // we avoid the z-fighting / rendering pop that causes the floor to flicker.
    // Повышаем шероховатость влажного асфальта и приглушаем интенсивность отражений окружения,
    // чтобы предотвратить отображение «фантомных» зеркальных небоскрёбов из пресета окружения.
    const targetRoughness = targetSnow > 0.5 ? 0.95 : (targetWater > 0.1 ? 0.65 : 0.9);
    materialRef.current.roughness = THREE.MathUtils.lerp(materialRef.current.roughness, targetRoughness, delta * 2.0);
  });

  // Grid line geometry — cell 2м, покрывает 200×200м вокруг здания
  const gridLines = useMemo(() => {
    const gridSize = 200;
    const cellSize = 2;
    const count = gridSize / cellSize;
    const half = gridSize / 2;
    const positions: number[] = [];
    // Вертикальные линии (вдоль Z)
    for (let i = 0; i <= count; i++) {
      const x = -half + i * cellSize;
      positions.push(x, 0, -half,  x, 0, half);
    }
    // Горизонтальные линии (вдоль X)
    for (let i = 0; i <= count; i++) {
      const z = -half + i * cellSize;
      positions.push(-half, 0, z,  half, 0, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[size, size, 1, 1]} />
        <meshStandardMaterial ref={materialRef} roughness={0.92} map={asphaltTex} color={0xffffff} envMapIntensity={0.01} />
      </mesh>
      {/* Сетка 2×2м поверх платформы */}
      <lineSegments geometry={gridLines} position={[0, -0.03, 0]}>
        <lineBasicMaterial color="#555555" transparent opacity={0.35} depthWrite={false} />
      </lineSegments>
    </>
  );
};

/* --------------------------------------------------------------
   4️⃣ InstancedMesh rain drops (thin boxes) and snow flakes
   -------------------------------------------------------------- */
const DROP_COUNT = 350;   // optimized for butter-smooth frame rates
const SNOW_COUNT = 250;

const dropGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.3); // vertical drop (optimized size)
const snowGeometry = new THREE.PlaneGeometry(0.2, 0.2, 1, 1); // snowflake (optimized size)

export const WeatherEffects = ({
  rainIntensity = 0,
  snowIntensity = 0,
}: { rainIntensity: number, snowIntensity: number }) => {
  const dropMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xadd8e6,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  }), []);
  
  const snowMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  }), []);

  const dropMesh = useRef<THREE.InstancedMesh>(null);
  const snowMesh = useRef<THREE.InstancedMesh>(null);

  // ---- initialise random positions (client only) -----
  useEffect(() => {
    if (!dropMesh.current || !snowMesh.current) return;
    
    const dropMatrix = new THREE.Matrix4();
    const snowMatrix = new THREE.Matrix4();

    for (let i = 0; i < DROP_COUNT; i++) {
      dropMatrix.makeTranslation(
        (Math.random() - 0.5) * 200,
        Math.random() * 120,
        (Math.random() - 0.5) * 200
      );
      dropMesh.current.setMatrixAt(i, dropMatrix);
    }
    for (let i = 0; i < SNOW_COUNT; i++) {
      snowMatrix.makeTranslation(
        (Math.random() - 0.5) * 200,
        Math.random() * 120 + 30, // start a bit higher
        (Math.random() - 0.5) * 200
      );
      snowMesh.current.setMatrixAt(i, snowMatrix);
    }
    dropMesh.current.instanceMatrix.needsUpdate = true;
    snowMesh.current.instanceMatrix.needsUpdate = true;
  }, []);

  // ---- animate each frame ---------------------------------------------------
  useFrame((state, delta) => {
    if (!dropMesh.current || !snowMesh.current) return;
    
    const dropSpeed = 22.0 * rainIntensity; // world units per second
    const snowSpeed = 6.0 * snowIntensity;
    const dropMat = new THREE.Matrix4();
    const snowMat = new THREE.Matrix4();

    // rain drops
    if (rainIntensity > 0) {
        for (let i = 0; i < DROP_COUNT; i++) {
          dropMesh.current.getMatrixAt(i, dropMat);
          const pos = new THREE.Vector3().setFromMatrixPosition(dropMat);
          pos.y -= dropSpeed * delta;
          if (pos.y < -20) {
            // respawn above
            pos.y = 120 + Math.random() * 20;
            pos.x = (Math.random() - 0.5) * 200;
            pos.z = (Math.random() - 0.5) * 200;
          }
          dropMat.makeTranslation(pos.x, pos.y, pos.z);
          dropMesh.current.setMatrixAt(i, dropMat);
        }
        dropMesh.current.instanceMatrix.needsUpdate = true;
    }

    // snow flakes – gentle horizontal drift
    if (snowIntensity > 0) {
        for (let i = 0; i < SNOW_COUNT; i++) {
          snowMesh.current.getMatrixAt(i, snowMat);
          const pos = new THREE.Vector3().setFromMatrixPosition(snowMat);
          pos.y -= snowSpeed * delta;
          // slight drift based on time + index
          pos.x += Math.sin(state.clock.elapsedTime + i * 0.13) * 0.04 * delta * 60;
          pos.z += Math.cos(state.clock.elapsedTime + i * 0.17) * 0.04 * delta * 60;
          if (pos.y < -20) {
            pos.y = 120 + Math.random() * 20;
            pos.x = (Math.random() - 0.5) * 200;
            pos.z = (Math.random() - 0.5) * 200;
          }
          snowMat.makeTranslation(pos.x, pos.y, pos.z);
          snowMesh.current.setMatrixAt(i, snowMat);
        }
        snowMesh.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={dropMesh} args={[dropGeometry, dropMaterial, DROP_COUNT]} visible={rainIntensity > 0} />
      <instancedMesh ref={snowMesh} args={[snowGeometry, snowMaterial, SNOW_COUNT]} visible={snowIntensity > 0} />
    </>
  );
};

export const WeatherParticleSystem = ({ rain, snow, windSpeed, windDir }: { rain: number; snow: number; windSpeed: number; windDir: number }) => {
  const count = 5000;
  const pointsRef = useRef<THREE.Points>(null);
  const splashCount = 2000;
  const splashesRef = useRef<THREE.Points>(null);
  const splashLife = useRef(new Float32Array(splashCount));
  
  const [positions, splashPositions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 150; // x
        pos[i * 3 + 1] = 200 + Math.random() * 50; // y - initial is out of sight
        pos[i * 3 + 2] = (Math.random() - 0.5) * 150; // z
    }
    const sPos = new Float32Array(splashCount * 3);
    for (let i = 0; i < splashCount; i++) {
        sPos[i * 3 + 1] = -100; // start hidden underground
    }
    return [pos, sPos];
  }, []);

  const windParams = useRef({ speed: windSpeed, dir: windDir, rain: rain, snow: snow });
  const isHiddenRef = useRef(false);

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1);
    
    // Smoothly lerp weather parameters
    windParams.current.speed += (windSpeed - windParams.current.speed) * d * 0.5;
    const dp = windDir - windParams.current.dir;
    const diff = Math.atan2(Math.sin(dp * Math.PI / 180), Math.cos(dp * Math.PI / 180)) * 180 / Math.PI;
    windParams.current.dir += diff * d * 0.5;
    windParams.current.rain += (rain - windParams.current.rain) * d * 0.5;
    windParams.current.snow += (snow - windParams.current.snow) * d * 0.5;
    
    const wSpeed = windParams.current.speed;
    const wDirRad = windParams.current.dir * Math.PI / 180;
    const wX = -Math.sin(wDirRad) * wSpeed * 0.5; // Scale down wind horizontally
    const wZ = Math.cos(wDirRad) * wSpeed * 0.5;
    
    const rAmount = Math.max(0, windParams.current.rain);
    const sAmount = Math.max(0, windParams.current.snow);
    const isRain = rAmount > sAmount;
    
    const activeCount = Math.floor(Math.min(1.0, (rAmount + sAmount) / 5) * count);

    if (!pointsRef.current) return;

    if (activeCount === 0 && rAmount < 0.01 && sAmount < 0.01) {
        if (!isHiddenRef.current) {
            const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < count; i++) {
                pos[i * 3 + 1] = 200;
            }
            pointsRef.current.geometry.attributes.position.needsUpdate = true;
            
            if (splashesRef.current) {
               const sPos = splashesRef.current.geometry.attributes.position.array as Float32Array;
               for (let i = 0; i < splashCount; i++) {
                   sPos[i * 3 + 1] = -100;
               }
               splashesRef.current.geometry.attributes.position.needsUpdate = true;
            }
            isHiddenRef.current = true;
        }
        return;
    }
    
    isHiddenRef.current = false;
    
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();
    const fallSpeed = isRain ? 40 : 25;
    
    const sPos = splashesRef.current ? splashesRef.current.geometry.attributes.position.array as Float32Array : null;
    
    if (sPos) {
        for (let i = 0; i < splashCount; i++) {
            if (splashLife.current[i] > 0) {
                splashLife.current[i] -= d * 4; // lives for 0.25 seconds
                sPos[i * 3 + 1] += d * (isRain ? 3 : 1.5);
                sPos[i * 3] += wX * d * 0.5;
                sPos[i * 3 + 2] += wZ * d * 0.5;
                if (splashLife.current[i] <= 0) {
                    sPos[i * 3 + 1] = -100;
                }
            }
        }
    }

    let searchIdx = 0;

    for (let i = 0; i < count; i++) {
       if (i >= activeCount) {
          pos[i * 3 + 1] = 200;
          continue;
       }

       if (pos[i * 3 + 1] > 150) {
          pos[i * 3 + 1] = 100 + Math.random() * 20;
       }
       
       pos[i * 3 + 1] -= fallSpeed * d;
       
       let dx = wX * d;
       let dz = wZ * d;
       
       if (!isRain) {
          dx += Math.sin(time + i) * 3 * d; 
          dz += Math.cos(time + i * 0.5) * 3 * d;
       }
       
       pos[i * 3] += dx;
       pos[i * 3 + 2] += dz;
       
       if (pos[i * 3 + 1] <= 0) {
          if (sPos && i % (isRain ? 4 : 8) === 0) {
              while (searchIdx < splashCount && splashLife.current[searchIdx] > 0) {
                  searchIdx++;
              }
              if (searchIdx < splashCount) {
                  sPos[searchIdx * 3] = pos[i * 3];
                  sPos[searchIdx * 3 + 1] = 0.1;
                  sPos[searchIdx * 3 + 2] = pos[i * 3 + 2];
                  splashLife.current[searchIdx] = 1.0;
              }
          }
          pos[i * 3 + 1] = 100 + Math.random() * 20;
          pos[i * 3] = (Math.random() - 0.5) * 150;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 150;
       }
    }
    
    if (sPos) {
       splashesRef.current!.geometry.attributes.position.needsUpdate = true;
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={rain > snow ? 0.3 : 0.6}
          color={rain > snow ? "#88aaff" : "#ffffff"}
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <points ref={splashesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[splashPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.4}
          color="#aaccff"
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  );
};

export const WeatherLayer = ({ tex }: { tex: any }) => {
  const [weather, setWeather] = useState({ rain: weatherState.rain, snow: weatherState.snow });
  useEffect(() => {
    const unsubscribe = weatherState.subscribe((state) => {
      setWeather({ rain: state.rain, snow: state.snow });
    });
    return () => { unsubscribe(); };
  }, []);

  return (
    <>
      <WeatherEffects rainIntensity={weather.rain} snowIntensity={weather.snow} />
    </>
  );
};