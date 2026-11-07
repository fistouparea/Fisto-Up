import { z } from 'zod';
import { productInfo, type ProductId } from '../../config/marketCatalog.js';
import { DASHBOARD_WEEKS, FARMER_EVENTS } from '../../config/metrics.js';
import { PRICING_RULES } from '../../config/marketRules.js';
import { DiagnosisRecord } from '../../models/DiagnosisRecord.js';
import { logger } from '../../observability/logger.js';
import type { MandiProvider } from '../../services/mandi/agmarknetProvider.js';
import type { CropId } from '../../types/diagnosis.js';
import { FOLLOW_UP_ANSWERS, type FollowUpAnswer } from '../../types/history.js';
import { toCsv } from '../../utils/csv.js';
import { lastWeeks, weekStartInstant } from '../../utils/weeks.js';
import { CommissionEntryModel } from '../commission/commission.model.js';
import { DiagnosisFeedbackModel } from '../feedback/feedback.model.js';
import { ListingModel, VISIBLE_LISTING_FILTER } from '../listings/listing.model.js';
import { OrderModel } from '../orders/order.model.js';
import { EventModel } from './event.model.js';

export const dashboardQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(DASHBOARD_WEEKS.max).default(DASHBOARD_WEEKS.default),
});

/** MongoDB: the Monday (India time) of a date field, as "YYYY-MM-DD" — the same as utils/weeks.ts weekOf(). */
const weekOfField = (field: string) => ({
  $dateToString: {
    format: '%Y-%m-%d',
    timezone: 'Asia/Kolkata',
    date: { $dateTrunc: { date: field, unit: 'week', startOfWeek: 'monday', timezone: 'Asia/Kolkata' } },
  },
});

export interface PilotDashboard {
  weeks: string[];
  weeklyActiveFarmers: { week: string; farmers: number }[];
  diagnoses: { week: string; ok: number; unclear: number }[];
  aiFeedbackByCrop: { crop: CropId; answers: number; helpful: number; helpfulPercent: number }[];
  followUps: Record<FollowUpAnswer, number>;
  market: { week: string; listings: number; orders: number; completed: number; salesPaise: number; commissionPaise: number }[];
  totals: { listings: number; activeListings: number; orders: number; completedOrders: number; salesPaise: number; commissionPaise: number };
  priceVsMandi: {
    product: ProductId;
    listings: number;
    /** Average asking price on the platform, per quintal. */
    listedPerQuintalPaise: number | null;
    /** Average price in completed orders, per quintal (what farmers really got). */
    soldPerQuintalPaise: number | null;
    /** Median modal price at nearby mandis today, per quintal (null without DATA_GOV_API_KEY). */
    mandiPerQuintalPaise: number | null;
  }[];
}

/**
 * Everything on the coordinator's "Pilot Dashboard", for the last `weeks` weeks (current week last).
 * Built from anonymous events and from the platform's own records; no names or numbers ever leave here.
 */
export async function pilotDashboard(weeksBack: number, mandi: MandiProvider | null, now = new Date()): Promise<PilotDashboard> {
  const weeks = lastWeeks(weeksBack, now);
  const from = weekStartInstant(weeks[0] ?? '');
  const [weeklyActiveFarmers, diagnoses, aiFeedbackByCrop, followUps, market, totals, priceVsMandi] = await Promise.all([
    weeklyActive(weeks),
    diagnosesPerWeek(weeks),
    feedbackByCrop(from),
    followUpResults(from),
    marketPerWeek(weeks, from),
    marketTotals(),
    pricesVsMandi(from, mandi),
  ]);
  return { weeks, weeklyActiveFarmers, diagnoses, aiFeedbackByCrop, followUps, market, totals, priceVsMandi };
}

/** Distinct phones (weekly pseudonyms) with any farmer event in each week. */
async function weeklyActive(weeks: string[]) {
  const rows = await EventModel.aggregate<{ _id: string; farmers: number }>([
    { $match: { week: { $in: weeks }, name: { $in: FARMER_EVENTS }, actor: { $exists: true } } },
    { $group: { _id: { week: '$week', actor: '$actor' } } },
    { $group: { _id: '$_id.week', farmers: { $sum: 1 } } },
  ]).exec();
  const byWeek = new Map(rows.map((row) => [row._id, row.farmers]));
  return weeks.map((week) => ({ week, farmers: byWeek.get(week) ?? 0 }));
}

