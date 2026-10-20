import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { PUSH_RULES } from '../src/config/notificationRules.js';
import { runNotificationJob } from '../src/jobs/notificationJob.js';
import type { PushSender } from '../src/services/push/pushSender.js';
import type { WeatherProvider } from '../src/services/weather/weatherProvider.js';
import type { PushPayload } from '../src/types/push.js';
import { addDays, todayInIndia } from '../src/utils/dates.js';
import { makeForecast } from './fakes/forecast.js';
import { InMemoryFarmProfileRepository } from './fakes/inMemoryFarmProfileRepository.js';
import { InMemoryPushSubscriptionRepository } from './fakes/inMemoryPushSubscriptionRepository.js';

const today = todayInIndia();
const sub = (name: string) => ({ endpoint: `https://push.example.com/${name}`, keys: { p256dh: 'p', auth: 'a' } });

/** Heat + frost-free wind alerts today, and a growing crop (task). */
const stormy: WeatherProvider = {
  getForecast: async () => ({
    ...makeForecast(),
    days: makeForecast([{ tempMax: 46 }, { gustMax: 60 }]).days.map((day, i) => ({ ...day, date: addDays(today, i) })),
    past: [{ date: addDays(today, -1), rainMm: 5 }],
  }),
};

async function setup(sender: PushSender) {
  const farmProfiles = new InMemoryFarmProfileRepository();
  const subscriptions = new InMemoryPushSubscriptionRepository();
  const device = randomUUID();
  await farmProfiles.save(device, {
    location: { lat: 28.3, lon: 74.95, source: 'gps' },
    crops: [{ crop: 'gehun', sowingDate: addDays(today, -30) }],
  });
  await subscriptions.save(device, sub('phone'));
  const deps = { farmProfiles, history: null, weather: stormy, subscriptions, sender };
  return { deps, subscriptions, farmProfiles };
}

describe('runNotificationJob', () => {
  it(`pushes at most ${PUSH_RULES.maxPerRun} new notifications, most urgent first, and never repeats them`, async () => {
    const payloads: PushPayload[] = [];
    const sender: PushSender = { send: vi.fn(async (_s, payload: PushPayload) => (payloads.push(payload), 'sent' as const)) };
    const { deps } = await setup(sender);

    expect(await runNotificationJob(deps)).toEqual({ sent: 2, removed: 0, failed: 0 });
    expect(payloads.map((payload) => payload.tag)).toEqual([`alert:heatwave:${today}`, `alert:strongWind:${addDays(today, 1)}`]);
    expect(payloads[0]).toMatchObject({ url: '#/weather', title: 'लू / बहुत गर्मी' });

    // The task was new too: it is remembered (visible in-app) but not pushed in a third message.
    expect(await runNotificationJob(deps)).toEqual({ sent: 0, removed: 0, failed: 0 });
  });

  it('removes subscriptions the push service says are gone', async () => {
    const { deps, subscriptions } = await setup({ send: async () => 'gone' });
    expect(await runNotificationJob(deps)).toEqual({ sent: 0, removed: 1, failed: 0 });
    expect(subscriptions.items.size).toBe(0);
  });

  it('keeps going when one device fails', async () => {
    const send = vi.fn(async (subscription: { endpoint: string }) => {
      if (subscription.endpoint.endsWith('phone')) throw new Error('network');
      return 'sent' as const;
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { deps, subscriptions, farmProfiles } = await setup({ send });
    const other = randomUUID();
    await farmProfiles.save(other, { location: { lat: 28.4, lon: 74.5, source: 'gps' }, crops: [] });
    await subscriptions.save(other, sub('second'));

    const result = await runNotificationJob(deps);
    expect(result.failed).toBe(1);
    expect(result.sent).toBe(2);
  });

  it('sends nothing to a device without a farm profile', async () => {
    const send = vi.fn();
    const { deps, subscriptions } = await setup({ send });
    await subscriptions.save(randomUUID(), sub('no-profile'));
    await runNotificationJob(deps);
    expect(send.mock.calls.every(([subscription]) => subscription.endpoint !== sub('no-profile').endpoint)).toBe(true);
  });
});
