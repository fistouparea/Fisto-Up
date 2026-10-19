import type { IconType } from 'react-icons';
import { LuCloudRain, LuSun, LuThermometerSnowflake, LuThermometerSun, LuWind } from 'react-icons/lu';
import type { AlertType } from '../api/types';

export const ALERT_ICONS: Record<AlertType, IconType> = {
  heatwave: LuThermometerSun,
  frost: LuThermometerSnowflake,
  heavyRain: LuCloudRain,
  strongWind: LuWind,
  drySpell: LuSun,
};
