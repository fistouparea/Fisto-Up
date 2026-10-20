import { NOTIFICATION_TEXTS } from '../../config/notificationRules.js';
import { CROP_NAMES } from '../../data/cropNames.js';
import type { FollowUpDue } from '../../types/history.js';
import type { AppNotification } from '../../types/notifications.js';
import type { WeatherAlert } from '../../types/weather.js';
import { todayInIndia } from '../../utils/dates.js';
import type { CropStageInfo } from '../agro/cropStage.js';

interface NotificationInput {
  alerts: WeatherAlert[];
  crops: (CropStageInfo & { sowingDate: string })[];
  followUps: FollowUpDue[];
  today: string;
}

/** Turns the farm's current situation into notifications, most urgent first. */
export function buildNotifications({ alerts, crops, followUps, today }: NotificationInput): AppNotification[] {
  const alertItems: AppNotification[] = alerts.map((alert) => ({
    id: `alert:${alert.type}:${alert.date}`,
    type: 'alert',
    severity: alert.severity,
    title: alert.title,
    body: [alert.detail, alert.advice[0]].filter(Boolean).join('। '),
    href: '#/weather',
    date: alert.date,
  }));

  const followUpItems: AppNotification[] = followUps.map((followUp) => ({
    id: `followup:${followUp.id}`,
    type: 'followup',
    severity: 'warning',
    title: NOTIFICATION_TEXTS.followUpTitle,
    body: `${CROP_NAMES[followUp.crop]}: ${followUp.problemName}`,
    href: '#/notifications',
    date: todayInIndia(followUp.createdAt),
    crop: followUp.crop,
    diagnosisId: followUp.id,
  }));

  // One task notification per crop and stage: it appears when a new stage starts.
  const taskItems: AppNotification[] = crops
    .filter((crop) => crop.stage !== null && crop.tasks.length > 0)
    .map((crop) => ({
      id: `task:${crop.crop}:${crop.stage}:${crop.sowingDate}`,
      type: 'task',
      severity: 'info',
      title: NOTIFICATION_TEXTS.taskTitle.replace('{crop}', CROP_NAMES[crop.crop]).replace('{stage}', crop.stageName ?? ''),
      body: crop.tasks[0] ?? '',
      href: '#/calendar',
      date: today,
      crop: crop.crop,
    }));

  const dangerFirst = (items: AppNotification[]) => [...items].sort((a, b) => Number(b.severity === 'danger') - Number(a.severity === 'danger'));
  return [...dangerFirst(alertItems), ...followUpItems, ...taskItems];
}
