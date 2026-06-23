// ─────────────────────────────────────────────────────────────────────────────
//  ЛОКАЛЬНЫЙ ЗАПАСНОЙ ВАРИАНТ ПОГОДЫ (без сервера/интернета)
//
//  В десктоп-сборке (.exe) серверного маршрута /api/weather нет — он вырезается
//  при статическом экспорте. Также интернета может не быть на киоске. Тогда
//  клиент считает правдоподобную СЕЗОННУЮ погоду Норильска прямо здесь и НЕ
//  показывает ошибку: сцена всегда получает разумные данные о небе/осадках.
//
//  Формат результата совпадает с ответом /api/weather: { current, polar }.
// ─────────────────────────────────────────────────────────────────────────────

export interface WeatherCurrent {
  cloud_cover: number;     // 0..100
  weather_code: number;    // WMO 0..99
  wind_speed_10m: number;  // м/с
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
}

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

  if (isWinter) {
    if (r < 0.3) { weather_code = 73; cloud_cover = 98; wind_speed_10m = 12; }
    else if (r < 0.6) { weather_code = 75; cloud_cover = 100; wind_speed_10m = 18; }
    else { weather_code = 3; cloud_cover = 90; wind_speed_10m = 7; }
    wind_direction_10m = Math.random() > 0.5 ? 45 : 315;
  } else if (isTransitional) {
    if (r < 0.3) { weather_code = 71; cloud_cover = 80; wind_speed_10m = 6; }
    else if (r < 0.6) { weather_code = 51; cloud_cover = 85; wind_speed_10m = 5.5; }
    else { weather_code = 2; cloud_cover = 60; wind_speed_10m = 4.5; }
    wind_direction_10m = Math.floor(Math.random() * 360);
  } else {
    if (r < 0.25) { weather_code = 61; cloud_cover = 85; wind_speed_10m = 5; }
    else if (r < 0.55) { weather_code = 2; cloud_cover = 55; wind_speed_10m = 4; }
    else { weather_code = 1; cloud_cover = 25; wind_speed_10m = 3; }
    wind_direction_10m = Math.floor(Math.random() * 360);
  }

  return {
    current: { cloud_cover, weather_code, wind_speed_10m, wind_direction_10m, is_fallback: true },
    polar: getPolarAstronomicalData(date),
    is_fallback: true,
  };
}
