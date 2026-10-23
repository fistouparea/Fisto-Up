import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/modules/auth/user.model.js';
import { createTestApp } from '../helpers.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { client, createClock, createMarketTestApp, nextPhone, registerAs, sellerProfile } from './marketHelpers.js';

useTestDatabase();

describe('registration', () => {
  it('creates a pending seller, sets a safe session cookie and never returns the PIN hash', async () => {
    const app = createMarketTestApp();
    const res = await client(app)
      .post('/api/auth/register')
      .send({ phone: '+91 98290 12345', pin: '4826', name: 'रमेश', role: 'seller' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ phone: '9829012345', role: 'seller', name: 'रमेश', seller: { status: 'pending' } });
    expect(JSON.stringify(res.body)).not.toMatch(/pinHash|\$2[aby]\$/);

    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/agriai_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api/);
  });

  it('stores the PIN only as a bcrypt hash', async () => {
    const app = createMarketTestApp();
    const { phone } = await registerAs(app, 'buyer');
    const stored = await UserModel.findOne({ phone }).lean();
    expect(stored?.pinHash).toMatch(/^\$2[aby]\$/);
    expect(stored?.pinHash).not.toContain('4826');
  });

  it('refuses a phone number that is already registered', async () => {
    const app = createMarketTestApp();
    const { phone } = await registerAs(app, 'buyer');
    const res = await client(app).post('/api/auth/register').send({ phone, pin: '5937', name: 'दूसरा', role: 'buyer' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_TAKEN');
  });

  it.each(['1111', '1234', '0000'])('refuses the easy PIN %s', async (pin) => {
    const res = await client(createMarketTestApp())
      .post('/api/auth/register')
      .send({ phone: nextPhone(), pin, name: 'रमेश', role: 'buyer' });
    expect(res.body.error.code).toBe('WEAK_PIN');
  });

  it.each([
    ['a landline-style number', { phone: '0151234567' }],
    ['a 5-digit PIN', { pin: '48261' }],
    ['the coordinator role (only created by the server script)', { role: 'coordinator' }],
  ])('rejects %s', async (_label, override) => {
    const res = await client(createMarketTestApp())
      .post('/api/auth/register')
      .send({ phone: nextPhone(), pin: '4826', name: 'रमेश', role: 'buyer', ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});

describe('login', () => {
  it('logs in with phone + PIN and /me returns the account', async () => {
    const app = createMarketTestApp();
    const { phone } = await registerAs(app, 'buyer');

    const agent = client(app);
    expect((await agent.post('/api/auth/login').send({ phone, pin: '4826' })).status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.body.user).toMatchObject({ phone, role: 'buyer' });
  });

  it('gives the same error for a wrong PIN and an unknown phone', async () => {
    const app = createMarketTestApp();
    const { phone } = await registerAs(app, 'buyer');

    const wrongPin = await client(app).post('/api/auth/login').send({ phone, pin: '9999' });
    const unknown = await client(app).post('/api/auth/login').send({ phone: nextPhone(), pin: '4826' });
    expect(wrongPin.status).toBe(401);
    expect(wrongPin.body).toEqual(unknown.body);
    expect(wrongPin.body.error.code).toBe('INVALID_LOGIN');
  });

  it('locks the account after 5 wrong PINs, even for the right PIN, and unlocks after 15 minutes', async () => {
    const clock = createClock();
    const app = createMarketTestApp({ now: clock.now });
    const { phone } = await registerAs(app, 'buyer');

    for (let i = 0; i < 5; i++) {
      await client(app).post('/api/auth/login').send({ phone, pin: '9999' });
    }
    const locked = await client(app).post('/api/auth/login').send({ phone, pin: '4826' });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('LOGIN_LOCKED');

    clock.advanceMinutes(16);
    expect((await client(app).post('/api/auth/login').send({ phone, pin: '4826' })).status).toBe(200);
  });

  it('a correct login resets the wrong-PIN counter', async () => {
    const app = createMarketTestApp();
    const { phone } = await registerAs(app, 'buyer');
    for (let i = 0; i < 4; i++) await client(app).post('/api/auth/login').send({ phone, pin: '9999' });
    await client(app).post('/api/auth/login').send({ phone, pin: '4826' });
    await client(app).post('/api/auth/login').send({ phone, pin: '9999' });

    expect((await client(app).post('/api/auth/login').send({ phone, pin: '4826' })).status).toBe(200);
  });
});

describe('sessions', () => {
  it('/me is null without a cookie or with a tampered cookie', async () => {
    const app = createMarketTestApp();
    expect((await request(app).get('/api/auth/me')).body).toEqual({ user: null });

    const forged = await request(app).get('/api/auth/me').set('Cookie', 'agriai_session=eyJhbGciOiJIUzI1NiJ9.e30.bad');
    expect(forged.body).toEqual({ user: null });
  });

  it('logout ends the session, also for a copied cookie', async () => {
    const app = createMarketTestApp();
    const agent = client(app);
    const registered = await agent
      .post('/api/auth/register')
      .send({ phone: nextPhone(), pin: '4826', name: 'रमेश', role: 'buyer' });
    const copiedCookie = String(registered.headers['set-cookie']).split(';')[0] ?? '';
    expect((await request(app).get('/api/auth/me').set('Cookie', copiedCookie)).body.user).not.toBeNull();

    expect((await agent.post('/api/auth/logout')).status).toBe(200);
    expect((await agent.get('/api/auth/me')).body.user).toBeNull();
    expect((await request(app).get('/api/auth/me').set('Cookie', copiedCookie)).body.user).toBeNull();
  });

  it('refuses state-changing requests without the app header (CSRF defence)', async () => {
    const app = createMarketTestApp();
    const res = await request(app).post('/api/auth/login').send({ phone: nextPhone(), pin: '4826' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('answers 503 for marketplace endpoints when the marketplace is off; the advisor still works', async () => {
    const app = createTestApp();
    expect((await request(app).get('/api/auth/me')).status).toBe(503);
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

describe('linking the advisor device to the account', () => {
  it('links the device used at sign-up', async () => {
    const deviceId = randomUUID();
    const { user } = await registerAs(createMarketTestApp(), 'seller', { deviceId });
    expect(user).toMatchObject({ deviceId });
  });

  it('links the device on first login and keeps it when logging in from another phone', async () => {
    const app = createMarketTestApp();
    const { phone } = await registerAs(app, 'buyer');
    const firstDevice = randomUUID();

    const first = await client(app).post('/api/auth/login').send({ phone, pin: '4826', deviceId: firstDevice });
    expect(first.body.user.deviceId).toBe(firstDevice);

    const second = await client(app).post('/api/auth/login').send({ phone, pin: '4826', deviceId: randomUUID() });
    expect(second.body.user.deviceId).toBe(firstDevice);
  });
});

describe('profiles and role access', () => {
  it('only a logged-in seller can save a seller profile', async () => {
    const app = createMarketTestApp();
    expect((await client(app).put('/api/account/seller-profile').send(sellerProfile)).status).toBe(401);

    const buyer = await registerAs(app, 'buyer');
    expect((await buyer.agent.put('/api/account/seller-profile').send(sellerProfile)).status).toBe(403);

    const seller = await registerAs(app, 'seller');
    const res = await seller.agent.put('/api/account/seller-profile').send(sellerProfile);
    expect(res.status).toBe(200);
    expect(res.body.user.seller).toMatchObject({ status: 'pending', upiId: 'sunita@okaxis', profileComplete: true });
    expect(res.body.user.name).toBe('सुनीता देवी');
  });

  it('rejects an invalid UPI ID', async () => {
    const seller = await registerAs(createMarketTestApp(), 'seller');
    const res = await seller.agent.put('/api/account/seller-profile').send({ ...sellerProfile, upiId: 'not a upi' });
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('sends a verified seller back to pending when the UPI ID changes', async () => {
    const app = createMarketTestApp();
    const seller = await registerAs(app, 'seller');
    await seller.agent.put('/api/account/seller-profile').send(sellerProfile);
    await UserModel.updateOne({ _id: seller.user.id }, { 'seller.status': 'verified' });

    const sameUpi = await seller.agent.put('/api/account/seller-profile').send({ ...sellerProfile, village: 'रतनगढ़' });
    expect(sameUpi.body.user.seller.status).toBe('verified');

    const newUpi = await seller.agent.put('/api/account/seller-profile').send({ ...sellerProfile, upiId: 'other@ybl' });
    expect(newUpi.body.user.seller.status).toBe('pending');
  });

  it('a buyer can save a business profile; a seller cannot', async () => {
    const app = createMarketTestApp();
    const buyer = await registerAs(app, 'buyer');
    const body = { name: 'होटल मरुधर', buyerType: 'business', businessName: 'होटल मरुधर', village: 'चूरू' };
    const res = await buyer.agent.put('/api/account/buyer-profile').send(body);
    expect(res.body.user.buyer).toMatchObject({ buyerType: 'business', businessName: 'होटल मरुधर' });

    const seller = await registerAs(app, 'seller');
    expect((await seller.agent.put('/api/account/buyer-profile').send(body)).status).toBe(403);
  });
});
