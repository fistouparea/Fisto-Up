import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { TRIP_TRANSITIONS } from '../../src/config/logisticsRules.js';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
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

describe('coordinator manages trips', () => {
  it('edits a trip; capacity never below what is booked; members are told', async () => {
    const server = app();
    const coordinator = await loginCoordinator(server);
    const id = (await coordinator.agent.post('/api/admin/mandi-trips').send(trip)).body.trip.id as string;
    const farmer = await registerAs(server, 'seller');
    await farmer.agent.post(`/api/mandi-trips/${id}/join`).send({ crop: 'bajra', quantityQuintal: 6 });

    expect((await coordinator.agent.patch(`/api/admin/mandi-trips/${id}`).send({ capacityQuintal: 5 })).status).toBe(409);
    expect((await farmer.agent.patch(`/api/admin/mandi-trips/${id}`).send({ vehicle: 'ट्रक' })).status).toBe(403);
    const edited = await coordinator.agent.patch(`/api/admin/mandi-trips/${id}`).send({ date: '2026-11-16', vehicle: 'ट्रक' });
    expect(edited.body.trip).toMatchObject({ date: '2026-11-16', vehicle: 'ट्रक', bookedQuintal: 6 });
    expect((await coordinator.agent.patch(`/api/admin/mandi-trips/${id}`).send({ date: '2026-10-01' })).status).toBe(400);
    expect((await coordinator.agent.patch(`/api/admin/mandi-trips/${id}`).send({})).status).toBe(400);

    const notes = await farmer.agent.get('/api/market/notifications');
    expect(notes.body.items.some((item: { body: string }) => item.body.includes('बदली'))).toBe(true);
    expect(await AuditLogModel.countDocuments({ action: 'mandiTrip.update' })).toBe(1);
  });

  it('moves open → departed → completed only; cancelling tells every member', async () => {
    const server = app();
    const coordinator = await loginCoordinator(server);
    const id = (await coordinator.agent.post('/api/admin/mandi-trips').send(trip)).body.trip.id as string;
    const farmer = await registerAs(server, 'seller');
    await farmer.agent.post(`/api/mandi-trips/${id}/join`).send({ crop: 'bajra', quantityQuintal: 2 });
    expect((await coordinator.agent.post(`/api/admin/mandi-trips/${id}/status`).send({ status: 'completed' })).status).toBe(409);
    expect((await coordinator.agent.post(`/api/admin/mandi-trips/${id}/status`).send({ status: 'departed' })).body.trip.status).toBe('departed');
    expect((await coordinator.agent.patch(`/api/admin/mandi-trips/${id}`).send({ vehicle: 'x' })).status).toBe(409);
    expect((await coordinator.agent.post(`/api/admin/mandi-trips/${id}/status`).send({ status: 'cancelled' })).status).toBe(409);
    expect((await coordinator.agent.post(`/api/admin/mandi-trips/${id}/status`).send({ status: 'completed' })).body.trip.status).toBe('completed');

    const second = (await coordinator.agent.post('/api/admin/mandi-trips').send(trip)).body.trip.id as string;
    await farmer.agent.post(`/api/mandi-trips/${second}/join`).send({ crop: 'guar', quantityQuintal: 1 });
    await coordinator.agent.post(`/api/admin/mandi-trips/${second}/status`).send({ status: 'cancelled' });
    const notes = await farmer.agent.get('/api/market/notifications');
    expect(notes.body.items.some((item: { body: string }) => item.body.includes('रद्द'))).toBe(true);
    // A departed trip is still on the member's list, so they can follow it.
    expect(TRIP_TRANSITIONS.completed).toEqual([]);
  });
});
