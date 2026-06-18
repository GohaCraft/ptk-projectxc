"use client";
import { useState, useEffect } from 'react';

export function useWeather() {
  const [weather, setWeather] = useState({
    cloudCover: 50,
    rain: 0,
    snow: 0,
    windSpeed: 0,
    windDir: 0,
    loading: true,
    error: null as string | null
  });

  useEffect(() => {
    const updateWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=69.3558&longitude=88.1893&current=cloud_cover,weather_code,wind_speed_10m,wind_direction_10m');
        const data = await res.json();
        
        let rain = 0;
        let snow = 0;
        
        if (data?.current) {
          const code = data.current.weather_code || 0;
          if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
             rain = (code === 65 || code === 82) ? 5 : (code === 61 || code === 51) ? 1 : 2;
          }
          if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
             snow = (code === 75 || code === 86) ? 5 : (code === 71) ? 1 : 2;
          }
          
          setWeather({
            cloudCover: data.current.cloud_cover || 50,
            rain,
            snow,
            windSpeed: data.current.wind_speed_10m || 0,
            windDir: data.current.wind_direction_10m || 0,
            loading: false,
            error: null
          });
        }
      } catch (e: any) {
        setWeather(prev => ({ ...prev, loading: false, error: e.message }));
      }
    };

    updateWeather();
    const interval = setInterval(updateWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return weather;
}
