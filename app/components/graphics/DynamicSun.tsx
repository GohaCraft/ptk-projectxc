"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import SunCalc from "suncalc";
import { weatherState } from "../data/weatherState";
import { clearError } from "../data/errorState";
import { getSeasonalFallback, fetchOpenMeteoClient } from "../data/weatherFallback";

// Переиспользуемые scratch-цвета для покадрового лерпа света — без аллокаций в useFrame.
const _ambientColor = new THREE.Color();
const _hemiSky = new THREE.Color();
const _hemiGround = new THREE.Color();

/* ------------------------------------------------------------------
   SkyClouds – реалистичный и ОЧЕНЬ дешёвый слой облаков.
   Вместо сотен теневых сфер — один купол с фрактальным шумом (FBM),
   нарисованным в фрагментном шейдере. Покрытие неба задаётся реальным
   cloud_cover (%), облака дрейфуют по реальному ветру, тонируются днём/
   ночью и подсвечиваются со стороны солнца. Одна mesh, без отбрасывания
   теней — идеально для слабого киоска (Core i3 / 4 ГБ).
   ------------------------------------------------------------------ */
function SkyClouds({
  cloudCover,
  isNight,
  windDir,
  windSpeed,
  sunDirRef,
}: {
  cloudCover: number;
  isNight: boolean;
  windDir: number;
  windSpeed: number;
  sunDirRef: React.MutableRefObject<THREE.Vector3>;
}) {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCoverage: { value: Math.min(1, Math.max(0, cloudCover / 100)) },
      uWind: { value: new THREE.Vector2(0, 0) },
      uNight: { value: isNight ? 1 : 0 },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uColorDay: { value: new THREE.Color("#f4f7fb") },   // светлая перламутровая облачность
      uColorShadow: { value: new THREE.Color("#8b98a8") }, // плотная свинцово-серая тень
      uColorNight: { value: new THREE.Color("#10151f") },  // ночная облачность
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state, delta) => {
    const cd = Math.min(0.1, delta);
    uniforms.uTime.value = state.clock.getElapsedTime();

    const targetCov = Math.min(1, Math.max(0, cloudCover / 100));
    uniforms.uCoverage.value = THREE.MathUtils.lerp(uniforms.uCoverage.value, targetCov, cd * 1.8);
    uniforms.uNight.value = THREE.MathUtils.lerp(uniforms.uNight.value, isNight ? 1 : 0, cd * 1.8);

    // дрейф по реальному направлению/скорости ветра (медленный, кинематографичный)
    const angle = (windDir * Math.PI) / 180;
    const sp = Math.max(0.6, windSpeed) * 0.0011;
    uniforms.uWind.value.set(-Math.sin(angle) * sp, Math.cos(angle) * sp);

    if (sunDirRef?.current) {
      uniforms.uSunDir.value.copy(sunDirRef.current).normalize();
    }
  });

  const shader = useMemo(
    () => ({
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uCoverage;
        uniform vec2  uWind;
        uniform float uNight;
        uniform vec3  uSunDir;
        uniform vec3  uColorDay;
        uniform vec3  uColorShadow;
        uniform vec3  uColorNight;
        varying vec3 vWorldPosition;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

        float noise(vec2 p){
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                     mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }

        // 4 октавы FBM — естественная кучево-слоистая структура
        float fbm(vec2 p){
          float v = 0.0;
          float a = 0.5;
          mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
          for (int i = 0; i < 4; i++){
            v += a * noise(p);
            p = m * p;
            a *= 0.5;
          }
          return v;
        }

        void main(){
          vec3 dir = normalize(vWorldPosition);
          float h = dir.y;

          // плавно гасим у горизонта, нижнюю полусферу отбрасываем
          float horizonFade = smoothstep(0.015, 0.32, h);
          if (horizonFade <= 0.001) discard;

          // проекция полусферы на «плоскость облаков» на высоте
          vec2 p = dir.xz / (h + 0.16);
          p *= 1.15;
          p += uWind * uTime;

          float base   = fbm(p);
          float detail = noise(p * 3.1 + 11.0);
          float field  = base * 0.78 + detail * 0.22;

          // порог покрытия: больше cloud_cover -> ниже порог -> больше облаков
          float thr  = mix(1.05, 0.16, uCoverage);
          float edge = 0.16;
          float cloud = smoothstep(thr - edge, thr + edge, field) * horizonFade;

          // объём: плотные участки темнее снизу, края светлые
          float shade = smoothstep(0.25, 0.95, detail);
          vec3 dayColor = mix(uColorDay, uColorShadow, shade * (0.30 + uCoverage * 0.55));

          // подсветка со стороны солнца
          float sun = max(0.0, dot(dir, normalize(uSunDir)));
          dayColor += vec3(0.14, 0.13, 0.11) * pow(sun, 6.0) * (1.0 - uCoverage * 0.5);

          vec3 color = mix(dayColor, uColorNight, uNight);
          float alpha = cloud * mix(0.94, 0.72, uNight);

          gl_FragColor = vec4(color, alpha);
        }
      `,
    }),
    []
  );

  return (
    <mesh renderOrder={1}>
      <sphereGeometry args={[450, 48, 24]} />
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


/* ------------------------------------------------------------------
   SunDisc – настоящий видимый «диск» солнца со светящимся ореолом.
   Билборд (sprite) всегда повёрнут к камере, стоит ровно в той точке,
   где небо (drei <Sky>) считает солнце (skyPosRef) — поэтому диск и
   свечение неба совпадают, нет «двух солнц». Ночью плавно гаснет.
   ------------------------------------------------------------------ */
function SunDisc({
  skyPosRef,
  isNight,
}: {
  skyPosRef: React.MutableRefObject<THREE.Vector3>;
  isNight: boolean;
}) {
  const ref = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0.0, "rgba(255,255,250,1)");   // яркое ядро
    g.addColorStop(0.16, "rgba(255,250,228,0.96)");
    g.addColorStop(0.34, "rgba(255,232,178,0.5)"); // тёплый ореол
    g.addColorStop(1.0, "rgba(255,224,168,0)");    // мягко в ноль
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);

  useFrame(() => {
    const s = ref.current;
    if (!s || !skyPosRef.current) return;
    // ставим диск по направлению на солнце, на фиксированном расстоянии
    s.position.copy(skyPosRef.current).normalize().multiplyScalar(340);
    const target = isNight ? 0 : 1;
    const m = s.material as THREE.SpriteMaterial;
    m.opacity += (target - m.opacity) * 0.08;
    s.visible = m.opacity > 0.02;
  });

  if (!tex) return null;
  return (
    <sprite ref={ref} scale={[54, 54, 1]}>
      <spriteMaterial
        map={tex}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

/* ------------------------------------------------------------------
   DynamicSun – updates sun position, sky colour, ambient light,
   and coordinates smooth transitions to prevent any lighting pops.
   ------------------------------------------------------------------ */
export default function DynamicSun({
  lightingMode = "noon",
  perfTier = "high",
}: {
  lightingMode?: "noon" | "sunset" | "night" | "realtime";
  perfTier?: "low" | "medium" | "high";
}) {
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const hemisphereLightRef = useRef<THREE.HemisphereLight>(null);

  // Реальное направление НА солнце (мировое), нормализованное — для подсветки облаков.
  const sunDirRef = useRef<THREE.Vector3>(new THREE.Vector3(0.3, 1, 0.2).normalize());

  // Размер карты теней по тиру: на слабом железе 1024² вместо 2048² (вчетверо дешевле).
  const shadowMapSize = perfTier === "high" ? 2048 : 1024;

  const [data, setData] = useState<{
    brightness: number;
    isNight: boolean;
    cloudCover: number;   // 0‑100
    rain: number;         // 0‑5
    snow: number;         // 0‑5
    storm: number;        // 0‑1 (гроза)
    fog: number;          // 0‑1 (туман)
    windSpeed: number;    // m/s
    windDir: number;      // degrees
    isReady: boolean;
  }>({
    brightness: 1,
    isNight: false,
    cloudCover: 50,
    rain: 0,
    snow: 0,
    storm: 0,
    fog: 0,
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
    let currentStorm = 0;
    let currentFog = 0;
    let currentWindSpeed = 3.5;
    let currentWindDir = 180;

    // Применяет блок current (из API или локального фолбэка) к сцене.
    const applyCurrent = (current: any) => {
      currentRain = 0;
      currentSnow = 0;
      currentStorm = 0;
      currentFog = 0;
      currentCloudCover = current.cloud_cover ?? 50;
      currentWindSpeed = current.wind_speed_10m ?? 3.5;
      currentWindDir = current.wind_direction_10m ?? 180;

      const code = current.weather_code ?? 0;

      if (typeof current.precipitation === 'number') {
        // Точнее: используем реальные осадки (мм/ч) и температуру — дождь это или
        // снег и какой силы, а не грубые «корзины» по коду.
        const precip = current.precipitation;
        const snowfall = current.snowfall;
        const temp = current.temperature;
        const isSnow = (typeof snowfall === 'number' && snowfall > 0) ||
                       (typeof temp === 'number' && temp <= 0.5 && precip > 0);
        if (precip > 0) {
          const intensity = precip < 0.3 ? 1 : precip < 1.5 ? 2 : precip < 4 ? 3 : 5;
          if (isSnow) currentSnow = intensity; else currentRain = intensity;
        }
      } else {
        // Запасной разбор по коду WMO (если осадки в мм недоступны).
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
          currentRain = (code === 65 || code === 82) ? 5 : (code === 61 || code === 51) ? 1 : 2;
        }
        if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
          currentSnow = (code === 75 || code === 86) ? 5 : (code === 71) ? 1 : 2;
        }
      }
      // туман (WMO 45 — туман, 48 — изморозевый туман)
      if (code === 45 || code === 48) {
        currentFog = code === 48 ? 1.0 : 0.8;
      }
      // гроза (WMO 95-99) -> молнии + сильный дождь
      if (code >= 95 && code <= 99) {
        currentStorm = 1;
        currentRain = Math.max(currentRain, 5);
        currentCloudCover = 100;
      }

      if (isMounted && !weatherState.manual) {
        setData((prev) => ({
          ...prev,
          cloudCover: currentCloudCover,
          rain: currentRain,
          snow: currentSnow,
          storm: currentStorm,
          fog: currentFog,
          windSpeed: currentWindSpeed,
          windDir: currentWindDir,
        }));
      }
    };

    const fetchWeather = async () => {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
        const json = await res.json();
        if (!json?.current) throw new Error("Weather API: no current data");
        applyCurrent(json.current);
        clearError(101);
      } catch (e) {
        // Нет серверного /api/weather (офлайн .exe — маршрут вырезан при экспорте).
        // Пытаемся получить РЕАЛЬНУЮ погоду напрямую из Open-Meteo (в Electron CORS
        // отключён). Если и сети нет — правдоподобный сезонный расчёт. В любом случае
        // сцена получает корректные данные, поэтому плашку ошибки убираем.
        const direct = await fetchOpenMeteoClient();
        if (direct) {
          applyCurrent(direct.current);
        } else {
          console.warn("[DynamicSun] Живая погода недоступна, используем локальный сезонный расчёт.", e);
          applyCurrent(getSeasonalFallback().current);
        }
        clearError(101);
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
    weatherState.setState({
      isNight: data.isNight, rain: data.rain, snow: data.snow, storm: data.storm, fog: data.fog,
      cloudCover: data.cloudCover, windSpeed: data.windSpeed, windDir: data.windDir,
    });
  }, [data.isNight, data.rain, data.snow, data.storm, data.fog, data.cloudCover, data.windSpeed, data.windDir]);

  // Ручной режим погоды: когда пользователь выбрал погоду вручную — сразу применяем
  // её к облакам/солнцу (cloudCover) и осадкам.
  useEffect(() => {
    const unsub = weatherState.subscribe((s) => {
      if (s.manual) {
        setData((prev) => (
          prev.cloudCover === s.cloudCover && prev.rain === s.rain && prev.snow === s.snow && prev.storm === s.storm && prev.fog === s.fog
            ? prev
            : { ...prev, cloudCover: s.cloudCover, rain: s.rain, snow: s.snow, storm: s.storm, fog: s.fog }
        ));
      }
    });
    return () => { unsub(); };
  }, []);

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
      // Реальное направление на солнце для подсветки облаков (мировые координаты).
      if (sunLightRef.current.position.lengthSq() > 1e-4) {
        sunDirRef.current.copy(sunLightRef.current.position).normalize();
      }
    }

    // B. Lerp Background Sky Dome sun coordinates
    currentSkyPosRef.current.lerp(skyPosTarget, clampedDelta * 2.0);
    if (skyRef.current?.material?.uniforms?.sunPosition?.value) {
      skyRef.current.material.uniforms.sunPosition.value.copy(currentSkyPosRef.current);
    }

    // C. Lerp Ambient light values
    if (ambientLightRef.current) {
      const targetAmbientIntensity = 0.30 + data.brightness * 0.15 + (data.cloudCover / 100) * 0.25;
      const targetAmbientColor = _ambientColor.set(data.isNight ? "#1f2d40" : "#d8e9ff");

      ambientLightRef.current.intensity = THREE.MathUtils.lerp(
        ambientLightRef.current.intensity,
        targetAmbientIntensity,
        clampedDelta * 2.2
      );
      ambientLightRef.current.color.lerp(targetAmbientColor, clampedDelta * 2.2);
    }

    // D. Lerp Hemisphere bounced light values
    if (hemisphereLightRef.current) {
      const targetHemiSkyColor = _hemiSky.set(data.isNight ? '#1e293b' : '#bfe3ff');
      const targetHemiGroundColor = _hemiGround.set(data.isNight ? '#0b0f19' : '#f1f5f9');
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
        turbidity={0.6 + (data.cloudCover / 100) * 1.2} // crystal clear arctic air density scaling
        rayleigh={data.isNight ? 0.2 : 0.75}             // ultra-clean scattering, prevents muddy orange pollution
        // Узкое и слабое гало солнца: раньше широкий «mie»-ореол читался как
        // серый купол в небе («белая сфера, что стягивается при повороте»).
        // Меньше mieCoefficient + g ближе к 1 = солнце маленькое и аккуратное.
        mieCoefficient={0.0015}
        mieDirectionalG={0.97}
      />

      {/* Видимый диск солнца (совпадает с точкой солнца неба) */}
      <SunDisc skyPosRef={currentSkyPosRef} isNight={data.isNight} />

      {/* Atmospheric Overcast Overlay & Procedural Volumetric Clouds */}
      <SkyClouds
        cloudCover={data.cloudCover}
        isNight={data.isNight}
        windDir={data.windDir}
        windSpeed={data.windSpeed}
        sunDirRef={sunDirRef}
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
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.03}
      >
        {/* Кадрируем теневую камеру по зданию (±48 м): резче тени при том же разрешении. */}
        <orthographicCamera attach="shadow-camera" args={[-48, 48, 48, -48, 0.5, 400]} />
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

