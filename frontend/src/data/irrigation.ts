import type { IconType } from 'react-icons';
import { LuCloudRain, LuCylinder, LuDroplets, LuWaves } from 'react-icons/lu';
import type { IrrigationSource } from '../api/types';
import { hi } from '../strings/hi';

export const IRRIGATION_OPTIONS: Record<IrrigationSource, { label: string; icon: IconType }> = {
  tubewell: { label: hi.farm.irrigation.tubewell, icon: LuDroplets },
  canal: { label: hi.farm.irrigation.canal, icon: LuWaves },
  rainfed: { label: hi.farm.irrigation.rainfed, icon: LuCloudRain },
  tanka: { label: hi.farm.irrigation.tanka, icon: LuCylinder },
};
