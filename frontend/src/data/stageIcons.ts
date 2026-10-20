import type { IconType } from 'react-icons';
import { LuFlower2, LuLeaf, LuScissors, LuShovel, LuSprout, LuWheat } from 'react-icons/lu';
import type { StageId } from '../api/types';

export const STAGE_ICONS: Record<StageId, IconType> = {
  sowing: LuShovel,
  germination: LuSprout,
  vegetative: LuLeaf,
  flowering: LuFlower2,
  grainFilling: LuWheat,
  harvest: LuScissors,
};
