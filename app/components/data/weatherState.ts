// 100% Offline Shared Weather State to prevent circular dependency tree crashes
export type WeatherMode = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';

export interface WeatherStateValue {
  isNight: boolean;
  rain: number;       // 0..1
  snow: number;       // 0..1
  storm: number;      // 0..1 (гроза/молнии)
  cloudCover: number; // 0..100
  manual: WeatherMode | null; // ручной выбор; null = по API
}

// Пресеты для ручного выбора погоды
// Шкала rain/snow совпадает с API (0..5)
export const WEATHER_PRESETS: Record<WeatherMode, { rain: number; snow: number; storm: number; cloudCover: number }> = {
  clear:  { rain: 0, snow: 0, storm: 0, cloudCover: 6 },
  cloudy: { rain: 0, snow: 0, storm: 0, cloudCover: 85 },
  rain:   { rain: 3, snow: 0, storm: 0, cloudCover: 92 },
  snow:   { rain: 0, snow: 4, storm: 0, cloudCover: 96 },
  storm:  { rain: 5, snow: 0, storm: 1, cloudCover: 100 },
};

export const weatherState = {
  isNight: false,
  rain: 0,
  snow: 0,
  storm: 0,
  cloudCover: 50,
  manual: null as WeatherMode | null,
  listeners: new Set<(state: WeatherStateValue) => void>(),

  _snapshot(): WeatherStateValue {
    return { isNight: this.isNight, rain: this.rain, snow: this.snow, storm: this.storm, cloudCover: this.cloudCover, manual: this.manual };
  },

  _notify() {
    const snap = this._snapshot();
    setTimeout(() => { this.listeners.forEach((l) => l(snap)); }, 0);
  },

  // Обновление из API (DynamicSun). Если включён ручной режим — берём только время суток.
  setState(val: Partial<WeatherStateValue>) {
    if (this.manual) {
      if (val.isNight !== undefined && val.isNight !== this.isNight) {
        this.isNight = val.isNight;
        this._notify();
      }
      return;
    }
    let changed = false;
    (['isNight', 'rain', 'snow', 'storm', 'cloudCover'] as const).forEach((k) => {
      if (val[k] !== undefined && (this as any)[k] !== val[k]) { (this as any)[k] = val[k]; changed = true; }
    });
    if (changed) this._notify();
  },

  // Ручной выбор погоды из UI. mode=null -> вернуться к авто (API).
  setManual(mode: WeatherMode | null) {
    this.manual = mode;
    if (mode) {
      const p = WEATHER_PRESETS[mode];
      this.rain = p.rain; this.snow = p.snow; this.storm = p.storm; this.cloudCover = p.cloudCover;
    }
    this._notify();
  },

  subscribe(l: (state: WeatherStateValue) => void) {
    this.listeners.add(l);
    const snap = this._snapshot();
    setTimeout(() => { l(snap); }, 0);
    return () => { this.listeners.delete(l); };
  }
};
