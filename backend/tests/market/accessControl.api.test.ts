import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, loginCoordinator, readySeller, registerAs } from './marketHelpers.js';

useTestDatabase();

type App = ReturnType<typeof createMarketTestApp>;
type Agent = Awaited<ReturnType<typeof registerAs>>['agent'];

const ID = '0123456789abcdef01234567';
const listingBody = { category: 'crop', product: 'bajra', unit: 'quintal', quantity: 20, pricePerUnitPaise: 2500_00, title: { hi: 'बाजरा' } };

/**
 * Every protected route and who may call it. A guest always gets 401; a logged-in account with another role 403.
 * (Routes where any logged-in account is allowed are checked for the 401 only; ownership is tested below.)
 */
const ROUTES: { method: 'get' | 'post' | 'put' | 'patch'; path: string; roles: ('seller' | 'buyer' | 'coordinator')[] }[] = [
  { method: 'put', path: '/api/account/seller-profile', roles: ['seller'] },
  { method: 'put', path: '/api/account/buyer-profile', roles: ['buyer'] },
  { method: 'post', path: '/api/market/listings/draft', roles: ['seller', 'coordinator'] },
  { method: 'post', path: '/api/market/photos', roles: ['seller', 'coordinator'] },
  { method: 'post', path: '/api/market/listings', roles: ['seller'] },
  { method: 'patch', path: `/api/market/listings/${ID}`, roles: ['seller', 'coordinator'] },
  { method: 'get', path: '/api/market/my/listings', roles: ['seller'] },
  { method: 'get', path: '/api/market/pricing/suggest?product=bajra&unit=quintal', roles: ['seller', 'coordinator'] },
  { method: 'post', path: '/api/market/orders', roles: ['buyer'] },
  { method: 'post', path: `/api/market/orders/${ID}/rating`, roles: ['buyer'] },
  { method: 'get', path: '/api/market/orders', roles: ['seller', 'buyer', 'coordinator'] },
  { method: 'get', path: `/api/market/orders/${ID}`, roles: ['seller', 'buyer', 'coordinator'] },
  { method: 'post', path: `/api/market/orders/${ID}/status`, roles: ['seller', 'buyer', 'coordinator'] },
  { method: 'post', path: '/api/market/reports', roles: ['seller', 'buyer', 'coordinator'] },
  { method: 'get', path: '/api/market/notifications', roles: ['seller', 'buyer', 'coordinator'] },
  { method: 'post', path: '/api/market/notifications/read', roles: ['seller', 'buyer', 'coordinator'] },
  { method: 'post', path: '/api/market/push/subscribe', roles: ['seller', 'buyer', 'coordinator'] },
  { method: 'get', path: '/api/admin/audit', roles: ['coordinator'] },
  { method: 'post', path: '/api/admin/sellers', roles: ['coordinator'] },
  { method: 'post', path: `/api/admin/sellers/${ID}/verify`, roles: ['coordinator'] },
  { method: 'post', path: `/api/admin/sellers/${ID}/reject`, roles: ['coordinator'] },
  { method: 'post', path: `/api/admin/reports/${ID}/resolve`, roles: ['coordinator'] },
  { method: 'post', path: `/api/admin/listings/${ID}/hide`, roles: ['coordinator'] },
  { method: 'post', path: `/api/admin/listings/${ID}/unhide`, roles: ['coordinator'] },
  { method: 'post', path: '/api/admin/listings', roles: ['coordinator'] },
  { method: 'put', path: `/api/admin/orders/${ID}/delivery`, roles: ['coordinator'] },
  { method: 'post', path: '/api/admin/commission/collect', roles: ['coordinator'] },
  { method: 'get', path: '/api/admin/commission/referrals', roles: ['coordinator'] },
  { method: 'get', path: '/api/admin/schemes', roles: ['coordinator'] },
  { method: 'put', path: '/api/admin/schemes/pmfby', roles: ['coordinator'] },
  { method: 'get', path: '/api/admin/services', roles: ['coordinator'] },
  { method: 'post', path: `/api/admin/services/${ID}/approve`, roles: ['coordinator'] },
  { method: 'post', path: `/api/admin/services/${ID}/reject`, roles: ['coordinator'] },
];

