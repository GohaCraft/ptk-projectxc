// 100% Offline Shared Weather State to prevent circular dependency tree crashes
export interface WeatherStateValue {
  isNight: boolean;
  rain: number;
  snow: number;
}

export const weatherState = {
  isNight: false,
  rain: 0,
  snow: 0,
  listeners: new Set<(state: WeatherStateValue) => void>(),
  
  setState(val: WeatherStateValue) {
    if (this.isNight !== val.isNight || this.rain !== val.rain || this.snow !== val.snow) {
      this.isNight = val.isNight;
      this.rain = val.rain;
      this.snow = val.snow;
      setTimeout(() => {
        this.listeners.forEach((l) => l(val));
      }, 0);
    }
  },
  
  subscribe(l: (state: WeatherStateValue) => void) {
    this.listeners.add(l);
    setTimeout(() => {
      l({ isNight: this.isNight, rain: this.rain, snow: this.snow });
    }, 0);
    return () => {
      this.listeners.delete(l);
    };
  }
};
