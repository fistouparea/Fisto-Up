import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoFarmProfileRepository } from '../src/services/farm/mongoFarmProfileRepository.js';
import { addDays, todayInIndia } from '../src/utils/dates.js';

/** Real MongoDB only when MONGO_URI_TEST is set; uses and drops a throwaway database. */
const MONGO_URI_TEST = process.env.MONGO_URI_TEST;

describe.skipIf(!MONGO_URI_TEST)('MongoFarmProfileRepository with a real MongoDB', () => {
  const dbName = `agriai_test_${randomUUID().slice(0, 8)}`;
  const repository = new MongoFarmProfileRepository();

  beforeAll(async () => {
    await mongoose.connect(MONGO_URI_TEST ?? '', { dbName, serverSelectionTimeoutMS: 5_000 });
    await mongoose.connection.syncIndexes();
  });

  afterAll(async () => {
    if (mongoose.connection.db?.databaseName === dbName) await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  });

  it('upserts one profile per device and lists those with a location', async () => {
    const device = randomUUID();
    const sowingDate = addDays(todayInIndia(), -20);

    expect(await repository.get(device)).toBeNull();
    await repository.save(device, { crops: [{ crop: 'bajra', sowingDate }] });
    const updated = await repository.save(device, {
      crops: [{ crop: 'chana', sowingDate }],
      location: { lat: 28.3, lon: 74.95, source: 'gps' },
      irrigation: 'canal',
    });

    expect(updated).toMatchObject({ crops: [{ crop: 'chana', sowingDate }], irrigation: 'canal' });
    expect(updated.updatedAt).toBeInstanceOf(Date);
    expect(await repository.get(device)).toMatchObject({ crops: [{ crop: 'chana' }] });

    await repository.save(randomUUID(), { crops: [] }); // no location
    const withLocation = await repository.listWithLocation();
    expect(withLocation.map((profile) => profile.deviceId)).toEqual([device]);
  });
});
