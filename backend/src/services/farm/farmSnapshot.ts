import { FOLLOW_UP_RULES } from '../../config/notificationRules.js';
import type { StoredFarmProfile } from '../../types/farm.js';
import type { FollowUpDue } from '../../types/history.js';
import type { AppNotification } from '../../types/notifications.js';
import type { WaterAdvice } from '../../types/water.js';
import type { Forecast, WeatherAlert } from '../../types/weather.js';
import { todayInIndia } from '../../utils/dates.js';
import { getCropStage, type CropStageInfo } from '../agro/cropStage.js';
import { waterAdvice } from '../agro/waterGuidance.js';
import { evaluateAlerts } from '../agro/weatherAlerts.js';
import type { HistoryRepository } from '../history/historyRepository.js';
import { buildNotifications } from '../notifications/buildNotifications.js';
import { loadForecastOrNull } from '../weather/loadForecast.js';
import type { WeatherProvider } from '../weather/weatherProvider.js';
import type { FarmProfileRepository } from './farmProfileRepository.js';
import { logger } from '../../observability/logger.js';

export interface FarmSnapshotDeps {
  farmProfiles: FarmProfileRepository;
  history: HistoryRepository | null;
  weather: WeatherProvider | null;
}

/** Everything the app knows about one farm today. Shared by the dashboard, notifications and push. */
export interface FarmSnapshot {
  today: string;
  profile: StoredFarmProfile | null;
  /** null when there is no location or the weather service is down. */
  forecast: Forecast | null;
  alerts: WeatherAlert[];
  crops: (CropStageInfo & { sowingDate: string })[];
  water: WaterAdvice[];
  followUps: FollowUpDue[];
  notifications: AppNotification[];
}

const MS_PER_DAY = 86_400_000;

export async function buildFarmSnapshot(deps: FarmSnapshotDeps, deviceId: string, now: Date = new Date()): Promise<FarmSnapshot> {
  const today = todayInIndia(now);
  const [profile, followUps] = await Promise.all([deps.farmProfiles.get(deviceId), loadFollowUps(deps.history, deviceId, now)]);
  const forecast = profile ? await loadForecastOrNull(deps.weather, profile.location) : null;

  const crops = (profile?.crops ?? []).map((crop) => ({ ...getCropStage(crop.crop, crop.sowingDate, today), sowingDate: crop.sowingDate }));
  const alerts = forecast ? evaluateAlerts(forecast, crops) : [];
  const water = (profile?.crops ?? [])
    .map((crop) => waterAdvice({ crop, irrigation: profile?.irrigation, forecast, today }))
    .filter((advice): advice is WaterAdvice => advice !== null);

  return {
    today,
    profile,
    forecast,
    alerts,
    crops,
    water,
    followUps,
    notifications: buildNotifications({ alerts, crops, followUps, today }),
  };
}

/** Follow-ups are a bonus: if history storage is missing or down, the rest still works. */
async function loadFollowUps(history: HistoryRepository | null, deviceId: string, now: Date): Promise<FollowUpDue[]> {
  if (!history) return [];
  const to = new Date(now.getTime() - FOLLOW_UP_RULES.afterDays * MS_PER_DAY);
  const from = new Date(now.getTime() - FOLLOW_UP_RULES.maxAgeDays * MS_PER_DAY);
  try {
    return await history.listFollowUpsDue(deviceId, from, to);
  } catch (error) {
    logger.error({ err: error }, 'follow-ups unavailable');
    return [];
  }
}
