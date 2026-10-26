/**
 * Our own product analytics (no third-party tracker). Events say *what* happened, never *who*:
 * no names, phones, device ids, places, photos or texts. Rules here, code in modules/metrics.
 */
export const EVENT_NAMES = [
  'app_open',
  'dashboard_view',
  'diagnosis_ok',
  'diagnosis_unclear',
  'chat_question',
  'feedback_given',
  'followup_answered',
  'help_request',
  'ai_kit_shown',
  'ai_kit_order',
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** The only events the app itself may send (POST /api/events). Everything else is recorded by the server. */
export const CLIENT_EVENTS = ['app_open'] as const satisfies readonly EventName[];

/** Events from the farmer advisor: a phone with any of them in a week is a "weekly active farmer". */
export const FARMER_EVENTS: readonly EventName[] = ['app_open', 'dashboard_view', 'diagnosis_ok', 'diagnosis_unclear', 'chat_question', 'feedback_given', 'followup_answered'];

/** Events are deleted automatically after this many days. */
export const EVENT_RETENTION_DAYS = 400;

/** Pilot dashboard: how many weeks back (default / max). */
export const DASHBOARD_WEEKS = { default: 8, max: 26 } as const;
