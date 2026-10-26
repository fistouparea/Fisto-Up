import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { allowedBookingSteps, BOOKING_TRANSITIONS, findBookingRule } from '../../src/modules/services/bookingStateMachine.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createClock, createMarketTestApp, loginCoordinator, registerAs } from './marketHelpers.js';

useTestDatabase();

const allOn = () => new FeatureFlags({ ...flagDefaults(undefined), equipment: 'all', labour: 'all', livestock: 'all' });
const place = { district: 'चूरू', tehsil: 'चूरू', lat: 28.3, lon: 74.95 };
// The test clock is 2026-11-10 (India).
const tractor = {
  kind: 'equipment',
  typeId: 'tractor',
  title: 'महिंद्रा ट्रैक्टर, ड्राइवर के साथ',
  village: 'घांघू',
  place,
  pricePaise: 800_00,
  priceUnit: 'hour',
  availableDates: ['2026-11-12', '2026-11-13', '2026-11-14'],
};
const worker = {
  kind: 'labour',
  side: 'offer',
  skills: ['katai', 'nirai'],
  title: 'कटाई और निराई का काम',
  village: 'घांघू',
  place,
  pricePaise: 500_00,
  priceUnit: 'day',
  availableDates: ['2026-11-12', '2026-11-13'],
  details: { ageConfirmed18: true },
};
const cow = {
  kind: 'livestock',
  typeId: 'cow',
  title: 'राठी गाय, 8 लीटर दूध',
  village: 'लोहा',
  place,
  pricePaise: 45_000_00,
  priceUnit: 'animal',
  details: { breed: 'राठी', ageYears: 4, milkLitresPerDay: 8, vaccinations: 'खुरपका-मुंहपका (FMD) 2026', purpose: 'dairy' },
};

function setup() {
  const clock = createClock();
  const app = createMarketTestApp({ now: clock.now }, { flags: allOn() });
  return { app, clock };
}

describe('booking state machine', () => {
  it('only the owner side accepts or rejects; the requester can cancel a request', () => {
    expect(findBookingRule('requested', 'accepted', 'requester')).toBeNull();
    expect(findBookingRule('requested', 'accepted', 'owner')?.effect).toBe('lockDates');
    expect(findBookingRule('requested', 'cancelled', 'owner')).toBeNull();
    expect(allowedBookingSteps('requested', 'requester')).toEqual(['cancelled']);
    expect(allowedBookingSteps('accepted', 'requester').sort()).toEqual(['cancelled', 'completed']);
  });

  it('cancelling an accepted booking gives the days back; terminal states have no way out', () => {
    expect(findBookingRule('accepted', 'cancelled', 'requester')?.effect).toBe('releaseDates');
    for (const terminal of ['rejected', 'cancelled', 'completed'] as const) {
      expect(BOOKING_TRANSITIONS.some((rule) => rule.from === terminal)).toBe(false);
    }
  });
});

describe('service listings', () => {
  it('guests browse but cannot post; flags switch each kind off', async () => {
    const { app } = setup();
    expect((await request(app).post('/api/services').set('X-Requested-With', 'agriai').send(tractor)).status).toBe(401);
    expect((await request(app).get('/api/services?kind=equipment')).status).toBe(200);
    const off = createMarketTestApp();
    expect((await request(off).get('/api/services?kind=equipment')).status).toBe(403);
  });

  it('an owner lists a machine; it is public at once with its free days, never a phone number', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'buyer');
    const created = await owner.agent.post('/api/services').send(tractor);
    expect(created.status).toBe(201);
    expect(created.body.listing).toMatchObject({ status: 'active', freeDates: tractor.availableDates });

    const found = await request(app).get('/api/services').query({ kind: 'equipment', lat: 28.31, lon: 74.96, date: '2026-11-13' });
    expect(found.body.items).toHaveLength(1);
    expect(found.body.items[0].distanceKm).toBeDefined();
    expect(JSON.stringify(found.body)).not.toContain(owner.phone);
  });

  it('refuses dates in the past or too far ahead, wrong price units and a calendar for animals', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    expect((await owner.agent.post('/api/services').send({ ...tractor, availableDates: ['2026-11-01'] })).status).toBe(400);
    expect((await owner.agent.post('/api/services').send({ ...tractor, availableDates: ['2027-06-01'] })).status).toBe(400);
    expect((await owner.agent.post('/api/services').send({ ...tractor, priceUnit: 'animal' })).status).toBe(400);
    expect((await owner.agent.post('/api/services').send({ ...cow, availableDates: ['2026-11-12'] })).status).toBe(400);
  });

  it('only the owner (or a coordinator) changes a listing', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    const listingId = (await owner.agent.post('/api/services').send(tractor)).body.listing.id as string;
    const other = await registerAs(app, 'buyer');
    expect((await other.agent.patch(`/api/services/item/${listingId}`).send({ status: 'paused' })).status).toBe(403);
    expect((await owner.agent.patch(`/api/services/item/${listingId}`).send({ status: 'paused' })).body.listing.status).toBe('paused');
    expect((await request(app).get(`/api/services/item/${listingId}`)).status).toBe(404);
  });
});

