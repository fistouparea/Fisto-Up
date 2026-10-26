import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { flagDefaults } from '../../src/config/featureFlags.js';
import { SCHEME_CHECK_LINE, SCHEMES } from '../../src/data/schemes.js';
import { FarmProfileModel } from '../../src/models/FarmProfile.js';
import { AuditLogModel } from '../../src/modules/audit/audit.model.js';
import { FeatureFlags } from '../../src/modules/flags/flag.service.js';
import { useTestDatabase } from '../setup/testDatabase.js';
import { createMarketTestApp, loginCoordinator, registerAs } from './marketHelpers.js';

useTestDatabase();

const schemesOn = () => new FeatureFlags({ ...flagDefaults(undefined), schemes: 'all' });

describe('scheme data rules', () => {
  it('every scheme has an official https link, a source and a status; verified ones have a date', () => {
    for (const scheme of SCHEMES) {
      expect(scheme.officialLink.startsWith('https://'), scheme.id).toBe(true);
      expect(scheme.source_url.startsWith('https://'), scheme.id).toBe(true);
      if (scheme.status === 'verified') expect(scheme.last_verified, scheme.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('schemes still marked "verify" claim no amounts, eligibility, documents or helplines', () => {
    for (const scheme of SCHEMES.filter((item) => item.status === 'verify')) {
      expect(scheme.summary, scheme.id).not.toMatch(/₹|\d/);
      expect(scheme.whoCanApply, scheme.id).toEqual([]);
      expect(scheme.documents, scheme.id).toEqual([]);
      expect(scheme.helpline, scheme.id).toBeNull();
    }
  });
});

describe('GET /api/schemes', () => {
  it('is off unless the schemes flag allows it', async () => {
    expect((await request(createMarketTestApp()).get('/api/schemes')).status).toBe(403);
  });

  it('lists every scheme with the check line, without hints when there is no farm profile', async () => {
    const res = await request(createMarketTestApp({}, { flags: schemesOn() })).get('/api/schemes');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(SCHEMES.length);
    for (const item of res.body.items) {
      expect(item.checkLine).toBe(SCHEME_CHECK_LINE);
      expect(item.hints).toEqual([]);
    }
  });

  it('gives hints from the farm profile and puts those schemes first', async () => {
    const deviceId = randomUUID();
    await FarmProfileModel.create({ deviceId, crops: [{ crop: 'bajra', sowingDate: '2026-07-10' }], irrigation: 'tubewell' });
    const res = await request(createMarketTestApp({}, { flags: schemesOn() })).get('/api/schemes').query({ deviceId });
    const byId = new Map(res.body.items.map((item: { id: string; hints: string[] }) => [item.id, item.hints]));
    expect(byId.get('pm_kisan')).toHaveLength(1);
    expect(byId.get('raj_pipeline')).toHaveLength(1);
    expect(byId.get('raj_khet_talai')).toEqual([]);
    expect(res.body.items[0].hints.length).toBeGreaterThan(0);
  });

  it('validates the device id', async () => {
    expect((await request(createMarketTestApp({}, { flags: schemesOn() })).get('/api/schemes').query({ deviceId: 'x' })).status).toBe(400);
  });
});

describe('coordinators edit scheme data', () => {
  it('only coordinators; the change is merged, shown and audited', async () => {
    const app = createMarketTestApp({}, { flags: schemesOn() });
    const buyer = await registerAs(app, 'buyer');
    expect((await buyer.agent.put('/api/admin/schemes/pmfby').send({ status: 'verify' })).status).toBe(403);

    const coordinator = await loginCoordinator(app);
    const res = await coordinator.agent
      .put('/api/admin/schemes/pmfby')
      .send({ documents: ['आधार कार्ड', 'बैंक पासबुक'], last_verified: '2026-11-01', status: 'verified' });
    expect(res.status).toBe(200);
    expect(res.body.scheme).toMatchObject({ id: 'pmfby', status: 'verified', documents: ['आधार कार्ड', 'बैंक पासबुक'] });

    const pub = await request(app).get('/api/schemes');
    expect(pub.body.items.find((item: { id: string }) => item.id === 'pmfby').documents).toEqual(['आधार कार्ड', 'बैंक पासबुक']);
    expect(await AuditLogModel.countDocuments({ action: 'scheme.update', 'target.id': 'pmfby' })).toBe(1);
  });

  it('refuses unknown schemes, http links and empty changes', async () => {
    const app = createMarketTestApp({}, { flags: schemesOn() });
    const coordinator = await loginCoordinator(app);
    expect((await coordinator.agent.put('/api/admin/schemes/nope').send({ status: 'verify' })).status).toBe(404);
    expect((await coordinator.agent.put('/api/admin/schemes/pmfby').send({ officialLink: 'http://pmfby.gov.in' })).status).toBe(400);
    expect((await coordinator.agent.put('/api/admin/schemes/pmfby').send({})).status).toBe(400);
  });
});
