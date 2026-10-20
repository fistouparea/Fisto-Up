import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoPushSubscriptionRepository } from '../src/services/push/mongoPushSubscriptionRepository.js';

/** Real MongoDB only when MONGO_URI_TEST is set; uses and drops a throwaway database. */
const MONGO_URI_TEST = process.env.MONGO_URI_TEST;

describe.skipIf(!MONGO_URI_TEST)('MongoPushSubscriptionRepository with a real MongoDB', () => {
  const dbName = `agriai_test_${randomUUID().slice(0, 8)}`;
  const repository = new MongoPushSubscriptionRepository();

  beforeAll(async () => {
    await mongoose.connect(MONGO_URI_TEST ?? '', { dbName, serverSelectionTimeoutMS: 5_000 });
    await mongoose.connection.syncIndexes();
  });

  afterAll(async () => {
    if (mongoose.connection.db?.databaseName === dbName) await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  it('upserts by endpoint, keeps only the newest sent ids, and removes', async () => {
    const device = randomUUID();
    const subscription = { endpoint: 'https://push.example.com/1', keys: { p256dh: 'p', auth: 'a' } };
    await repository.save(device, subscription);
    await repository.save(device, { ...subscription, keys: { p256dh: 'p2', auth: 'a2' } });

    await repository.markSent(subscription.endpoint, ['a', 'b'], 3);
    await repository.markSent(subscription.endpoint, ['c', 'd'], 3);

    const all = await repository.listAll();
    expect(all).toEqual([{ deviceId: device, subscription: { ...subscription, keys: { p256dh: 'p2', auth: 'a2' } }, sentIds: ['b', 'c', 'd'] }]);

    await repository.remove(subscription.endpoint);
    expect(await repository.listAll()).toEqual([]);
  });
});