async function diagnosesPerWeek(weeks: string[]) {
  const rows = await EventModel.aggregate<{ _id: { week: string; name: string }; count: number }>([
    { $match: { week: { $in: weeks }, name: { $in: ['diagnosis_ok', 'diagnosis_unclear'] } } },
    { $group: { _id: { week: '$week', name: '$name' }, count: { $sum: 1 } } },
  ]).exec();
  const count = (week: string, name: string) => rows.find((row) => row._id.week === week && row._id.name === name)?.count ?? 0;
  return weeks.map((week) => ({ week, ok: count(week, 'diagnosis_ok'), unclear: count(week, 'diagnosis_unclear') }));
}

/** 👍 share per crop, most answered first. */
async function feedbackByCrop(from: Date) {
  const rows = await DiagnosisFeedbackModel.aggregate<{ _id: CropId; answers: number; helpful: number }>([
    { $match: { updatedAt: { $gte: from } } },
    { $group: { _id: '$crop', answers: { $sum: 1 }, helpful: { $sum: { $cond: ['$helpful', 1, 0] } } } },
    { $sort: { answers: -1, _id: 1 } },
  ]).exec();
  return rows.map((row) => ({ crop: row._id, answers: row.answers, helpful: row.helpful, helpfulPercent: Math.round((row.helpful / row.answers) * 100) }));
}

/** "क्या फसल ठीक हुई?" answers given in the period: ठीक हुई / वैसी ही / खराब. */
async function followUpResults(from: Date): Promise<Record<FollowUpAnswer, number>> {
  const rows = await DiagnosisRecord.aggregate<{ _id: FollowUpAnswer; count: number }>([
    { $match: { 'followUp.answeredAt': { $gte: from } } },
    { $group: { _id: '$followUp.answer', count: { $sum: 1 } } },
  ]).exec();
  return Object.fromEntries(FOLLOW_UP_ANSWERS.map((answer) => [answer, rows.find((row) => row._id === answer)?.count ?? 0])) as Record<FollowUpAnswer, number>;
}

/** New listings and orders per week; completed orders, sales and commission by completion week (ledger). */
async function marketPerWeek(weeks: string[], from: Date) {
  const perWeek = <T>(rows: (T & { _id: string })[]) => new Map(rows.map((row) => [row._id, row]));
  const [listings, orders, completed] = await Promise.all([
    ListingModel.aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: weekOfField('$createdAt'), count: { $sum: 1 } } }]).exec(),
    OrderModel.aggregate<{ _id: string; count: number }>([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: weekOfField('$createdAt'), count: { $sum: 1 } } }]).exec(),
    CommissionEntryModel.aggregate<{ _id: string; count: number; sales: number; commission: number }>([
      { $match: { completedAt: { $gte: from } } },
      { $group: { _id: weekOfField('$completedAt'), count: { $sum: 1 }, sales: { $sum: '$orderTotalPaise' }, commission: { $sum: '$amountPaise' } } },
    ]).exec(),
  ]);
  const [listingsBy, ordersBy, completedBy] = [perWeek(listings), perWeek(orders), perWeek(completed)];
  return weeks.map((week) => ({
    week,
    listings: listingsBy.get(week)?.count ?? 0,
    orders: ordersBy.get(week)?.count ?? 0,
    completed: completedBy.get(week)?.count ?? 0,
    salesPaise: completedBy.get(week)?.sales ?? 0,
    commissionPaise: completedBy.get(week)?.commission ?? 0,
  }));
}

/** Since the start of the pilot (not only the chosen weeks). */
async function marketTotals() {
  const [listings, activeListings, orders, ledger] = await Promise.all([
    ListingModel.countDocuments().exec(),
    ListingModel.countDocuments(VISIBLE_LISTING_FILTER).exec(),
    OrderModel.countDocuments().exec(),
    CommissionEntryModel.aggregate<{ count: number; sales: number; commission: number }>([
      { $group: { _id: null, count: { $sum: 1 }, sales: { $sum: '$orderTotalPaise' }, commission: { $sum: '$amountPaise' } } },
    ]).exec(),
  ]);
  return {
    listings,
    activeListings,
    orders,
    completedOrders: ledger[0]?.count ?? 0,
    salesPaise: ledger[0]?.sales ?? 0,
    commissionPaise: ledger[0]?.commission ?? 0,
  };
}

/** Price per quintal of a per-unit price: kilo prices × 100. Other units cannot be compared with the mandi. */
function perQuintal(pricePaise: number, unit: string): number | null {
  if (unit === 'quintal') return pricePaise;
  if (unit === 'kg') return pricePaise * PRICING_RULES.kgPerQuintal;
  return null;
}

const average = (values: number[]) => (values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[middle] ?? null) : Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}

