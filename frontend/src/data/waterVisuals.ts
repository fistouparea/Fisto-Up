import type { IconType } from 'react-icons';
import { LuBan, LuClock3, LuCloudRain, LuDroplet, LuDroplets, LuGlassWater, LuLeaf, LuMoon, LuShovel } from 'react-icons/lu';
import type { WaterStatus, WaterTipId } from '../api/types';

/** Color + icon per water status (never color alone). Classes are design tokens. */
export const WATER_STATUS_VISUALS: Record<WaterStatus, { icon: IconType; badge: string; card: string }> = {
  water_today: { icon: LuDroplets, badge: 'bg-sky-700 text-white', card: 'border-sky-600/40 bg-sky-50' },
  water_later: { icon: LuClock3, badge: 'bg-primary-700 text-white', card: 'border-primary-100 bg-surface-green' },
  skip: { icon: LuBan, badge: 'bg-success-700 text-white', card: 'border-success-600/40 bg-success-50' },
  check_soil: { icon: LuShovel, badge: 'bg-warning-400 text-ink-900', card: 'border-warning-400 bg-warning-50' },
  rainfed: { icon: LuCloudRain, badge: 'bg-ink-700 text-white', card: 'border-line bg-surface' },
};

export const WATER_TIP_ICONS: Record<WaterTipId, IconType> = {
  evening: LuMoon,
  mulch: LuLeaf,
  drip: LuDroplet,
  sprinkler: LuDroplets,
  light: LuGlassWater,
};