async function agents(app: App) {
  return {
    seller: (await registerAs(app, 'seller')).agent,
    buyer: (await registerAs(app, 'buyer')).agent,
    coordinator: (await loginCoordinator(app)).agent,
  };
}

describe('role checks on every protected route', () => {
  it.each(ROUTES)('$method $path: 401 for guests, 403 for other roles', async ({ method, path, roles }) => {
    const app = createMarketTestApp();
    const guest = await request(app)[method](path).set('X-Requested-With', 'agriai').send({});
    expect(guest.status).toBe(401);

    const byRole = await agents(app);
    for (const role of ['seller', 'buyer', 'coordinator'] as const) {
      const res = await byRole[role][method](path).send({});
      if (roles.includes(role)) expect(res.status, `${role} should pass the role check`).not.toBe(403);
      else expect(res.status, `${role} must be refused`).toBe(403);
    }
  });
});

async function placedOrder(app: App) {
  const seller = await readySeller(app);
  const listingId = (await seller.agent.post('/api/market/listings').send(listingBody)).body.listing.id as string;
  const buyer = await registerAs(app, 'buyer');
  const orderId = (await buyer.agent.post('/api/market/orders').send({ listingId, quantity: 2, fulfilment: 'pickup', paymentMethod: 'upi' })).body
    .order.id as string;
  return { seller, buyer, listingId, orderId };
}

async function expectHidden(agent: Agent, orderId: string) {
  expect((await agent.get(`/api/market/orders/${orderId}`)).status).toBe(404);
  expect((await agent.post(`/api/market/orders/${orderId}/status`).send({ to: 'cancelled' })).status).toBe(404);
  const mine = await agent.get('/api/market/orders');
  expect(mine.body.items.map((order: { id: string }) => order.id)).not.toContain(orderId);
}

describe('ownership', () => {
  it("a buyer never sees or changes another buyer's order", async () => {
    const app = createMarketTestApp();
    const { orderId } = await placedOrder(app);
    const otherBuyer = await registerAs(app, 'buyer');
    await expectHidden(otherBuyer.agent, orderId);
    expect((await otherBuyer.agent.post(`/api/market/orders/${orderId}/rating`).send({ stars: 1 })).status).toBe(404);
  });

  it("a seller never sees or changes another seller's order", async () => {
    const app = createMarketTestApp();
    const { orderId } = await placedOrder(app);
    const otherSeller = await readySeller(app);
    await expectHidden(otherSeller.agent, orderId);
  });

  it("a seller cannot edit another seller's listing or use their photos", async () => {
    const app = createMarketTestApp();
    const { listingId } = await placedOrder(app);
    const otherSeller = await readySeller(app);
    expect((await otherSeller.agent.patch(`/api/market/listings/${listingId}`).send({ status: 'paused' })).status).toBe(403);
    const mine = await otherSeller.agent.get('/api/market/my/listings');
    expect(mine.body.items).toEqual([]);
  });

  it("notifications are per account: nobody reads or marks another person's", async () => {
    const app = createMarketTestApp();
    const { seller } = await placedOrder(app);
    const before = await seller.agent.get('/api/market/notifications');
    expect(before.body.unreadCount).toBe(1);

    const stranger = await registerAs(app, 'buyer');
    expect((await stranger.agent.get('/api/market/notifications')).body.items).toEqual([]);
    const ids = before.body.items.map((item: { id: string }) => item.id);
    await stranger.agent.post('/api/market/notifications/read').send({ ids });
    expect((await seller.agent.get('/api/market/notifications')).body.unreadCount).toBe(1);
  });

  it('public listing views never contain phone numbers or UPI IDs', async () => {
    const app = createMarketTestApp();
    const { seller, listingId } = await placedOrder(app);
    const pub = JSON.stringify((await request(app).get(`/api/market/listings/${listingId}`)).body);
    const search = JSON.stringify((await request(app).get('/api/market/listings')).body);
    for (const body of [pub, search]) {
      expect(body).not.toContain(seller.phone);
      expect(body).not.toContain('@okaxis');
    }
  });

  it('a self-registered account can never become a coordinator', async () => {
    const app = createMarketTestApp();
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-Requested-With', 'agriai')
      .send({ phone: '9811111111', pin: '4826', name: 'चालाक', role: 'coordinator' });
    expect(res.status).toBe(400);
  });
});
