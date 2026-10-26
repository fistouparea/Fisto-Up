import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { EventModel } from '../../src/modules/metrics/event.model.js';
import { actorHash } from '../../src/modules/metrics/events.js';
import type { MandiProvider } from '../../src/services/mandi/agmarknetProvider.js';
import { MongoFarmProfileRepository } from '../../src/services/farm/mongoFarmProfileRepository.js';
import { MongoHistoryRepository } from '../../src/services/history/mongoHistoryRepository.js';
import { lastWeeks, weekOf } from '../../src/utils/weeks.js';
import { JPEG_BYTES } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;
type Agent = Awaited<ReturnType<typeof registerAs>>['agent'];

const fakeMandi: MandiProvider = {
  getPrices: async () => [
    { crop: 'bajra', market: 'चूरू', modalPrice: 2300, minPrice: 2200, maxPrice: 2400, date: '2026-11-10' },
    { crop: 'bajra', market: 'सरदारशहर', modalPrice: 2500, minPrice: 2400, maxPrice: 2600, date: '2026-11-10' },
  ],
};

function appWith(flags = new FeatureFlags(flagDefaults(undefined))) {
  return createMarketTestApp({}, { historyRepository: new MongoHistoryRepository(), farmProfiles: new MongoFarmProfileRepository(), mandi: fakeMandi, flags });
}

async function diagnose(app: App, deviceId: string) {
  const res = await request(app).post('/api/diagnose').field('crop', 'bajra').field('deviceId', deviceId).attach('image', JPEG_BYTES, { filename: 'p.jpg', contentType: 'image/jpeg' });
  return res.body.historyId as string;
}

/** Events are written in the background; wait until they are all there. */
async function eventsSettled(count: number) {
  await vi.waitFor(async () => expect(await EventModel.countDocuments()).toBe(count), { timeout: 5_000 });
}

async function completedOrder(seller: { agent: Agent }, buyer: Agent, listingId: string, quantity: number) {
  const id = (await buyer.post('/api/market/orders').send({ listingId, quantity, fulfilment: 'pickup', paymentMethod: 'upi' })).body.order.id as string;
  for (const [agent, to] of [
    [seller.agent, 'accepted'],
    [seller.agent, 'ready'],
    [seller.agent, 'ready_for_pickup'],
    [buyer, 'delivered'],
    [seller.agent, 'paid'],
    [buyer, 'completed'],
  ] as const) {
    await agent.post(`/api/market/orders/${id}/status`).send({ to });
  }
}

describe('product events (privacy-first)', () => {
  it('store what happened, never who: no device id, only a weekly pseudonym and fixed values', async () => {
    const app = appWith();
    const deviceId = randomUUID();
    await diagnose(app, deviceId);
    await eventsSettled(1);
    const event = await EventModel.findOne().lean();
    expect(event).toMatchObject({ name: 'diagnosis_ok', week: weekOf(), props: { crop: 'bajra' } });
    expect(JSON.stringify(event)).not.toContain(deviceId);

    // The same phone has a different pseudonym every week: it cannot be followed across weeks.
    expect(actorHash(deviceId, '2026-11-02')).not.toBe(actorHash(deviceId, '2026-11-09'));
    expect(actorHash(deviceId, '2026-11-09')).toBe(actorHash(deviceId, '2026-11-09'));
  });

  it('the app may only send "app_open"', async () => {
    const app = appWith();
    expect((await request(app).post('/api/events').send({ name: 'app_open', deviceId: randomUUID() })).status).toBe(202);
    expect((await request(app).post('/api/events').send({ name: 'order_placed', deviceId: randomUUID() })).status).toBe(400);
    expect((await request(app).post('/api/events').send({ name: 'app_open', deviceId: 'not-a-uuid' })).status).toBe(400);
    await eventsSettled(1);
  });

  it('"मेरा डेटा मिटाएँ" also deletes the phone\'s events', async () => {
    const app = appWith();
    const mine = randomUUID();
    await request(app).post('/api/events').send({ name: 'app_open', deviceId: mine });
    await request(app).post('/api/events').send({ name: 'app_open', deviceId: randomUUID() });
    await eventsSettled(2);
    await client(app).post('/api/account/my-data/delete').send({ deviceId: mine, confirm: 'DELETE' });
    expect(await EventModel.countDocuments()).toBe(1);
  });
});