describe('bookings', () => {
  it('request → accept shares phone numbers; then complete and rate once', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    const listingId = (await owner.agent.post('/api/services').send(tractor)).body.listing.id as string;
    const farmer = await registerAs(app, 'buyer');

    const asked = await farmer.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-12'], note: 'दो घंटे जुताई' });
    expect(asked.status).toBe(201);
    expect(asked.body.booking.contact).toBeUndefined();
    const bookingId = asked.body.booking.id as string;

    const ownerView = await owner.agent.get(`/api/services/bookings/${bookingId}`);
    expect(ownerView.body.booking.allowedNext.sort()).toEqual(['accepted', 'rejected']);
    expect((await farmer.agent.post(`/api/services/bookings/${bookingId}/status`).send({ to: 'accepted' })).status).toBe(409);

    const accepted = await owner.agent.post(`/api/services/bookings/${bookingId}/status`).send({ to: 'accepted' });
    expect(accepted.body.booking.contact).toEqual({ requesterPhone: farmer.phone });
    const farmerView = await farmer.agent.get(`/api/services/bookings/${bookingId}`);
    expect(farmerView.body.booking.contact).toEqual({ ownerPhone: owner.phone });

    const listing = await request(app).get(`/api/services/item/${listingId}`);
    expect(listing.body.listing.freeDates).toEqual(['2026-11-13', '2026-11-14']);

    await farmer.agent.post(`/api/services/bookings/${bookingId}/status`).send({ to: 'completed' });
    expect((await farmer.agent.post(`/api/services/bookings/${bookingId}/rating`).send({ stars: 5 })).status).toBe(200);
    expect((await farmer.agent.post(`/api/services/bookings/${bookingId}/rating`).send({ stars: 4 })).status).toBe(409);
    expect((await request(app).get(`/api/services/item/${listingId}`)).body.listing.rating).toEqual({ average: 5, count: 1 });
  });

  it('the availability calendar prevents double booking, also when two accepts race', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    const listingId = (await owner.agent.post('/api/services').send(tractor)).body.listing.id as string;
    const first = await registerAs(app, 'buyer');
    const second = await registerAs(app, 'buyer');
    const a = (await first.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-13'] })).body.booking.id as string;
    const b = (await second.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-13', '2026-11-14'] })).body.booking.id as string;

    const results = await Promise.all([
      owner.agent.post(`/api/services/bookings/${a}/status`).send({ to: 'accepted' }),
      owner.agent.post(`/api/services/bookings/${b}/status`).send({ to: 'accepted' }),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    // Nothing half-booked: 2026-11-14 is booked only if the second booking won.
    const free = (await request(app).get(`/api/services/item/${listingId}`)).body.listing.freeDates as string[];
    expect(free.includes('2026-11-14')).toBe(results[1]?.status !== 200);

    // A booked day cannot even be asked for.
    const third = await registerAs(app, 'buyer');
    expect((await third.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-13'] })).status).toBe(409);
  });

  it('cancelling an accepted booking frees its days again', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    const listingId = (await owner.agent.post('/api/services').send(tractor)).body.listing.id as string;
    const farmer = await registerAs(app, 'buyer');
    const bookingId = (await farmer.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-12'] })).body.booking.id as string;
    await owner.agent.post(`/api/services/bookings/${bookingId}/status`).send({ to: 'accepted' });
    await farmer.agent.post(`/api/services/bookings/${bookingId}/status`).send({ to: 'cancelled' });
    expect((await request(app).get(`/api/services/item/${listingId}`)).body.listing.freeDates).toContain('2026-11-12');
  });

  it('others cannot see a booking; owners cannot book themselves', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    const listingId = (await owner.agent.post('/api/services').send(tractor)).body.listing.id as string;
    expect((await owner.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-12'] })).status).toBe(400);
    const farmer = await registerAs(app, 'buyer');
    const bookingId = (await farmer.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-12'] })).body.booking.id as string;
    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.get(`/api/services/bookings/${bookingId}`)).status).toBe(404);
    expect((await stranger.agent.post(`/api/services/bookings/${bookingId}/status`).send({ to: 'cancelled' })).status).toBe(404);
  });
});

describe('labour', () => {
  it('a worker must confirm being 18 or older; a work need does not', async () => {
    const { app } = setup();
    const person = await registerAs(app, 'buyer');
    expect((await person.agent.post('/api/services').send({ ...worker, details: {} })).status).toBe(400);
    expect((await person.agent.post('/api/services').send(worker)).status).toBe(201);
    const need = { ...worker, side: 'need', title: 'कटाई के लिए 3 मज़दूर', details: { workersNeeded: 3 } };
    expect((await person.agent.post('/api/services').send(need)).status).toBe(201);
  });

  it('matches by skill, date and distance; contact only after both say yes', async () => {
    const { app } = setup();
    const farmer = await registerAs(app, 'buyer');
    const needId = (await farmer.agent.post('/api/services').send({ ...worker, side: 'need', skills: ['katai'], title: 'कटाई के लिए मज़दूर', details: { workersNeeded: 2 } })).body.listing.id as string;
    const good = await registerAs(app, 'seller');
    await good.agent.post('/api/services').send(worker);
    const otherSkill = await registerAs(app, 'seller');
    await otherSkill.agent.post('/api/services').send({ ...worker, skills: ['pashu_seva'] });
    const otherDays = await registerAs(app, 'seller');
    await otherDays.agent.post('/api/services').send({ ...worker, availableDates: ['2026-12-01'] });

    const matches = await farmer.agent.get(`/api/services/item/${needId}/matches`);
    expect(matches.status).toBe(200);
    expect(matches.body.items).toHaveLength(1);
    expect(matches.body.items[0]).toMatchObject({ sharedSkills: ['katai'], sharedDates: ['2026-11-12', '2026-11-13'] });
    expect(JSON.stringify(matches.body)).not.toContain(good.phone);

    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.get(`/api/services/item/${needId}/matches`)).status).toBe(403);
  });
});

describe('livestock approval', () => {
  it('is hidden until a coordinator approves; approval is audited and the owner told', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    const created = await owner.agent.post('/api/services').send(cow);
    expect(created.body.listing.status).toBe('pending_approval');
    const listingId = created.body.listing.id as string;
    expect((await request(app).get(`/api/services/item/${listingId}`)).status).toBe(404);
    expect((await request(app).get('/api/services?kind=livestock')).body.items).toHaveLength(0);
    expect((await owner.agent.patch(`/api/services/item/${listingId}`).send({ status: 'active' })).status).toBe(409);
    expect((await owner.agent.post(`/api/admin/services/${listingId}/approve`)).status).toBe(403);

    const coordinator = await loginCoordinator(app);
    const queue = await coordinator.agent.get('/api/admin/services');
    expect(queue.body.items.map((item: { id: string }) => item.id)).toEqual([listingId]);
    expect((await coordinator.agent.post(`/api/admin/services/${listingId}/approve`)).status).toBe(200);
    expect((await coordinator.agent.post(`/api/admin/services/${listingId}/approve`)).status).toBe(409);
    expect((await request(app).get('/api/services?kind=livestock')).body.items).toHaveLength(1);
    expect(await AuditLogModel.countDocuments({ action: 'service.approve' })).toBe(1);
    const notes = await owner.agent.get('/api/market/notifications');
    expect(notes.body.items.some((item: { title: string }) => item.title === 'लिस्टिंग मंज़ूर')).toBe(true);
  });

  it('an enquiry has no dates; a rejection needs a reason', async () => {
    const { app } = setup();
    const owner = await registerAs(app, 'seller');
    const listingId = (await owner.agent.post('/api/services').send(cow)).body.listing.id as string;
    const coordinator = await loginCoordinator(app);
    expect((await coordinator.agent.post(`/api/admin/services/${listingId}/reject`).send({})).status).toBe(400);
    await coordinator.agent.post(`/api/admin/services/${listingId}/approve`);
    const buyer = await registerAs(app, 'buyer');
    expect((await buyer.agent.post(`/api/services/item/${listingId}/bookings`).send({ dates: ['2026-11-12'] })).status).toBe(400);
    expect((await buyer.agent.post(`/api/services/item/${listingId}/bookings`).send({ note: 'देखने आना है' })).status).toBe(201);
  });
});
