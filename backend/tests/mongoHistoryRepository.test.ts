import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoHistoryRepository } from '../src/services/history/mongoHistoryRepository.js';
import { healthyDiagnosis } from './helpers.js';

const { is_plant_image: _p, confidence: _c, ...diagnosis } = healthyDiagnosis;

describe('MongoHistoryRepository without a database connection', () => {
  it('fails fast with HISTORY_UNAVAILABLE instead of hanging', async () => {
    mongoose.set('bufferCommands', false);
    const repository = new MongoHistoryRepository();
    const started = Date.now();

    await expect(repository.save({ deviceId: randomUUID(), crop: 'bajra', diagnosis })).rejects.toMatchObject({
      code: 'HISTORY_UNAVAILABLE',
    });
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});

/**
 * Runs against a real MongoDB only when MONGO_URI_TEST is set, e.g.
 * MONGO_URI_TEST=mongodb://localhost:27017 npm test
 * Uses a throwaway database with a random name and drops only that database afterwards.
 */
const MONGO_URI_TEST = process.env.MONGO_URI_TEST;

describe.skipIf(!MONGO_URI_TEST)('MongoHistoryRepository with a real MongoDB', () => {
  const dbName = `agriai_test_${randomUUID().slice(0, 8)}`;
  const repository = new MongoHistoryRepository();
  const device = randomUUID();

  beforeAll(async () => {
    await mongoose.connect(MONGO_URI_TEST ?? '', { dbName, serverSelectionTimeoutMS: 5_000 });
  });

  afterAll(async () => {
    if (mongoose.connection.db?.databaseName === dbName) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  it('saves, lists latest first with pagination, and finds by id for the same device only', async () => {
    for (const problem of ['पहला', 'दूसरा', 'तीसरा']) {
      await repository.save({ deviceId: device, crop: 'guar', diagnosis: { ...diagnosis, problem_name: problem } });
    }
    await repository.save({ deviceId: randomUUID(), crop: 'bajra', diagnosis });
    await repository.save({ deviceId: device, crop: 'chana', diagnosis: { ...diagnosis, problem_name: 'चौथा', severity: 'mild' } });

    const newest = await repository.list(device, 1, 1);
    expect(newest.items[0]).toMatchObject({ problemName: 'चौथा', severity: 'mild' });
    expect((await repository.findById(device, newest.items[0]?.id ?? ''))?.diagnosis.severity).toBe('mild');

    const firstPage = await repository.list(device, 1, 2);
    expect(firstPage.items.map((item) => item.problemName)).toEqual(['चौथा', 'तीसरा']);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.items[1]).not.toHaveProperty('severity');
    expect(firstPage.items[0]?.createdAt).toBeInstanceOf(Date);

    const secondPage = await repository.list(device, 2, 2);
    expect(secondPage.items.map((item) => item.problemName)).toEqual(['दूसरा', 'पहला']);
    expect(secondPage.hasMore).toBe(false);

    const id = firstPage.items[1]?.id ?? '';
    const found = await repository.findById(device, id);
    expect(found).toMatchObject({ id, crop: 'guar', diagnosis: { ...diagnosis, problem_name: 'तीसरा' } });

    expect(await repository.findById(randomUUID(), id)).toBeNull();
    expect(await repository.findById(device, 'not-an-object-id')).toBeNull();
  });

  it('lists follow-ups due (not healthy, not answered, in the window) and records answers', async () => {
    const followDevice = randomUUID();
    await repository.save({ deviceId: followDevice, crop: 'chana', diagnosis: { ...diagnosis, severity: 'serious' } });
    await repository.save({ deviceId: followDevice, crop: 'bajra', diagnosis: { ...diagnosis, severity: 'healthy' } });
    const window = { from: new Date(Date.now() - 60_000), to: new Date(Date.now() + 60_000) };

    const due = await repository.listFollowUpsDue(followDevice, window.from, window.to);
    expect(due.map((item) => item.crop)).toEqual(['chana']);
    expect(await repository.listFollowUpsDue(followDevice, new Date(0), new Date(1000))).toEqual([]);

    expect(await repository.setFollowUp(randomUUID(), due[0]?.id ?? '', 'better')).toBe(false);
    expect(await repository.setFollowUp(followDevice, due[0]?.id ?? '', 'better')).toBe(true);
    expect(await repository.listFollowUpsDue(followDevice, window.from, window.to)).toEqual([]);
    expect((await repository.findById(followDevice, due[0]?.id ?? ''))?.followUp?.answer).toBe('better');
  });
});
