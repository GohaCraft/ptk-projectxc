// ─────────────────────────────────────────────────────────────────────────────
//  СИСТЕМА АВТО-ОПТИМИЗАЦИИ (perf tier)
//
//  Чистая логика выбора уровня качества — без React/Three, поэтому её легко
//  тестировать и переиспользовать. Компонент только дёргает эти функции.
//
//  Два уровня регулировки:
//   • PerformanceMonitor (drei) плавно меняет РАЗРЕШЕНИЕ (DPR) каждый кадр;
//   • этот модуль — ГРУБЫЙ запасной шаг: при стойко низком FPS понижает тир
//     (high → medium → low), что отключает тени и тяжёлые эффекты.
// ─────────────────────────────────────────────────────────────────────────────

export type PerfTier = 'low' | 'medium' | 'high';

// Порог «стойко низкого» FPS, ниже которого имеет смысл понижать тир.
export const LOW_FPS_THRESHOLD = 38;
// Сколько последних замеров (≈1 сек каждый) подряд должны быть низкими.
export const LOW_FPS_SAMPLES = 5;
// Размер хранимой истории замеров FPS.
export const FPS_HISTORY_SIZE = 6;

// Видеоядра/софт-рендер, которые считаем слабыми
// (число ядер CPU не отражает мощность GPU, поэтому проверяем рендерер отдельно).
const WEAK_GPU_RE = /Intel|Microsoft Basic|SwiftShader|llvmpipe|Mali|Adreno|PowerVR|UHD|HD Graphics/i;

/** true, если строка рендерера GPU похожа на встройку/программный рендер. */
export function isWeakGpu(renderer: string | null | undefined): boolean {
  return !!renderer && WEAK_GPU_RE.test(renderer);
}

export interface DeviceProfile {
  isMobile: boolean;
  cores: number;
  weakGpu: boolean;
}

/** Стартовый уровень качества по характеристикам устройства. */
export function pickInitialTier({ isMobile, cores, weakGpu }: DeviceProfile): PerfTier {
  if (isMobile || cores < 4) return 'low';
  if (weakGpu || cores < 12) return 'medium';
  return 'high';
}

/** Следующий тир вниз, либо null если понижать уже некуда. */
export function nextLowerTier(tier: PerfTier): PerfTier | null {
  if (tier === 'high') return 'medium';
  if (tier === 'medium') return 'low';
  return null;
}

/** Верхняя планка DPR для тира (PerformanceMonitor двигается в её пределах). */
export function maxDprForTier(tier: PerfTier): number {
  // Чуть резче (в меру): на слабом GPU допускаем лёгкий суперсэмплинг —
  // PerformanceMonitor сам опустит DPR, если FPS просядет.
  return tier === 'low' ? 1.1 : tier === 'medium' ? 1.4 : 1.75;
}

/**
 * Стоит ли понижать тир по истории FPS.
 * Да — если есть как минимум LOW_FPS_SAMPLES валидных замеров подряд,
 * и все они ниже порога.
 */
export function shouldDowngrade(history: number[]): boolean {
  if (history.length < LOW_FPS_SAMPLES) return false;
  const recent = history.slice(-LOW_FPS_SAMPLES);
  return recent.every((v) => v > 0 && v < LOW_FPS_THRESHOLD);
}
