import { describe, expect, it } from 'vitest';
import { IRRIGATION_INTERVAL_DAYS, WATER_RULES, WATER_TEXTS } from '../src/config/agroRules.js';
import { CROP_CALENDARS } from '../src/data/cropCalendar.js';
import { waterAdvice } from '../src/services/agro/waterGuidance.js';
import type { FarmCrop } from '../src/types/farm.js';
import { addDays } from '../src/utils/dates.js';
import { makeForecast, TODAY } from './fakes/forecast.js';

/** Gehun sown 30 days ago is in the vegetative stage (interval 10 days at et0 = 5). */
const wheat = (lastWateredDaysAgo?: number): FarmCrop => ({
  crop: 'gehun',
  sowingDate: addDays(TODAY, -30),
  ...(lastWateredDaysAgo !== undefined ? { lastWateredOn: addDays(TODAY, -lastWateredDaysAgo) } : {}),
});
const calm = makeForecast(Array.from({ length: 8 }, () => ({ et0: WATER_RULES.referenceEt0MmPerDay })), [0, 0, 0, 0, 0, 0, 0]);

function advise(crop: FarmCrop, forecast = calm, irrigation: 'tubewell' | 'rainfed' = 'tubewell') {
  return waterAdvice({ crop, irrigation, forecast, today: TODAY });
}

describe('waterAdvice', () => {
  it('says "water today" once the interval has passed', () => {
    expect(advise(wheat(10))).toMatchObject({ status: 'water_today', reason: WATER_TEXTS.due.replace('{days}', '10') });
  });

  it('says "in N days" when watering is due soon', () => {
    expect(advise(wheat(8))).toMatchObject({ status: 'water_later', inDays: 2 });
    expect(advise(wheat(9))).toMatchObject({ status: 'water_later', inDays: 1 });
  });

  it('says "don\'t water today" when it was watered recently', () => {
    expect(advise(wheat(3))).toMatchObject({ status: 'skip', reason: WATER_TEXTS.notDue.replace('{days}', '3') });
    expect(advise(wheat(0))).toMatchObject({ status: 'skip', reason: WATER_TEXTS.wateredToday });
  });

  it('skips watering when good rain is likely in the next two days', () => {
    const rainy = makeForecast([{ rainMm: 6, rainChance: 70 }, { rainMm: 6, rainChance: 50 }]);
    expect(advise(wheat(15), rainy)).toMatchObject({ status: 'skip', reason: WATER_TEXTS.rainExpected });
  });

  it('does not skip for unlikely or tiny rain', () => {
    expect(advise(wheat(15), makeForecast([{ rainMm: 12, rainChance: 30 }]))?.status).toBe('water_today');
    expect(advise(wheat(15), makeForecast([{ rainMm: 2, rainChance: 90 }]))?.status).toBe('water_today');
  });

  it('skips watering after good recent rain', () => {
    const afterRain = makeForecast([], [0, 0, 0, 0, 10, 6, 0]);
    expect(advise(wheat(15), afterRain)).toMatchObject({ status: 'skip', reason: WATER_TEXTS.recentRain });
  });

  it('asks to check the soil when the last watering is unknown', () => {
    expect(advise(wheat())).toMatchObject({ status: 'check_soil', reason: WATER_TEXTS.unknownLastWatering });
  });

  it('asks to check the soil when there is no weather data (never guesses "water")', () => {
    const advice = waterAdvice({ crop: wheat(20), irrigation: 'tubewell', forecast: null, today: TODAY });
    expect(advice).toMatchObject({ status: 'check_soil', reason: WATER_TEXTS.noWeather });
  });

  it('waters earlier on hot, high-evaporation days', () => {
    const hot = makeForecast(Array.from({ length: 8 }, () => ({ tempMax: 41, et0: 7 })));
    // 10 days * 5/7 ≈ 7, minus 1 for heat = 6
    expect(advise(wheat(6), hot)).toMatchObject({ status: 'water_today', reason: WATER_TEXTS.dueHot.replace('{days}', '6') });
    expect(advise(wheat(5), hot)?.status).toBe('water_later');
  });

  it('keeps the adjusted interval within the safety limits', () => {
    const veryDry = makeForecast(Array.from({ length: 8 }, () => ({ et0: 50 })));
    expect(advise(wheat(WATER_RULES.minIntervalDays - 1), veryDry)?.status).not.toBe('water_today');
  });

  it('gives moisture-saving advice for rainfed farms', () => {
    expect(advise(wheat(20), calm, 'rainfed')).toMatchObject({ status: 'rainfed', reason: WATER_TEXTS.rainfed });
  });

  it('says not to water in stages where water harms (chana in flowering)', () => {
    const chana: FarmCrop = { crop: 'chana', sowingDate: addDays(TODAY, -60), lastWateredOn: addDays(TODAY, -40) };
    expect(IRRIGATION_INTERVAL_DAYS.chana.flowering).toBeNull();
    expect(advise(chana)).toMatchObject({ status: 'skip', reason: WATER_TEXTS.noWaterStage.flowering });
  });

  it('says not to water at harvest and gives nothing for finished crops', () => {
    const atHarvest: FarmCrop = { crop: 'gehun', sowingDate: addDays(TODAY, -125), lastWateredOn: addDays(TODAY, -30) };
    expect(advise(atHarvest)).toMatchObject({ status: 'skip', reason: WATER_TEXTS.harvest });

    const finished: FarmCrop = { crop: 'gehun', sowingDate: addDays(TODAY, -(CROP_CALENDARS.gehun.totalDays + 5)) };
    expect(advise(finished)).toBeNull();
  });

  it('just after sowing asks to keep light moisture', () => {
    expect(advise({ crop: 'gehun', sowingDate: TODAY })).toMatchObject({ status: 'check_soil', reason: WATER_TEXTS.sowing });
  });
});
