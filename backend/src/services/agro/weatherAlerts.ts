import { ALERT_RULES, ALERT_TEXTS } from '../../config/agroRules.js';
import type { StageId } from '../../data/cropCalendar.js';
import type { CropId } from '../../types/diagnosis.js';
import type { AlertType, DayWeather, Forecast, WeatherAlert } from '../../types/weather.js';

/** A crop in the field and its current stage (null = already harvested). */
export interface CropInField {
  crop: CropId;
  stage: StageId | null;
}

interface Trigger {
  type: AlertType;
  /** The measured value and the day it first crosses the warning threshold. */
  value: number;
  date: string;
  danger: boolean;
}

/** Rule-based weather alerts with crop- and stage-specific advice. Most serious first. */
export function evaluateAlerts(forecast: Forecast, crops: CropInField[]): WeatherAlert[] {
  const window = forecast.days.slice(0, ALERT_RULES.lookaheadDays + 1);
  const triggers = [
    thresholdTrigger('heatwave', window, (day) => day.tempMax, 'above', ALERT_RULES.heatwave.warningTempMaxC, ALERT_RULES.heatwave.dangerTempMaxC),
    thresholdTrigger('frost', window, (day) => day.tempMin, 'below', ALERT_RULES.frost.warningTempMinC, ALERT_RULES.frost.dangerTempMinC),
    thresholdTrigger('heavyRain', window, (day) => day.rainMm, 'above', ALERT_RULES.heavyRain.warningRainMm, ALERT_RULES.heavyRain.dangerRainMm),
    thresholdTrigger('strongWind', window, (day) => day.gustMax, 'above', ALERT_RULES.strongWind.warningGustKmh, ALERT_RULES.strongWind.dangerGustKmh),
    drySpellTrigger(forecast, crops),
  ].filter((trigger): trigger is Trigger => trigger !== null);

  return triggers
    .map((trigger) => toAlert(trigger, crops))
    .sort((a, b) => severityRank(b) - severityRank(a) || a.date.localeCompare(b.date));
}

function thresholdTrigger(
  type: AlertType,
  days: DayWeather[],
  measure: (day: DayWeather) => number,
  direction: 'above' | 'below',
  warningAt: number,
  dangerAt: number,
): Trigger | null {
  const crosses = (value: number, limit: number) => (direction === 'above' ? value >= limit : value <= limit);
  const firstDay = days.find((day) => crosses(measure(day), warningAt));
  if (!firstDay) return null;

  const values = days.map(measure);
  const extreme = direction === 'above' ? Math.max(...values) : Math.min(...values);
  return { type, value: Math.round(extreme), date: firstDay.date, danger: crosses(extreme, dangerAt) };
}

function drySpellTrigger(forecast: Forecast, crops: CropInField[]): Trigger | null {
  const growing = crops.some((crop) => crop.stage !== null && crop.stage !== 'harvest');
  const today = forecast.days[0];
  if (!growing || !today || forecast.past.length === 0) return null;

  const totalRain = [...forecast.past, ...forecast.days].reduce((sum, day) => sum + day.rainMm, 0);
  return totalRain <= ALERT_RULES.drySpell.maxTotalRainMm
    ? { type: 'drySpell', value: Math.round(totalRain), date: today.date, danger: false }
    : null;
}

function toAlert(trigger: Trigger, crops: CropInField[]): WeatherAlert {
  const texts = ALERT_TEXTS[trigger.type];
  const cropAdvice = crops.map((crop) => texts.byCrop?.[crop.crop]);
  const stageAdvice = crops.map((crop) => (crop.stage ? texts.byStage?.[crop.stage] : undefined));
  const advice = [...new Set([...cropAdvice, ...stageAdvice, ...texts.general].filter((line): line is string => Boolean(line)))];

  return {
    type: trigger.type,
    severity: trigger.danger ? 'danger' : 'warning',
    date: trigger.date,
    title: texts.title,
    detail: texts.detail.replace('{value}', String(trigger.value)),
    advice,
  };
}

function severityRank(alert: WeatherAlert): number {
  return alert.severity === 'danger' ? 1 : 0;
}
