import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
//  ПОГОДА ДЛЯ НОРИЛЬСКА (для неба, облаков и солнца в 3D-сцене)
//
//  Безопасность: запросы идут на ОДИН фиксированный домен Open-Meteo с
//  захардкоженными координатами. Пользовательский ввод в URL не попадает —
//  SSRF и инъекции параметров невозможны. Все числовые значения из ответа
//  внешнего API нормализуются (clamp) в безопасные диапазоны, чтобы кривой
//  ответ не сломал шейдеры/математику сцены.
// ─────────────────────────────────────────────────────────────────────────────

// Координаты Норильска — фиксированы, не зависят от запроса.
const LAT = 69.3558;
const LON = 88.1893;

// Внутренний кэш (на инстанс): бережёт лимиты API и держит сцену стабильной.
let cachedResponse: any = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут
const FETCH_TIMEOUT_MS = 4000;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const num = (v: any, fallback: number) => (typeof v === 'number' && isFinite(v) ? v : fallback);

/**
 * Приводит любые входные значения погоды к безопасным диапазонам.
 * cloud_cover 0–100 %, weather_code 0–99, ветер 0–120 м/с, направление 0–360°.
 */
function normalize(cloud: any, code: any, wind: any, dir: any) {
  return {
    cloud_cover: clamp(num(cloud, 50), 0, 100),
    weather_code: clamp(Math.round(num(code, 2)), 0, 99),
    wind_speed_10m: clamp(num(wind, 5), 0, 120),
    wind_direction_10m: ((num(dir, 180) % 360) + 360) % 360,
    is_fallback: false,
  };
}

/**
 * Вычисляет астрономическое состояние в Норильске на текущую дату.
 * В Норильске (69.3558° N, 88.1893° E) наблюдаются:
 * - Полярный День: с 20 мая по 24 июля
 * - Полярная Ночь: с 30 ноября по 13 января
 * - Белые Ночи: с 27 апреля по 19 мая и с 25 июля по 15 августа
 */
function getPolarAstronomicalData(date: Date) {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();    // 1-31

  // Перевод в условный день года (приблизительно для невисокосного года)
  const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const dayOfYear = monthDays[month] + day;

  const isPolarDay = dayOfYear >= 140 && dayOfYear <= 205;          // 20 мая – 24 июля
  const isPolarNight = dayOfYear >= 334 || dayOfYear <= 13;         // 30 ноя – 13 янв
  const isWhiteNights =                                             // 27 апр – 19 мая, 25 июля – 15 авг
    (dayOfYear >= 117 && dayOfYear <= 139) || (dayOfYear >= 206 && dayOfYear <= 227);

  let periodName = 'Обычная смена дня и ночи';
  let description = 'Суточный ритм смены солнца и сумерек.';

  if (isPolarDay) {
    periodName = 'Полярный День';
    description = 'Солнце не заходит за горизонт 24 часа в сутки. Круглосуточный яркий свет.';
  } else if (isPolarNight) {
    periodName = 'Полярная Ночь';
    description = 'Солнце не поднимается над горизонтом. Круглосуточные сумерки и темнота.';
  } else if (isWhiteNights) {
    periodName = 'Белые Ночи';
    description = 'Светлые сумерки всю ночь, солнце опускается за горизонт незначительно.';
  }

  return { isPolarDay, isPolarNight, isWhiteNights, periodName, description, dayOfYear };
}

/**
 * Реалистичная погода Норильска по сезонам, если внешнее API недоступно.
 */
function getSeasonalFallback() {
  const month = new Date().getMonth(); // 0 (Янв) – 11 (Дек)

  const isWinter = month <= 3 || month >= 10;          // ноя–апр (включая март)
  const isTransitional = month === 4 || month === 8 || month === 9; // май, сен, окт

  const r = Math.random();
  let cloud_cover: number;
  let weather_code: number;
  let wind_speed_10m: number;
  let wind_direction_10m: number;

  if (isWinter) {
    if (r < 0.3) { weather_code = 73; cloud_cover = 98; wind_speed_10m = 12; }       // умеренный снег
    else if (r < 0.6) { weather_code = 75; cloud_cover = 100; wind_speed_10m = 18; } // сильный снег
    else { weather_code = 3; cloud_cover = 90; wind_speed_10m = 7; }                 // пасмурно
    wind_direction_10m = Math.random() > 0.5 ? 45 : 315;
  } else if (isTransitional) {
    if (r < 0.3) { weather_code = 71; cloud_cover = 80; wind_speed_10m = 6; }         // небольшой снег
    else if (r < 0.6) { weather_code = 51; cloud_cover = 85; wind_speed_10m = 5.5; }  // морось
    else { weather_code = 2; cloud_cover = 60; wind_speed_10m = 4.5; }               // переменная облачность
    wind_direction_10m = Math.floor(Math.random() * 360);
  } else {
    // Короткое норильское лето
    if (r < 0.25) { weather_code = 61; cloud_cover = 85; wind_speed_10m = 5; }        // дождь
    else if (r < 0.55) { weather_code = 2; cloud_cover = 55; wind_speed_10m = 4; }    // облачно
    else { weather_code = 1; cloud_cover = 25; wind_speed_10m = 3; }                 // ясно
    wind_direction_10m = Math.floor(Math.random() * 360);
  }

  return { cloud_cover, weather_code, wind_speed_10m, wind_direction_10m, is_fallback: true };
}

export async function GET() {
  const now = Date.now();
  const polarData = getPolarAstronomicalData(new Date());

  // 1. Свежий кэш — отдаём сразу (бережём лимиты API).
  if (cachedResponse && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cachedResponse,
      polar: polarData,
      cached: true,
      last_updated: new Date(lastFetchTime).toISOString(),
    });
  }

  // Два независимых источника Open-Meteo (детальный + упрощённый) для надёжности.
  const apiSources = [
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=cloud_cover,weather_code,wind_speed_10m,wind_direction_10m`,
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current_weather=true`,
  ];

  for (const url of apiSources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) continue;

      const data = await res.json();
      let current: ReturnType<typeof normalize> | null = null;

      if (data && data.current) {
        const c = data.current;
        current = normalize(c.cloud_cover, c.weather_code, c.wind_speed_10m, c.wind_direction_10m);
      } else if (data && data.current_weather) {
        const c = data.current_weather;
        // Упрощённый ответ не содержит облачности — оцениваем по коду погоды.
        const code = num(c.weathercode, 2);
        const cloudGuess = code >= 3 ? 100 : code >= 1 ? 40 : 10;
        current = normalize(cloudGuess, code, c.windspeed, c.winddirection);
      }

      if (current) {
        const enriched = { current, polar: polarData, api_source: url.split('?')[0] };
        cachedResponse = enriched;
        lastFetchTime = now;
        return NextResponse.json({
          ...enriched,
          cached: false,
          last_updated: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn(`[Weather] источник недоступен: ${url.split('?')[0]} — пробуем следующий`, e);
    }
  }

  // 2. Внешнее API недоступно — отдаём прошлый кэш, если он есть.
  if (cachedResponse) {
    return NextResponse.json({
      ...cachedResponse,
      polar: polarData,
      cached: true,
      fallback_used: true,
      last_updated: new Date(lastFetchTime).toISOString(),
    });
  }

  // 3. Кэша нет — генерируем правдоподобную сезонную погоду Норильска.
  return NextResponse.json({
    current: getSeasonalFallback(),
    polar: polarData,
    cached: false,
    fallback_used: true,
    seasonal_generated: true,
    last_updated: new Date().toISOString(),
  });
}
