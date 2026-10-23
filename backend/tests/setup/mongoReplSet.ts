import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** In-memory single-node replica set (transactions work). Each test file uses its own agriai_test_* database. */
    mongoUri: string;
  }
}

/**
 * Starts one throwaway MongoDB replica set for the whole test run. It is a separate process with its own
 * temporary data folder, so it never touches the MongoDB on this machine.
 */
export default async function setup(project: TestProject) {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  project.provide('mongoUri', replSet.getUri());
  return async () => {
    await replSet.stop();
  };
}
