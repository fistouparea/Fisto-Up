import type { IconType } from 'react-icons';
import {
  LuBeef,
  LuBell,
  LuCalendarDays,
  LuCloudSun,
  LuDroplets,
  LuHistory,
  LuHouse,
  LuLandmark,
  LuLifeBuoy,
  LuScanSearch,
  LuSettings,
  LuShoppingBasket,
  LuSprout,
  LuTractor,
  LuUsers,
  LuWheat,
} from 'react-icons/lu';
import { routes } from '../hooks/useHashRoute';

/** Mirrors the ids in backend/src/config/voiceIntents.ts (phrases live there); keep in sync. */
export const VOICE_INTENT_IDS = ['diagnose', 'weather', 'water', 'calendar', 'sell', 'buy', 'history', 'farm', 'notifications', 'help', 'settings', 'schemes', 'equipment', 'labour', 'livestock', 'home'] as const;
export type VoiceIntentId = (typeof VOICE_INTENT_IDS)[number];

/** Screen and icon per intent. Labels are in strings (voiceMode.intents). */
export const VOICE_INTENT_SCREENS: Record<VoiceIntentId, { href: string; icon: IconType }> = {
  diagnose: { href: routes.diagnose, icon: LuScanSearch },
  weather: { href: routes.weather, icon: LuCloudSun },
  water: { href: routes.water, icon: LuDroplets },
  calendar: { href: routes.calendar, icon: LuCalendarDays },
  sell: { href: routes.sell, icon: LuWheat },
  buy: { href: routes.market, icon: LuShoppingBasket },
  history: { href: routes.history, icon: LuHistory },
  farm: { href: routes.farm, icon: LuSprout },
  notifications: { href: routes.notifications, icon: LuBell },
  help: { href: routes.help, icon: LuLifeBuoy },
  settings: { href: routes.settings, icon: LuSettings },
  schemes: { href: routes.schemes, icon: LuLandmark },
  equipment: { href: routes.services('equipment'), icon: LuTractor },
  labour: { href: routes.services('labour'), icon: LuUsers },
  livestock: { href: routes.services('livestock'), icon: LuBeef },
  home: { href: routes.home, icon: LuHouse },
};

/** The choices offered when a request was not understood (most used first). */
export const VOICE_FALLBACK_CHOICES: readonly VoiceIntentId[] = ['diagnose', 'weather', 'water', 'sell', 'buy', 'schemes'];
