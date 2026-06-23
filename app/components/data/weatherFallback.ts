// ─────────────────────────────────────────────────────────────────────────────
//  ПОГОДА: локальный фолбэк + прямой клиентский запрос (без сервера)
//
//  В десктоп-сборке (.exe) серверного маршрута /api/weather нет (он вырезается
//  при статическом экспорте). Поэтому клиент сам:
//    1) пробует /api/weather (на вебе — агрегированные данные из нескольких
//       источников с перекрёстной проверкой);
//    2) если его нет — напрямую опрашивает Open-Meteo (в Electron CORS отключён,
//       в браузере Open-Meteo отдаёт CORS-заголовки) — реальная погода даже в .exe;
//    3) если и это недоступно — считает правдоподобную сезонную погоду Норильска.
//
//  Формат current совпадает с ответом /api/weather (расширенный):
//  облачность + слои (low/mid/high), осадки (мм), снег (см), температура, ветер.
// ─────────────────────────────────────────────────────────────────────────────

export const LAT = 69.3558;
export const LON = 88.1893;

export interface WeatherCurrent {
  cloud_cover: number;        // 0..100 — общая облачность
  cloud_cover_low?: number;   // 0..100 — нижний ярус (дождевые/слоистые)
  cloud_cover_mid?: number;   // 0..100 — средний ярус
  cloud_cover_high?: number;  // 0..100 — верхний ярус (перистые)
  precipitation?: number;     // мм/ч — суммарные осадки (жидкий эквивалент)
  snowfall?: number;          // см/ч — снег
  temperature?: number;       // °C
  weather_code: number;       // WMO 0..99
  wind_speed_10m: number;     // м/с
  wind_direction_10m: number; // град
  is_fallback: boolean;
}

export interface PolarData {
  isPolarDay: boolean;
  isPolarNight: boolean;
  isWhiteNights: boolean;
  periodName: string;
  description: string;
  dayOfYear: number;
}

