/** When to ask "क्या फसल ठीक हुई?" and how notifications are worded and pushed. */
export const FOLLOW_UP_RULES = {
  /** Ask this many days after a (non-healthy) diagnosis. */
  afterDays: 3,
  /** Stop asking about checks older than this. */
  maxAgeDays: 21,
} as const;

export const PUSH_RULES = {
  /** At most this many push messages per device per run, so farmers are not flooded. */
  maxPerRun: 2,
  /** Remember this many already-sent notification ids per subscription. */
  rememberSentIds: 200,
  /** Twice a day, India time: morning (before field work) and evening. */
  cron: '0 7,18 * * *',
  timezone: 'Asia/Kolkata',
} as const;

export const NOTIFICATION_TEXTS = {
  followUpTitle: 'क्या फसल ठीक हुई?',
  /** {crop} {stage} */
  taskTitle: '{crop}: {stage} — आज का काम',
} as const;
