import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

/**
 * Connects mongoose to a fresh agriai_test_* database for this test file and drops only that database
 * afterwards. Collections are emptied before each test so tests do not depend on each other.
 */
export function useTestDatabase(): void {
  const dbName = `agriai_test_${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(inject('mongoUri'), { dbName, serverSelectionTimeoutMS: 10_000 });
    // Indexes (unique phone, unique order per commission entry, ...) must exist before the first test.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  });

  beforeEach(async () => {
    const collections = await mongoose.connection.db?.collections();
    await Promise.all((collections ?? []).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    if (mongoose.connection.db?.databaseName === dbName) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });
}
