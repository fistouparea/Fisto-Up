/**
 * Complaints and disputes (orders, service bookings, listings). Change numbers and texts here.
 * The flow: open → in_progress → resolved (valid) / rejected (not valid). A coordinator answers within the SLA.
 */
export const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_TRANSITIONS: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  open: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
};

export const COMPLAINT_RULES = {
  /** A coordinator should answer (first step) within this many hours. */
  slaHours: 48,
  /** A seller/owner with this many valid (resolved) complaints in `flagWindowDays` is flagged for review. */
  flagThreshold: 3,
  flagWindowDays: 90,
  maxTextLength: 1000,
  maxMessageLength: 500,
  maxMessages: 50,
  rateLimit: { windowMs: 60 * 60_000, limit: 10 },
} as const;

export const COMPLAINT_TEXTS = {
  newTitle: 'नई शिकायत',
  status: {
    open: 'शिकायत दर्ज हुई',
    in_progress: 'शिकायत पर काम चल रहा है',
    resolved: 'शिकायत हल हुई',
    rejected: 'शिकायत बंद (सही नहीं पाई गई)',
  } satisfies Record<ComplaintStatus, string>,
  message: 'शिकायत पर नया संदेश',
  flagged: 'विक्रेता जाँच के लिए चिह्नित',
} as const;
