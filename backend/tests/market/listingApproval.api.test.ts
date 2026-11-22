import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;
const bajra = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 10, pricePerUnitPaise: 2500_00, title: { hi: 'साफ़ बाजरा' } };

async function pendingSellerWithListing(app: App) {
  const coordinator = await loginCoordinator(app);
  const seller = await readySeller(app, { verified: false });
  const created = await seller.agent.post('/api/market/listings').send(bajra);
  expect(created.status).toBe(201);
  return { coordinator, seller, created, id: created.body.listing.id as string };
}

const notices = async (agent: Awaited<ReturnType<typeof registerAs>>['agent']) =>
  (await agent.get('/api/market/notifications')).body.items as { kind: string; body: string; href: string }[];

describe('listing of a seller who is not verified yet', () => {
  it('tells the seller why buyers do not see it', async () => {
    const { created } = await pendingSellerWithListing(createMarketTestApp());
    expect(created.body.listing).toMatchObject({ visible: false, notVisibleReason: 'seller' });
  });

  it('tells the coordinators, with a link to the approval screen', async () => {
    const { coordinator } = await pendingSellerWithListing(createMarketTestApp());
    const [notice] = await notices(coordinator.agent);
    expect(notice).toMatchObject({ kind: 'seller', href: '#/admin/listings' });
    expect(notice?.body).toContain('साफ़ बाजरा');
  });

  it('waits in the panel with the seller next to it, and is counted as work', async () => {
    const { coordinator, seller, id } = await pendingSellerWithListing(createMarketTestApp());
    const waiting = await coordinator.agent.get('/api/admin/listings').query({ show: 'waiting' });
    expect(waiting.body.items).toHaveLength(1);
    expect(waiting.body.items[0]).toMatchObject({ id, notVisibleReason: 'seller', seller: { id: seller.user.id, status: 'pending' } });
    expect((await coordinator.agent.get('/api/admin/attention')).body.waitingListings).toBe(1);
  });

  it('approval puts it in the market and tells the seller', async () => {
    const app = createMarketTestApp();
    const { coordinator, seller, id } = await pendingSellerWithListing(app);
    expect((await client(app).get('/api/market/listings')).body.items).toEqual([]);

    expect((await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({})).status).toBe(200);
    expect((await client(app).get('/api/market/listings')).body.items).toMatchObject([{ id }]);
    expect((await seller.agent.get('/api/market/my/listings')).body.items[0]).toMatchObject({ visible: true, notVisibleReason: null });
    expect((await notices(seller.agent))[0]).toMatchObject({ kind: 'seller', href: '#/sell' });
    expect((await coordinator.agent.get('/api/admin/attention')).body.waitingListings).toBe(0);
    expect((await coordinator.agent.get('/api/admin/listings').query({ show: 'waiting' })).body.items).toEqual([]);
    expect((await coordinator.agent.get('/api/admin/listings')).body.items).toMatchObject([{ id, visible: true }]);
  });

  it('a refusal reaches the seller with the reason', async () => {
    const { coordinator, seller } = await pendingSellerWithListing(createMarketTestApp());
    await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/reject`).send({ reason: 'गाँव का नाम गलत है' });
    expect((await notices(seller.agent))[0]?.body).toContain('गाँव का नाम गलत है');
  });

  it('a listing of a verified seller is live at once, without a notice', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app);
    expect((await seller.agent.post('/api/market/listings').send(bajra)).body.listing).toMatchObject({ visible: true, notVisibleReason: null });
    expect(await notices(coordinator.agent)).toEqual([]);
  });

  it('paused and hidden listings say so', async () => {
    const app = createMarketTestApp();
    const coordinator = await loginCoordinator(app);
    const seller = await readySeller(app);
    const id = (await seller.agent.post('/api/market/listings').send(bajra)).body.listing.id as string;
    expect((await seller.agent.patch(`/api/market/listings/${id}`).send({ status: 'paused' })).body.listing.notVisibleReason).toBe('paused');
    await coordinator.agent.post(`/api/admin/listings/${id}/hide`).send({ reason: 'जाँच के लिए' });
    expect((await seller.agent.get('/api/market/my/listings')).body.items[0].notVisibleReason).toBe('hidden');
  });

  it('only coordinators see all listings', async () => {
    const app = createMarketTestApp();
    expect((await client(app).get('/api/admin/listings')).status).toBe(401);
    expect((await (await registerAs(app, 'buyer')).agent.get('/api/admin/listings')).status).toBe(403);
  });
});
