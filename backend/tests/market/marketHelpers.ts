import request from 'supertest';
import { createApp, type AppDependencies } from '../../src/app.js';
import { AuthService } from '../../src/modules/auth/auth.service.js';
import { PinCredentials } from '../../src/modules/auth/credentials.js';
import type { MarketDependencies } from '../../src/modules/marketRouter.js';
import { createFakeProvider } from '../helpers.js';

/** Low bcrypt cost keeps the tests fast; production uses AUTH_RULES.bcryptCost. */
export const testCredentials = new PinCredentials(4);

/** A clock the tests can move forward (lockout, months). */
export function createClock(start = '2026-11-10T06:30:00Z') {
  let current = new Date(start);
  return {
    now: () => new Date(current),
    advanceMinutes: (minutes: number) => {
      current = new Date(current.getTime() + minutes * 60_000);
    },
    set: (iso: string) => {
      current = new Date(iso);
    },
  };
}

export function createMarketTestApp(
  market: Partial<MarketDependencies> = {},
  deps: Partial<Omit<AppDependencies, 'market'>> = {},
) {
  return createApp({
    aiProvider: createFakeProvider(),
    historyRepository: null,
    corsOrigins: ['http://localhost:5173'],
    ...deps,
    market: {
      config: { jwtSecret: 'test-secret-test-secret-test-secret!', cookieSecure: false, commissionBps: 300 },
      credentials: testCredentials,
      ...market,
    },
  });
}

type App = ReturnType<typeof createMarketTestApp>;

/** A cookie-keeping client that sends the app header like the real frontend. */
export function client(app: App) {
  return request.agent(app).set('X-Requested-With', 'agriai');
}

let phoneCounter = 0;
/** A unique valid mobile number per call. */
export function nextPhone(): string {
  phoneCounter += 1;
  return `98${String(10_000_000 + phoneCounter).slice(-8)}`;
}

export async function registerAs(app: App, role: 'seller' | 'buyer', extra: Record<string, unknown> = {}) {
  const agent = client(app);
  const phone = nextPhone();
  const res = await agent.post('/api/auth/register').send({ phone, pin: '4826', name: `${role} ji`, role, ...extra });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, phone, user: res.body.user as { id: string; role: string } };
}

export async function loginCoordinator(app: App) {
  const phone = nextPhone();
  const auth = new AuthService(testCredentials);
  const user = await auth.createAccount({ phone, pin: '7391', name: 'संयोजक', role: 'coordinator' });
  const agent = client(app);
  const res = await agent.post('/api/auth/login').send({ phone, pin: '7391' });
  if (res.status !== 200) throw new Error(`coordinator login failed: ${res.status}`);
  return { agent, id: user._id.toString() };
}

export const sellerProfile = {
  name: 'सुनीता देवी',
  village: 'घांघू',
  shgName: 'जय माँ स्वयं सहायता समूह',
  upiId: 'sunita@okaxis',
  pickup: { district: 'चूरू', tehsil: 'चूरू', lat: 28.3, lon: 74.95 },
};

/** A seller with a complete profile, verified by a coordinator unless `verified: false`. */
export async function readySeller(app: App, { verified = true }: { verified?: boolean } = {}) {
  const seller = await registerAs(app, 'seller');
  const saved = await seller.agent.put('/api/account/seller-profile').send(sellerProfile);
  if (saved.status !== 200) throw new Error(`seller profile failed: ${saved.status} ${JSON.stringify(saved.body)}`);
  if (verified) {
    const coordinator = await loginCoordinator(app);
    const res = await coordinator.agent.post(`/api/admin/sellers/${seller.user.id}/verify`).send({});
    if (res.status !== 200) throw new Error(`verify failed: ${res.status}`);
  }
  return seller;
}
