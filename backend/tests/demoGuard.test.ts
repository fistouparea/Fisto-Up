import { describe, expect, it } from 'vitest';
import { databaseName, demoResetProblem } from '../src/scripts/demoGuard.js';

describe('demo:reset safety', () => {
  it('reads the database name from common URIs', () => {
    expect(databaseName('mongodb://localhost:27017/agriai_demo')).toBe('agriai_demo');
    expect(databaseName('mongodb://a:1,b:2/agriai_demo2?replicaSet=rs0')).toBe('agriai_demo2');
    expect(databaseName('mongodb+srv://u:p@cluster0.x.mongodb.net/agriai?retryWrites=true')).toBe('agriai');
    expect(databaseName('mongodb://localhost:27017')).toBe('');
    expect(databaseName('postgres://x/y')).toBeNull();
  });

  it('runs only on an agriai_demo… database outside production', () => {
    expect(demoResetProblem('mongodb://localhost:27017/agriai_demo', 'development')).toBeNull();
    expect(demoResetProblem('mongodb://localhost:27017/agriai_demo_judges', undefined)).toBeNull();
  });

  it('refuses production, the real database, other projects and a missing name', () => {
    expect(demoResetProblem('mongodb://localhost:27017/agriai_demo', 'production')).toMatch(/production/);
    for (const name of ['agriai', 'FistoUp', 'DM-platform', 'sportDB', 'agriai_test_x', 'demo_agriai']) {
      expect(demoResetProblem(`mongodb://localhost:27017/${name}`, 'development')).toMatch(/demo database nahi/);
    }
    expect(demoResetProblem('mongodb://localhost:27017', 'development')).toMatch(/demo database nahi/);
    expect(demoResetProblem(undefined, 'development')).toMatch(/set nahi/);
    expect(demoResetProblem('not a uri', 'development')).toMatch(/samajh nahi/);
  });
});
