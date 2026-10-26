import { createHmac, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { EVENT_RETENTION_DAYS, type EventName } from '../../config/metrics.js';
import { logger } from '../../observability/logger.js';
import { addDays, todayInIndia } from '../../utils/dates.js';
import { weekOf } from '../../utils/weeks.js';
import type { DeviceDataSource } from '../privacy/privacy.service.js';
import { EventModel } from './event.model.js';

/** Fixed values only (see config/metrics.ts). */
export type EventProps = Record<string, string | boolean>;

/** Without METRICS_SALT (development) a random key per process: weekly counts still work within one run. */
let salt = randomBytes(32).toString('hex');

export function configureEvents(options: { salt: string }): void {
  salt = options.salt;
}

/** Pseudonym of a phone for one week (not reversible without the server's key, different every week). */
export function actorHash(deviceId: string, week: string): string {
  return createHmac('sha256', salt).update(`${deviceId}|${week}`).digest('base64url').slice(0, 22);
}

/**
 * Records a product event in the background. Never slows down or fails the request: without a database
 * connection the event is dropped, and write errors are only logged.
 */
export function track(name: EventName, { deviceId, props, now = new Date() }: { deviceId?: string; props?: EventProps; now?: Date } = {}): void {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.connected) return;
  const week = weekOf(now);
  EventModel.create({ name, at: now, week, ...(deviceId && { actor: actorHash(deviceId, week) }), ...(props && { props }) }).catch((error: unknown) =>
    logger.warn({ err: error, event: name }, 'event not recorded'),
  );
}

/**
 * "मेरा डेटा मिटाएँ": events carry no device id, but the server could recompute the weekly hashes; so the
 * phone's events of every week still kept are deleted too. Nothing to export (they say nothing about the person).
 */
export const eventDeviceData: DeviceDataSource = {
  name: 'usageEvents',
  export: async () => 'Only anonymous counts (no personal data)',
  erase: async ({ deviceIds }) => {
    const today = todayInIndia();
    const weeks = new Set(Array.from({ length: Math.ceil(EVENT_RETENTION_DAYS / 7) + 1 }, (_, index) => weekOf(new Date(`${addDays(today, -7 * index)}T12:00:00+05:30`))));
    const actors = deviceIds.flatMap((deviceId) => [...weeks].map((week) => actorHash(deviceId, week)));
    return (await EventModel.deleteMany({ actor: { $in: actors } }).exec()).deletedCount;
  },
};
