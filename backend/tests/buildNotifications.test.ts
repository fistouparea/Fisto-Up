import { describe, expect, it } from 'vitest';
import { getCropStage } from '../src/services/agro/cropStage.js';
import { buildNotifications } from '../src/services/notifications/buildNotifications.js';
import type { WeatherAlert } from '../src/types/weather.js';
import { addDays } from '../src/utils/dates.js';
import { TODAY } from './fakes/forecast.js';

const alert = (type: WeatherAlert['type'], severity: WeatherAlert['severity']): WeatherAlert => ({
  type,
  severity,
  date: addDays(TODAY, 1),
  title: type,
  detail: 'detail',
  advice: ['first advice', 'second advice'],
});

const crop = (name: 'chana' | 'gehun', daysAgo: number) => {
  const sowingDate = addDays(TODAY, -daysAgo);
  return { ...getCropStage(name, sowingDate, TODAY), sowingDate };
};

describe('buildNotifications', () => {
  it('orders danger alerts first, then follow-ups, then tasks', () => {
    const items = buildNotifications({
      alerts: [alert('strongWind', 'warning'), alert('heatwave', 'danger')],
      crops: [crop('gehun', 30)],
      followUps: [{ id: 'd1', crop: 'chana', problemName: 'झुलसा', createdAt: new Date('2026-11-05T05:00:00Z') }],
      today: TODAY,
    });

    expect(items.map((item) => item.id)).toEqual([
      `alert:heatwave:${addDays(TODAY, 1)}`,
      `alert:strongWind:${addDays(TODAY, 1)}`,
      'followup:d1',
      `task:gehun:vegetative:${addDays(TODAY, -30)}`,
    ]);
  });

  it('writes short Hindi texts and links to the right screen', () => {
    const [alertItem, followUp, task] = buildNotifications({
      alerts: [alert('frost', 'warning')],
      crops: [crop('gehun', 30)],
      followUps: [{ id: 'd1', crop: 'chana', problemName: 'झुलसा', createdAt: new Date('2026-11-05T05:00:00Z') }],
      today: TODAY,
    });
    expect(alertItem).toMatchObject({ body: 'detail। first advice', href: '#/weather', severity: 'warning' });
    expect(followUp).toMatchObject({ title: 'क्या फसल ठीक हुई?', body: 'चना: झुलसा', diagnosisId: 'd1', href: '#/notifications' });
    expect(task).toMatchObject({ title: 'गेहूं: बढ़वार — आज का काम', href: '#/calendar', crop: 'gehun' });
    expect(task?.body).toContain('पहली सिंचाई');
  });

  it('gives a new task id when the stage changes, and none for harvested crops', () => {
    const ids = (daysAgo: number) =>
      buildNotifications({ alerts: [], crops: [crop('chana', daysAgo)], followUps: [], today: TODAY }).map((item) => item.id);
    expect(ids(20)).not.toEqual(ids(60));
    expect(ids(200)).toEqual([]);
  });
});
