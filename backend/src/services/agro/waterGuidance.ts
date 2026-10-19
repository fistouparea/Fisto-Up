import { IRRIGATION_INTERVAL_DAYS, WATER_RULES, WATER_TEXTS } from '../../config/agroRules.js';
import type { FarmCrop, IrrigationSource } from '../../types/farm.js';
import type { WaterAdvice } from '../../types/water.js';
import type { Forecast } from '../../types/weather.js';
import { daysBetween } from '../../utils/dates.js';
import { getCropStage } from './cropStage.js';

interface WaterInput {
  crop: FarmCrop;
  irrigation: IrrigationSource | undefined;
  forecast: Forecast | null;
  today: string;
}

/**
 * Conservative, rule-based daily water advice for one crop (sandy soil).
 * Returns null for crops that are already harvested. All numbers and texts come from config/agroRules.ts.
 * Order matters: reasons NOT to water are checked first.
 */
export function waterAdvice({ crop, irrigation, forecast, today }: WaterInput): WaterAdvice | null {
  const { stage } = getCropStage(crop.crop, crop.sowingDate, today);
  if (stage === null) return null;

  const advise = (status: WaterAdvice['status'], reason: string, inDays?: number): WaterAdvice => ({
    crop: crop.crop,
    status,
    reason,
    ...(inDays !== undefined ? { inDays } : {}),
  });

  if (irrigation === 'rainfed') return advise('rainfed', WATER_TEXTS.rainfed);
  if (stage === 'harvest') return advise('skip', WATER_TEXTS.harvest);
  if (stage === 'sowing') return advise('check_soil', WATER_TEXTS.sowing);

  const interval = IRRIGATION_INTERVAL_DAYS[crop.crop][stage];
  if (interval === null || interval === undefined) {
    return advise('skip', WATER_TEXTS.noWaterStage[stage] ?? WATER_TEXTS.notNeeded);
  }

  if (!forecast) return advise('check_soil', WATER_TEXTS.noWeather);
  if (rainExpected(forecast)) return advise('skip', WATER_TEXTS.rainExpected);
  if (rainedRecently(forecast)) return advise('skip', WATER_TEXTS.recentRain);
  if (!crop.lastWateredOn) return advise('check_soil', WATER_TEXTS.unknownLastWatering);

  const daysSince = daysBetween(crop.lastWateredOn, today);
  if (daysSince <= 0) return advise('skip', WATER_TEXTS.wateredToday);

  const hot = (forecast.days[0]?.tempMax ?? 0) >= WATER_RULES.hotDay.tempMaxC;
  const dueIn = adjustedInterval(interval, forecast, hot) - daysSince;

  if (dueIn <= 0) {
    return advise('water_today', (hot ? WATER_TEXTS.dueHot : WATER_TEXTS.due).replace('{days}', String(daysSince)));
  }
  if (dueIn <= WATER_RULES.dueSoonDays) {
    return advise('water_later', WATER_TEXTS.dueSoon.replace('{days}', String(dueIn)), dueIn);
  }
  return advise('skip', WATER_TEXTS.notDue.replace('{days}', String(daysSince)));
}

function rainExpected(forecast: Forecast): boolean {
  const { nextDays, minRainMm, minChancePercent } = WATER_RULES.rainExpected;
  const days = forecast.days.slice(0, nextDays);
  const totalRain = days.reduce((sum, day) => sum + day.rainMm, 0);
  const likely = days.some((day) => day.rainChance >= minChancePercent);
  return totalRain >= minRainMm && likely;
}

function rainedRecently(forecast: Forecast): boolean {
  const { pastDays, minRainMm } = WATER_RULES.recentRain;
  return forecast.past.slice(-pastDays).reduce((sum, day) => sum + day.rainMm, 0) >= minRainMm;
}

/** Scales the interval by evapotranspiration of the next 3 days and shortens it on very hot days. */
function adjustedInterval(intervalDays: number, forecast: Forecast, hot: boolean): number {
  const et0Values = forecast.days.slice(0, 3).map((day) => day.et0).filter((value): value is number => value !== null && value > 0);
  const averageEt0 = et0Values.length > 0 ? et0Values.reduce((a, b) => a + b, 0) / et0Values.length : WATER_RULES.referenceEt0MmPerDay;
  const scaled = Math.round((intervalDays * WATER_RULES.referenceEt0MmPerDay) / averageEt0) - (hot ? WATER_RULES.hotDay.shortenByDays : 0);
  return Math.min(WATER_RULES.maxIntervalDays, Math.max(WATER_RULES.minIntervalDays, scaled));
}

