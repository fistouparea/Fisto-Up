import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../observability/logger.js';
import { PUSH_RULES } from '../config/notificationRules.js';
import { runNotificationJob, type NotificationJobDeps } from './notificationJob.js';

/** Runs the push job twice a day (India time). Only started when push and MongoDB are configured. */
export function startNotificationScheduler(deps: NotificationJobDeps): ScheduledTask {
  const task = cron.schedule(
    PUSH_RULES.cron,
    async () => {
      const result = await runNotificationJob(deps);
      logger.info({ job: 'push', ...result }, 'push job finished');
    },
    { timezone: PUSH_RULES.timezone, noOverlap: true, name: 'push-notifications' },
  );
  logger.info({ cron: PUSH_RULES.cron, timezone: PUSH_RULES.timezone }, 'push notifications scheduled');
  return task;
}