describe('Pilot Dashboard', () => {
  it('shows weekly active farmers, diagnoses, 👍 rate by crop, follow-ups, market numbers and price vs mandi', async () => {
    const app = appWith();
    const [first, second, third] = [randomUUID(), randomUUID(), randomUUID()];
    const historyId = await diagnose(app, first);
    await diagnose(app, first);
    const secondId = await diagnose(app, second);
    await request(app).post('/api/events').send({ name: 'app_open', deviceId: third });
    await request(app).post(`/api/history/${historyId}/feedback`).send({ deviceId: first, helpful: true });
    await request(app).post(`/api/history/${secondId}/feedback`).send({ deviceId: second, helpful: false });
    await request(app).post(`/api/history/${historyId}/follow-up`).send({ deviceId: first, answer: 'better' });

    const seller = await readySeller(app);
    const listingId = (
      await seller.agent.post('/api/market/listings').send({ category: 'crop', product: 'bajra', unit: 'quintal', quantity: 20, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } })
    ).body.listing.id as string;
    const buyer = await registerAs(app, 'buyer');
    await completedOrder(seller, buyer.agent, listingId, 4);
    await eventsSettled(7); // 3 diagnoses, 1 app open, 2 feedback, 1 follow-up

    const coordinator = await loginCoordinator(app);
    const res = await coordinator.agent.get('/api/admin/pilot').query({ weeks: 4 });
    expect(res.status).toBe(200);
    const thisWeek = res.body.weeks.at(-1);
    expect(res.body.weeks).toEqual(lastWeeks(4));
    expect(res.body.weeklyActiveFarmers.at(-1)).toEqual({ week: thisWeek, farmers: 3 });
    expect(res.body.diagnoses.at(-1)).toEqual({ week: thisWeek, ok: 3, unclear: 0 });
    expect(res.body.aiFeedbackByCrop).toEqual([{ crop: 'bajra', answers: 2, helpful: 1, helpfulPercent: 50 }]);
    expect(res.body.followUps).toEqual({ better: 1, same: 0, worse: 0 });
    expect(res.body.market.at(-1)).toEqual({ week: thisWeek, listings: 1, orders: 1, completed: 1, salesPaise: 4 * 2500_00, commissionPaise: 300_00 });
    expect(res.body.totals).toMatchObject({ completedOrders: 1, salesPaise: 10_000_00, commissionPaise: 300_00 });
    expect(res.body.priceVsMandi).toEqual([
      { product: 'bajra', listings: 1, listedPerQuintalPaise: 2500_00, soldPerQuintalPaise: 2500_00, mandiPerQuintalPaise: 2400_00 },
    ]);
    // Nothing that identifies a farmer.
    for (const deviceId of [first, second, third]) expect(JSON.stringify(res.body)).not.toContain(deviceId);
  });

  it('exports every metric as CSV (audited); feedback comments without any device id', async () => {
    const app = appWith();
    const deviceId = randomUUID();
    const historyId = await diagnose(app, deviceId);
    await request(app).post(`/api/history/${historyId}/feedback`).send({ deviceId, helpful: false, comment: 'पत्ते अभी भी पीले' });
    await eventsSettled(2);
    const coordinator = await loginCoordinator(app);

    for (const name of ['weekly-active-farmers', 'diagnoses', 'ai-feedback-by-crop', 'follow-ups', 'market', 'price-vs-mandi']) {
      const csv = await coordinator.agent.get(`/api/admin/pilot/export/${name}.csv`);
      expect(csv.status, name).toBe(200);
      expect(csv.headers['content-type']).toContain('text/csv');
      expect(csv.text.split('\r\n').length).toBeGreaterThan(1);
    }
    const ai = await coordinator.agent.get('/api/admin/pilot/export/ai-feedback-by-crop.csv');
    expect(ai.text).toContain('bajra,1,0,0');
    const comments = await coordinator.agent.get('/api/admin/pilot/feedback-comments.csv');
    expect(comments.text).toContain('पत्ते अभी भी पीले');
    expect(comments.text).not.toContain(deviceId);
    expect(await AuditLogModel.countDocuments({ action: 'metrics.export' })).toBe(8);
    expect((await coordinator.agent.get('/api/admin/pilot/export/everything.csv')).status).toBe(400);
  });

  it('is for coordinators only, and hidden when the pilotDashboard flag is off', async () => {
    const app = appWith();
    expect((await (await registerAs(app, 'seller')).agent.get('/api/admin/pilot')).status).toBe(403);
    const off = appWith(new FeatureFlags({ ...flagDefaults(undefined), pilotDashboard: 'off' }));
    expect((await (await loginCoordinator(off)).agent.get('/api/admin/pilot')).status).toBe(403);
  });
});
