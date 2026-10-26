import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createClock, createMarketTestApp, loginCoordinator, registerAs } from './marketHelpers.js';

useTestDatabase();

const trip = { mandi: 'चूरू मंडी', date: '2026-11-15', tehsil: 'चूरू', pickupPoint: 'घांघू बस स्टैंड', vehicle: 'पिकअप (डेमो)', capacityQuintal: 10 };
const app = () => createMarketTestApp({ now: createClock().now }, { flags: new FeatureFlags({ ...flagDefaults(undefined), mandiPool: 'all' }) });

describe('साथ में मंडी चलें', () => {
  it('coordinators plan; farmers join within capacity; phones only in the panel', async () => {
    const server = app();
    const coordinator = await loginCoordinator(server);
    const farmer = await registerAs(server, 'seller');
    expect((await farmer.agent.post('/api/admin/mandi-trips').send(trip)).status).toBe(403);
    const id = (await coordinator.agent.post('/api/admin/mandi-trips').send(trip)).body.trip.id as string;

    const other = await registerAs(server, 'buyer');
    const results = await Promise.all([
      farmer.agent.post(`/api/mandi-trips/${id}/join`).send({ crop: 'bajra', quantityQuintal: 6 }),
      other.agent.post(`/api/mandi-trips/${id}/join`).send({ crop: 'guar', quantityQuintal: 6 }),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);

    const list = await farmer.agent.get('/api/mandi-trips');
    expect(list.body.items[0].bookedQuintal).toBe(6);
    expect(JSON.stringify(list.body)).not.toContain(farmer.phone);
    const panel = await coordinator.agent.get('/api/admin/mandi-trips');
    expect(panel.body.items[0].memberList).toHaveLength(1);
  });

  it('leaving frees space; closed trips take no one; the flag switches it off', async () => {
    const server = app();
    const coordinator = await loginCoordinator(server);
    const id = (await coordinator.agent.post('/api/admin/mandi-trips').send(trip)).body.trip.id as string;
    const farmer = await registerAs(server, 'seller');
    await farmer.agent.post(`/api/mandi-trips/${id}/join`).send({ crop: 'bajra', quantityQuintal: 10 });
    expect((await farmer.agent.post(`/api/mandi-trips/${id}/leave`)).body.trip.bookedQuintal).toBe(0);
    await coordinator.agent.post(`/api/admin/mandi-trips/${id}/status`).send({ status: 'closed' });
    expect((await farmer.agent.post(`/api/mandi-trips/${id}/join`).send({ crop: 'bajra', quantityQuintal: 1 })).status).toBe(409);
    expect((await (await registerAs(createMarketTestApp(), 'buyer')).agent.get('/api/mandi-trips')).status).toBe(403);
  });
});
