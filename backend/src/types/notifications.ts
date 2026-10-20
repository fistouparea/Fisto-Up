import type { CropId } from './diagnosis.js';

export type NotificationType = 'alert' | 'task' | 'followup';

/**
 * In-app and push notification. `id` is stable for the same event (e.g. "alert:frost:2026-11-12"),
 * so the phone can remember what was read and the server what was already pushed.
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  body: string;
  /** Frontend route to open, e.g. "#/weather". */
  href: string;
  /** India date the notification is about. */
  date: string;
  crop?: CropId;
  /** For follow-ups: the diagnosis being asked about. */
  diagnosisId?: string;
}
