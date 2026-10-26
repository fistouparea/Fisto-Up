import type { BookingStatus } from '../modules/services/bookingStateMachine.js';

/** Hindi notification texts for service bookings and approvals. `what` = e.g. "ट्रैक्टर – 2 दिन". */
export const BOOKING_MESSAGES: Record<BookingStatus, { title: string; body: (what: string, by: string) => string }> = {
  requested: { title: 'नई बुकिंग की माँग', body: (what, by) => `${by} ने ${what} माँगा है। "हाँ" या "ना" दबाएँ।` },
  accepted: { title: 'बुकिंग मंज़ूर', body: (what) => `${what}: मंज़ूर हो गया। अब दोनों का फोन नंबर ऐप में दिखेगा।` },
  rejected: { title: 'बुकिंग मना हुई', body: (what) => `${what}: मना हो गया। कोई दूसरा देखें।` },
  cancelled: { title: 'बुकिंग रद्द', body: (what) => `${what}: रद्द हो गया।` },
  completed: { title: 'काम पूरा', body: (what) => `${what}: पूरा हुआ। रेटिंग दें।` },
};

export const APPROVAL_MESSAGES = {
  approved: { title: 'लिस्टिंग मंज़ूर', body: (title: string) => `"${title}" अब सबको दिख रही है।` },
  rejected: { title: 'लिस्टिंग नामंज़ूर', body: (title: string, reason: string) => `"${title}" नामंज़ूर: ${reason}` },
  pending: { title: 'मंज़ूरी चाहिए', body: (title: string) => `नई लिस्टिंग "${title}" जाँचें।` },
} as const;
