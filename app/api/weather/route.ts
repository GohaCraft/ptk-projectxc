import { NextResponse } from 'next/server';
import { getPolarAstronomicalData, getSeasonalFallback, LAT, LON } from '../../components/data/weatherFallback';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
//  МУЛЬТИ-ИСТОЧНИКОВЫЙ МОНИТОРИНГ ПОГОДЫ (Норильск)
//
//  Опрашиваем НЕСКОЛЬКО независимых провайдеров параллельно и сверяем их между
//  собой («не все показывают правду»):
//    • Open-Meteo   — детальные данные: облачность по ярусам, осадки, снег, ветер;
//    • MET Norway   — авторитетный норвежский институт (без ключа, нужен User-Agent);
//    • wttr.in      — независимый кросс-чек (без ключа).
//  Числовые поля агрегируем медианой (устойчива к «вранью» одного источника),
//  направление ветра — круговым средним. Если все недоступны: старый кэш ->
//  сезонный расчёт.
//
//  Безопасность: все URL фиксированы, без пользовательского ввода (нет SSRF);
//  все значения клампятся в безопасные диапазоны.
// ─────────────────────────────────────────────────────────────────────────────

let cachedResponse: any = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
const FETCH_TIMEOUT_MS = 4500;
const USER_AGENT = 'ZGU-3D-DigitalTwin/1.24 (github.com/GohaCraft/ptk-projectxc)';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const isNum = (v: any): v is number => typeof v === 'number' && isFinite(v);

interface Sample {
  source: string;
  cloud_cover: number;
  cloud_low?: number;
  cloud_mid?: number;
  cloud_high?: number;
  precip_mm: number;     // мм/ч (жидкий эквивалент)
  snowfall_cm?: number;  // см/ч
  temperature?: number;  // °C
  weather_code?: number; // WMO
  wind_speed: number;    // м/с
  wind_dir: number;      // град
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function meanAngle(degs: number[]): number {
  let x = 0, y = 0;
  for (const d of degs) { const r = (d * Math.PI) / 180; x += Math.cos(r); y += Math.sin(r); }
  if (x === 0 && y === 0) return 180;
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const pick = (samples: Sample[], key: keyof Sample): number[] =>
  samples.map((s) => s[key]).filter(isNum) as number[];

// ── Провайдеры (каждый возвращает Sample | null) ─────────────────────────────

async function fetchOpenMeteo(): Promise<Sample | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation,rain,showers,snowfall,weather_code,temperature_2m,wind_speed_10m,wind_direction_10m` +
      `&wind_speed_unit=ms`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const c = (await res.json())?.current;
    if (!c) return null;
    const precip = isNum(c.precipitation) ? c.precipitation : (c.rain || 0) + (c.showers || 0) + (c.snowfall || 0);
    return {
      source: 'open-meteo',
      cloud_cover: c.cloud_cover, cloud_low: c.cloud_cover_low, cloud_mid: c.cloud_cover_mid, cloud_high: c.cloud_cover_high,
      precip_mm: precip, snowfall_cm: c.snowfall, temperature: c.temperature_2m,
      weather_code: c.weather_code, wind_speed: c.wind_speed_10m, wind_dir: c.wind_direction_10m,
    };
  } catch { return null; }
}

async function fetchMetNo(): Promise<Sample | null> {
  try {
    const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${LAT}&lon=${LON}`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const ts = (await res.json())?.properties?.timeseries?.[0];
    const det = ts?.data?.instant?.details;
    if (!det) return null;
    const next1 = ts?.data?.next_1_hours;
    const symbol: string = next1?.summary?.symbol_code || '';
    return {
      source: 'met.no',
      cloud_cover: det.cloud_area_fraction,
      precip_mm: next1?.details?.precipitation_amount ?? 0,
      snowfall_cm: symbol.includes('snow') ? (next1?.details?.precipitation_amount ?? 0) : 0,
      temperature: det.air_temperature,
      wind_speed: det.wind_speed,
      wind_dir: det.wind_from_direction,
    };
  } catch { return null; }
}

async function fetchWttr(): Promise<Sample | null> {
  try {
    const url = `https://wttr.in/${LAT},${LON}?format=j1`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const cc = (await res.json())?.current_condition?.[0];
    if (!cc) return null;
    return {
      source: 'wttr.in',
      cloud_cover: parseFloat(cc.cloudcover),
      precip_mm: parseFloat(cc.precipMM),
      temperature: parseFloat(cc.temp_C),
      wind_speed: parseFloat(cc.windspeedKmph) / 3.6,
      wind_dir: parseFloat(cc.winddirDegree),
    };
  } catch { return null; }
}

