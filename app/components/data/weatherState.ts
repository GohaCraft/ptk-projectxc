// 100% Offline Shared Weather State to prevent circular dependency tree crashes
export type WeatherMode = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog';

export interface WeatherStateValue {
  isNight: boolean;
  rain: number;       // 0..5
  snow: number;       // 0..5
  storm: number;      // 0..1 (гроза/молнии)
  fog: number;        // 0..1 (туман — плотность)
  cloudCover: number; // 0..100
  windSpeed: number;  // м/с — реальный ветер (наклон дождя/снега, дрейф облаков)
  windDir: number;    // градусы (откуда дует), 0..360
  manual: WeatherMode | null; // ручной выбор; null = по API
}

// Пресеты для ручного выбора погоды
// Шкала rain/snow совпадает с API (0..5)
export const WEATHER_PRESETS: Record<WeatherMode, { rain: number; snow: number; storm: number; fog: number; cloudCover: number }> = {
  clear:  { rain: 0, snow: 0, storm: 0, fog: 0,   cloudCover: 6 },
  cloudy: { rain: 0, snow: 0, storm: 0, fog: 0,   cloudCover: 85 },
  rain:   { rain: 3, snow: 0, storm: 0, fog: 0,   cloudCover: 92 },
  snow:   { rain: 0, snow: 4, storm: 0, fog: 0,   cloudCover: 96 },
  storm:  { rain: 5, snow: 0, storm: 1, fog: 0,   cloudCover: 100 },
  fog:    { rain: 0, snow: 0, storm: 0, fog: 1,   cloudCover: 70 },
};

export const weatherState = {
  isNight: false,
  rain: 0,
  snow: 0,
  storm: 0,
  fog: 0,
  cloudCover: 50,
  windSpeed: 3,
  windDir: 180,
  manual: null as WeatherMode | null,
  listeners: new Set<(state: WeatherStateValue) => void>(),

  _snapshot(): WeatherStateValue {
    return {
      isNight: this.isNight, rain: this.rain, snow: this.snow, storm: this.storm, fog: this.fog,
      cloudCover: this.cloudCover, windSpeed: this.windSpeed, windDir: this.windDir, manual: this.manual,
    };
  },

  _notify() {
    const snap = this._snapshot();
    setTimeout(() => { this.listeners.forEach((l) => l(snap)); }, 0);
  },

  // Обновление из API (DynamicSun). Время суток и ветер — это окружение, поэтому
  // применяются ВСЕГДА (даже в ручном режиме). Осадки/туман/облачность — только
  // когда погода не выбрана вручную.
  setState(val: Partial<WeatherStateValue>) {
    let changed = false;
    (['isNight', 'windSpeed', 'windDir'] as const).forEach((k) => {
      if (val[k] !== undefined && (this as any)[k] !== val[k]) { (this as any)[k] = val[k]; changed = true; }
    });
    if (!this.manual) {
      (['rain', 'snow', 'storm', 'fog', 'cloudCover'] as const).forEach((k) => {
        if (val[k] !== undefined && (this as any)[k] !== val[k]) { (this as any)[k] = val[k]; changed = true; }
      });
    }
    if (changed) this._notify();
  },

  // Ручной выбор погоды из UI. mode=null -> вернуться к авто (API).
  setManual(mode: WeatherMode | null) {
    this.manual = mode;
    if (mode) {
      const p = WEATHER_PRESETS[mode];
      this.rain = p.rain; this.snow = p.snow; this.storm = p.storm; this.fog = p.fog; this.cloudCover = p.cloudCover;
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
