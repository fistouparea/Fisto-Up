import cron from 'node-cron';
import { PUSH_RULES } from '../config/notificationRules.js';
import { runNotificationJob, type NotificationJobDeps } from './notificationJob.js';

/** Runs the push job twice a day (India time). Only started when push and MongoDB are configured. */
export function startNotificationScheduler(deps: NotificationJobDeps): void {
  cron.schedule(
    PUSH_RULES.cron,
    async () => {
      const result = await runNotificationJob(deps);
      console.log(`Push job: sent ${result.sent}, removed ${result.removed}, failed ${result.failed}`);
    },
    { timezone: PUSH_RULES.timezone, noOverlap: true, name: 'push-notifications' },
  );
  console.log(`Push notifications scheduled (${PUSH_RULES.cron}, ${PUSH_RULES.timezone}).`);
}
