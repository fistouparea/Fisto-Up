import type { IconType } from 'react-icons';
import { LuCloud, LuCloudDrizzle, LuCloudFog, LuCloudLightning, LuCloudRain, LuCloudSun, LuSnowflake, LuSun } from 'react-icons/lu';
import { hi } from '../strings/hi';

export interface WeatherVisual {
  icon: IconType;
  label: string;
  /** Token color class for the icon. */
  color: string;
}

/** WMO weather codes (used by Open-Meteo) → icon, Hindi label and color. */
export function weatherVisual(code: number): WeatherVisual {
  const { codes } = hi.weather;
  if (code === 0) return { icon: LuSun, label: codes.clear, color: 'text-accent-500' };
  if (code <= 2) return { icon: LuCloudSun, label: codes.partlyCloudy, color: 'text-accent-600' };
  if (code === 3) return { icon: LuCloud, label: codes.cloudy, color: 'text-ink-500' };
  if (code === 45 || code === 48) return { icon: LuCloudFog, label: codes.fog, color: 'text-ink-500' };
  if (code >= 51 && code <= 57) return { icon: LuCloudDrizzle, label: codes.drizzle, color: 'text-sky-600' };
  if ((code >= 61 && code <= 63) || code === 80 || code === 81) return { icon: LuCloudRain, label: codes.rain, color: 'text-sky-600' };
  if (code === 65 || code === 66 || code === 67 || code === 82) return { icon: LuCloudRain, label: codes.heavyRain, color: 'text-sky-700' };
  if (code >= 71 && code <= 77) return { icon: LuSnowflake, label: codes.snow, color: 'text-sky-600' };
  if (code >= 85 && code <= 86) return { icon: LuSnowflake, label: codes.snow, color: 'text-sky-600' };
  if (code >= 95 && code <= 99) return { icon: LuCloudLightning, label: codes.storm, color: 'text-ink-700' };
  return { icon: LuCloud, label: codes.cloudy, color: 'text-ink-500' };
}
