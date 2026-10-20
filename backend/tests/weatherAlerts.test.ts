import { describe, expect, it } from 'vitest';
import { ALERT_RULES, ALERT_TEXTS } from '../src/config/agroRules.js';
import { evaluateAlerts, type CropInField } from '../src/services/agro/weatherAlerts.js';
import { makeForecast, TODAY } from './fakes/forecast.js';
import { addDays } from '../src/utils/dates.js';

const growingChana: CropInField[] = [{ crop: 'chana', stage: 'flowering' }];

describe('evaluateAlerts', () => {
  it('gives no alert for calm weather with recent rain', () => {
    expect(evaluateAlerts(makeForecast([], [5, 0, 0, 0, 0, 0, 0]), growingChana)).toEqual([]);
  });

  it.each([
    ['heatwave', { tempMax: ALERT_RULES.heatwave.warningTempMaxC }, 'warning'],
    ['heatwave', { tempMax: ALERT_RULES.heatwave.dangerTempMaxC }, 'danger'],
    ['frost', { tempMin: ALERT_RULES.frost.warningTempMinC }, 'warning'],
    ['frost', { tempMin: ALERT_RULES.frost.dangerTempMinC }, 'danger'],
    ['heavyRain', { rainMm: ALERT_RULES.heavyRain.warningRainMm }, 'warning'],
    ['heavyRain', { rainMm: ALERT_RULES.heavyRain.dangerRainMm }, 'danger'],
    ['strongWind', { gustMax: ALERT_RULES.strongWind.warningGustKmh }, 'warning'],
    ['strongWind', { gustMax: ALERT_RULES.strongWind.dangerGustKmh }, 'danger'],
  ] as const)('raises %s at the threshold %j as %s', (type, dayOverride, severity) => {
    const alerts = evaluateAlerts(makeForecast([{}, dayOverride], [5]), growingChana);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ type, severity, date: addDays(TODAY, 1), title: ALERT_TEXTS[type].title });
  });

  it('stays quiet just below each threshold', () => {
    const forecast = makeForecast(
      [
        {
          tempMax: ALERT_RULES.heatwave.warningTempMaxC - 0.5,
          tempMin: ALERT_RULES.frost.warningTempMinC + 0.5,
          rainMm: ALERT_RULES.heavyRain.warningRainMm - 1,
          gustMax: ALERT_RULES.strongWind.warningGustKmh - 1,
        },
      ],
      [5],
    );
    expect(evaluateAlerts(forecast, growingChana)).toEqual([]);
  });

  it('only looks a few days ahead', () => {
    const later = Array.from({ length: ALERT_RULES.lookaheadDays + 1 }, () => ({}));
    const alerts = evaluateAlerts(makeForecast([...later, { tempMax: 46 }], [5]), growingChana);
    expect(alerts).toEqual([]);
  });

  it('shows the hottest value in the detail line', () => {
    const [alert] = evaluateAlerts(makeForecast([{ tempMax: 43 }, { tempMax: 44.6 }], [5]), growingChana);
    expect(alert?.detail).toBe('45°C तक गर्मी');
  });

  it('adds crop- and stage-specific advice before the general advice', () => {
    const [frost] = evaluateAlerts(makeForecast([{ tempMin: 3 }], [5]), [{ crop: 'jeera', stage: 'flowering' }]);
    expect(frost?.advice[0]).toBe(ALERT_TEXTS.frost.byCrop?.jeera);

    const [heat] = evaluateAlerts(makeForecast([{ tempMax: 43 }], [5]), growingChana);
    expect(heat?.advice[0]).toBe(ALERT_TEXTS.heatwave.byStage?.flowering);
    expect(heat?.advice).toEqual(expect.arrayContaining(ALERT_TEXTS.heatwave.general));
  });

  it('raises a dry spell only while a crop is growing', () => {
    const dry = makeForecast();
    expect(evaluateAlerts(dry, growingChana).map((alert) => alert.type)).toEqual(['drySpell']);
    expect(evaluateAlerts(dry, [])).toEqual([]);
    expect(evaluateAlerts(dry, [{ crop: 'chana', stage: null }])).toEqual([]);
    expect(evaluateAlerts(dry, [{ crop: 'chana', stage: 'harvest' }])).toEqual([]);
  });

  it('lists danger alerts first', () => {
    const forecast = makeForecast([{ gustMax: 55 }, { tempMax: 46 }], [5]);
    expect(evaluateAlerts(forecast, growingChana).map((alert) => [alert.type, alert.severity])).toEqual([
      ['heatwave', 'danger'],
      ['strongWind', 'warning'],
    ]);
  });
});

describe('alert watering advice agrees with the water rules', () => {
  const frost = makeForecast([{ tempMin: 3 }], [5]);
  const frostWatering = ALERT_TEXTS.frost.watering?.[0] ?? '';

  it('drops "irrigate" advice when every growing crop is in a no-water stage, and says so', () => {
    const [alert] = evaluateAlerts(frost, [{ crop: 'chana', stage: 'flowering' }]);
    expect(alert?.advice).not.toContain(frostWatering);
    expect(alert?.advice).toContain('चना में अभी सिंचाई न करें।');
  });

  it('keeps "irrigate" advice for crops that may be watered, naming the exceptions', () => {
    const [alert] = evaluateAlerts(frost, [
      { crop: 'chana', stage: 'flowering' },
      { crop: 'gehun', stage: 'vegetative' },
    ]);
    expect(alert?.advice).toContain(frostWatering);
    expect(alert?.advice).toContain('चना में अभी सिंचाई न करें।');
  });

  it('adds no exception when all crops may be watered', () => {
    const [alert] = evaluateAlerts(frost, [{ crop: 'gehun', stage: 'vegetative' }]);
    expect(alert?.advice).toContain(frostWatering);
    expect(alert?.advice.some((line) => line.includes('अभी सिंचाई न करें'))).toBe(false);
  });
});