export interface WeatherResult {
  current: WeatherCurrent;
  polar: PolarData;
  is_fallback: boolean;
  sources?: string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Астрономическое состояние Норильска (полярный день/ночь, белые ночи) на дату.
 */
export function getPolarAstronomicalData(date: Date = new Date()): PolarData {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();    // 1-31
  const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const dayOfYear = monthDays[month] + day;

  const isPolarDay = dayOfYear >= 140 && dayOfYear <= 205;          // 20 мая – 24 июля
  const isPolarNight = dayOfYear >= 334 || dayOfYear <= 13;         // 30 ноя – 13 янв
  const isWhiteNights =
    (dayOfYear >= 117 && dayOfYear <= 139) || (dayOfYear >= 206 && dayOfYear <= 227);

  let periodName = 'Обычная смена дня и ночи';
  let description = 'Суточный ритм смены солнца и сумерек.';
  if (isPolarDay) {
    periodName = 'Полярный День';
    description = 'Солнце не заходит за горизонт 24 часа в сутки.';
  } else if (isPolarNight) {
    periodName = 'Полярная Ночь';
    description = 'Солнце не поднимается над горизонтом.';
  } else if (isWhiteNights) {
    periodName = 'Белые Ночи';
    description = 'Светлые сумерки всю ночь.';
  }

  return { isPolarDay, isPolarNight, isWhiteNights, periodName, description, dayOfYear };
}

/**
 * Сезонная погода Норильска (когда нет ни API, ни интернета).
 * Осадки/снег синтезируются из кода, чтобы расширенная логика рендера работала.
 */
export function getSeasonalFallback(date: Date = new Date()): WeatherResult {
  const month = date.getMonth();
  const isWinter = month <= 3 || month >= 10;          // ноя–апр
  const isTransitional = month === 4 || month === 8 || month === 9; // май, сен, окт

  const r = Math.random();
  let cloud_cover: number;
  let weather_code: number;
  let wind_speed_10m: number;
  let wind_direction_10m: number;
  let precipitation = 0;
  let snowfall = 0;
  let temperature: number;

  if (isWinter) {
    if (r < 0.3) { weather_code = 73; cloud_cover = 98; wind_speed_10m = 12; snowfall = 0.6; }
    else if (r < 0.6) { weather_code = 75; cloud_cover = 100; wind_speed_10m = 18; snowfall = 1.4; }
    else { weather_code = 3; cloud_cover = 90; wind_speed_10m = 7; }
    wind_direction_10m = Math.random() > 0.5 ? 45 : 315;
    temperature = -18 + Math.random() * 10;
  } else if (isTransitional) {
    if (r < 0.3) { weather_code = 71; cloud_cover = 80; wind_speed_10m = 6; snowfall = 0.3; }
    else if (r < 0.6) { weather_code = 51; cloud_cover = 85; wind_speed_10m = 5.5; precipitation = 0.4; }
    else { weather_code = 2; cloud_cover = 60; wind_speed_10m = 4.5; }
    wind_direction_10m = Math.floor(Math.random() * 360);
    temperature = -2 + Math.random() * 8;
  } else {
    if (r < 0.25) { weather_code = 61; cloud_cover = 85; wind_speed_10m = 5; precipitation = 1.2; }
    else if (r < 0.55) { weather_code = 2; cloud_cover = 55; wind_speed_10m = 4; }
    else { weather_code = 1; cloud_cover = 25; wind_speed_10m = 3; }
    wind_direction_10m = Math.floor(Math.random() * 360);
    temperature = 8 + Math.random() * 10;
  }

  return {
    current: {
      cloud_cover,
      cloud_cover_low: snowfall > 0 || precipitation > 0 ? cloud_cover : Math.round(cloud_cover * 0.5),
      cloud_cover_mid: Math.round(cloud_cover * 0.6),
      cloud_cover_high: Math.round(cloud_cover * 0.4),
      precipitation,
      snowfall,
      temperature,
      weather_code,
      wind_speed_10m,
      wind_direction_10m,
      is_fallback: true,
    },
    polar: getPolarAstronomicalData(date),
    is_fallback: true,
    sources: ['local-seasonal'],
  };
}

/**
 * Прямой клиентский запрос к Open-Meteo (без серверного маршрута).
 * Работает в Electron (.exe, CORS отключён) и в браузере (Open-Meteo шлёт CORS).
 * Возвращает расширенный current либо null при сбое/таймауте.
 */
export async function fetchOpenMeteoClient(signalTimeoutMs = 5000): Promise<WeatherResult | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,precipitation,rain,showers,snowfall,weather_code,temperature_2m,wind_speed_10m,wind_direction_10m` +
      `&wind_speed_unit=ms`;
    const res = await fetch(url, { signal: AbortSignal.timeout(signalTimeoutMs) });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data?.current;
    if (!c) return null;

    const precipitation = typeof c.precipitation === 'number'
      ? c.precipitation
      : (c.rain || 0) + (c.showers || 0) + (c.snowfall || 0);

    return {
      current: {
        cloud_cover: clamp(c.cloud_cover ?? 50, 0, 100),
        cloud_cover_low: c.cloud_cover_low,
        cloud_cover_mid: c.cloud_cover_mid,
        cloud_cover_high: c.cloud_cover_high,
        precipitation,
        snowfall: c.snowfall,
        temperature: c.temperature_2m,
        weather_code: c.weather_code ?? 2,
        wind_speed_10m: clamp(c.wind_speed_10m ?? 5, 0, 120),
        wind_direction_10m: ((((c.wind_direction_10m ?? 180) % 360) + 360) % 360),
        is_fallback: false,
      },
      polar: getPolarAstronomicalData(),
      is_fallback: false,
      sources: ['open-meteo-direct'],
    };
  } catch {
    return null;
  }
}