/** "Does the farmer get a fair price?": asking and selling prices on the platform next to today's mandi price. */
async function pricesVsMandi(from: Date, mandi: MandiProvider | null): Promise<PilotDashboard['priceVsMandi']> {
  const [listings, orders] = await Promise.all([
    ListingModel.find({ category: 'crop', createdAt: { $gte: from } }, { product: 1, unit: 1, pricePerUnitPaise: 1 }).lean().exec(),
    OrderModel.find({ status: 'completed', updatedAt: { $gte: from } }, { item: 1, pricePerUnitPaise: 1 }).lean().exec(),
  ]);
  const products = [...new Set(listings.map((listing) => listing.product))].filter((product) => productInfo(product).category === 'crop');
  const crops = products.flatMap((product) => {
    const crop = productInfo(product).mandiCrop;
    return crop ? [crop] : [];
  });

  let mandiPrices: { crop: CropId; modalPrice: number }[] = [];
  if (mandi && crops.length > 0) {
    try {
      mandiPrices = await mandi.getPrices(crops);
    } catch (error) {
      logger.warn({ err: error }, 'mandi prices unavailable for the dashboard');
    }
  }

  return products.map((product) => {
    const listed = listings.filter((listing) => listing.product === product).flatMap((listing) => perQuintal(listing.pricePerUnitPaise, listing.unit) ?? []);
    const sold = orders.filter((order) => order.item.product === product).flatMap((order) => perQuintal(order.pricePerUnitPaise, order.item.unit) ?? []);
    const crop = productInfo(product).mandiCrop;
    // Mandi prices are rupees per quintal.
    const mandiModal = median(mandiPrices.filter((price) => price.crop === crop).map((price) => price.modalPrice * 100));
    return {
      product,
      listings: listings.filter((listing) => listing.product === product).length,
      listedPerQuintalPaise: average(listed),
      soldPerQuintalPaise: average(sold),
      mandiPerQuintalPaise: mandiModal,
    };
  });
}

const rupees = (paise: number | null) => (paise === null ? '' : (paise / 100).toFixed(2));

/** One CSV per dashboard section (Excel-ready, Hindi-safe). Contains no personal data. */
export const DASHBOARD_EXPORTS = {
  'weekly-active-farmers': (data: PilotDashboard) => toCsv(['week_start', 'active_farmers'], data.weeklyActiveFarmers.map((row) => [row.week, row.farmers])),
  diagnoses: (data: PilotDashboard) => toCsv(['week_start', 'diagnoses_ok', 'diagnoses_unclear'], data.diagnoses.map((row) => [row.week, row.ok, row.unclear])),
  'ai-feedback-by-crop': (data: PilotDashboard) =>
    toCsv(['crop', 'answers', 'thumbs_up', 'thumbs_up_percent'], data.aiFeedbackByCrop.map((row) => [row.crop, row.answers, row.helpful, row.helpfulPercent])),
  'follow-ups': (data: PilotDashboard) => toCsv(['answer', 'count'], FOLLOW_UP_ANSWERS.map((answer) => [answer, data.followUps[answer]])),
  market: (data: PilotDashboard) =>
    toCsv(
      ['week_start', 'new_listings', 'new_orders', 'completed_orders', 'sales_rupees', 'commission_rupees'],
      data.market.map((row) => [row.week, row.listings, row.orders, row.completed, rupees(row.salesPaise), rupees(row.commissionPaise)]),
    ),
  'price-vs-mandi': (data: PilotDashboard) =>
    toCsv(
      ['product', 'listings', 'avg_listed_rupees_per_quintal', 'avg_sold_rupees_per_quintal', 'mandi_modal_rupees_per_quintal'],
      data.priceVsMandi.map((row) => [row.product, row.listings, rupees(row.listedPerQuintalPaise), rupees(row.soldPerQuintalPaise), rupees(row.mandiPerQuintalPaise)]),
    ),
} as const;

export type DashboardExport = keyof typeof DASHBOARD_EXPORTS;
export const DASHBOARD_EXPORT_NAMES = Object.keys(DASHBOARD_EXPORTS) as DashboardExport[];

/** The farmers' own words about AI answers, for the KVK expert: crop, problem, 👍/👎, comment, date. No device id. */
export async function feedbackCommentsCsv(from: Date): Promise<string> {
  const rows = await DiagnosisFeedbackModel.find({ updatedAt: { $gte: from }, comment: { $exists: true } }, { _id: 0, deviceId: 0 })
    .sort({ updatedAt: -1 })
    .limit(5_000)
    .lean()
    .exec();
  return toCsv(
    ['date', 'crop', 'problem', 'severity', 'helpful', 'comment'],
    rows.map((row) => [row.updatedAt.toISOString().slice(0, 10), row.crop, row.problemName, row.severity ?? '', row.helpful ? 'yes' : 'no', row.comment ?? '']),
  );
}