// Синтез WMO-кода, если детальный источник (Open-Meteo) недоступен.
function synthCode(cloud: number, precip: number, isSnow: boolean): number {
  if (precip > 0) {
    if (isSnow) return precip < 0.5 ? 71 : precip < 1.5 ? 73 : 75;
    return precip < 0.5 ? 51 : precip < 2 ? 61 : precip < 5 ? 63 : 65;
  }
  if (cloud < 20) return 0;
  if (cloud < 50) return 1;
  if (cloud < 85) return 2;
  return 3;
}

export async function GET() {
  const now = Date.now();
  const polar = getPolarAstronomicalData(new Date());

  // 1. Свежий кэш.
  if (cachedResponse && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json({ ...cachedResponse, polar, cached: true, last_updated: new Date(lastFetchTime).toISOString() });
  }

  // 2. Опрашиваем все источники параллельно.
  const settled = await Promise.allSettled([fetchOpenMeteo(), fetchMetNo(), fetchWttr()]);
  const samples: Sample[] = settled
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter((s): s is Sample => s != null && isNum(s.cloud_cover));

  if (samples.length > 0) {
    const om = samples.find((s) => s.source === 'open-meteo');

    const cloud_cover = clamp(median(pick(samples, 'cloud_cover')), 0, 100);
    const precipVals = pick(samples, 'precip_mm');
    const precipitation = precipVals.length ? Math.max(0, median(precipVals)) : 0;
    const tempVals = pick(samples, 'temperature');
    const temperature = tempVals.length ? median(tempVals) : undefined;
    const wind_speed_10m = clamp(median(pick(samples, 'wind_speed')), 0, 120);
    const wind_direction_10m = meanAngle(pick(samples, 'wind_dir'));

    // Снег: явный snowfall, либо холодно (<=0.5°C) при осадках.
    const snowHint = samples.some((s) => isNum(s.snowfall_cm) && (s.snowfall_cm as number) > 0);
    const isSnow = snowHint || (temperature !== undefined && temperature <= 0.5 && precipitation > 0);
    const snowfall = isSnow ? (om?.snowfall_cm ?? precipitation) : 0;

    // Код погоды: предпочитаем детальный Open-Meteo, иначе синтезируем.
    const weather_code = isNum(om?.weather_code) ? clamp(Math.round(om!.weather_code as number), 0, 99)
      : synthCode(cloud_cover, precipitation, isSnow);

    // Перекрёстная проверка: насколько источники сошлись по облачности.
    const cc = pick(samples, 'cloud_cover');
    const agreement = cc.length > 1 ? Math.round(100 - (Math.max(...cc) - Math.min(...cc))) : 100;

    const enriched = {
      current: {
        cloud_cover,
        cloud_cover_low: clamp(om?.cloud_low ?? (isSnow || precipitation > 0 ? cloud_cover : cloud_cover * 0.5), 0, 100),
        cloud_cover_mid: clamp(om?.cloud_mid ?? cloud_cover * 0.6, 0, 100),
        cloud_cover_high: clamp(om?.cloud_high ?? cloud_cover * 0.4, 0, 100),
        precipitation: Math.round(precipitation * 100) / 100,
        snowfall: Math.round((snowfall ?? 0) * 100) / 100,
        temperature: temperature !== undefined ? Math.round(temperature * 10) / 10 : undefined,
        weather_code,
        wind_speed_10m: Math.round(wind_speed_10m * 10) / 10,
        wind_direction_10m: Math.round(wind_direction_10m),
        is_fallback: false,
      },
      polar,
      sources: samples.map((s) => s.source),
      agreement, // 0..100 — согласие источников по облачности
    };

    cachedResponse = enriched;
    lastFetchTime = now;
    return NextResponse.json({ ...enriched, cached: false, last_updated: new Date().toISOString() });
  }

  // 3. Все источники недоступны — старый кэш.
  if (cachedResponse) {
    return NextResponse.json({ ...cachedResponse, polar, cached: true, fallback_used: true, last_updated: new Date(lastFetchTime).toISOString() });
  }

  // 4. Кэша нет — локальный сезонный расчёт.
  const fb = getSeasonalFallback();
  return NextResponse.json({ ...fb, polar, cached: false, fallback_used: true, seasonal_generated: true, last_updated: new Date().toISOString() });
}
