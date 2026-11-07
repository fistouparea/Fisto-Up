import { Types } from 'mongoose';
import { DiagnosisRecord } from '../models/DiagnosisRecord.js';
import { FarmProfileModel } from '../models/FarmProfile.js';
import { PushSubscriptionModel } from '../models/PushSubscription.js';
import { AuditLogModel } from '../modules/audit/audit.model.js';
import { UserModel } from '../modules/auth/user.model.js';
import { CommissionEntryModel } from '../modules/commission/commission.model.js';
import { ListingModel, VISIBLE_LISTING_FILTER } from '../modules/listings/listing.model.js';
import { MarketNotificationModel } from '../modules/notifications/notification.model.js';
import { OrderModel } from '../modules/orders/order.model.js';
import { ReportModel } from '../modules/reports/report.model.js';
import { ConsentModel } from '../modules/privacy/privacy.model.js';
import { HelpRequestModel } from '../modules/help/help.model.js';
import { DiagnosisFeedbackModel } from '../modules/feedback/feedback.model.js';

/** Something with MongoDB's explain(), i.e. a mongoose query. */
interface Explainable {
  explain(verbosity: 'queryPlanner'): Promise<unknown>;
}

const anyId = new Types.ObjectId();
const deviceId = '00000000-0000-4000-8000-000000000000';
const VISIBLE = VISIBLE_LISTING_FILTER;

/**
 * The queries the app runs most often (every screen open, every 30 s poll), with the same filter and sort as
 * the real code. `npm run check-indexes` and a test explain each one: none may scan a whole collection.
 * Add new frequent queries here.
 */
export const FREQUENT_QUERIES: { name: string; query: () => Explainable }[] = [
  { name: 'history list (मेरी जाँच)', query: () => DiagnosisRecord.find({ deviceId }).sort({ createdAt: -1 }).limit(11) },
  { name: 'farm profile', query: () => FarmProfileModel.findOne({ deviceId }) },
  { name: 'login by phone', query: () => UserModel.findOne({ phone: '9876543210' }) },
  { name: 'seller list by status', query: () => UserModel.find({ role: 'seller', 'seller.status': 'pending' }).sort({ createdAt: -1 }) },
  { name: 'market search (newest)', query: () => ListingModel.find(VISIBLE).sort({ createdAt: -1, _id: -1 }).limit(21) },
  { name: 'market search by product', query: () => ListingModel.find({ ...VISIBLE, category: 'crop', product: 'bajra' }).sort({ createdAt: -1 }) },
  { name: 'my listings', query: () => ListingModel.find({ sellerId: anyId }).sort({ createdAt: -1 }) },
  { name: 'price suggestion listings', query: () => ListingModel.find({ product: 'achar', unit: 'kg', ...VISIBLE }).sort({ createdAt: -1 }).limit(200) },
  { name: 'buyer orders', query: () => OrderModel.find({ buyerId: anyId }).sort({ updatedAt: -1, _id: -1 }).limit(21) },
  { name: 'seller orders', query: () => OrderModel.find({ sellerId: anyId }).sort({ updatedAt: -1, _id: -1 }).limit(21) },
  { name: 'orders board by status', query: () => OrderModel.find({ status: 'requested' }).sort({ updatedAt: -1 }).limit(300) },
  { name: 'notifications list', query: () => MarketNotificationModel.find({ userId: anyId }).sort({ createdAt: -1 }).limit(50) },
  { name: 'unread notifications count', query: () => MarketNotificationModel.find({ userId: anyId, read: false }) },
  { name: 'push subscriptions of an account', query: () => PushSubscriptionModel.find({ userId: anyId }) },
  { name: 'commission due per seller', query: () => CommissionEntryModel.find({ sellerId: anyId, status: 'due' }) },
  { name: 'commission by month', query: () => CommissionEntryModel.find({ month: '2026-11' }).sort({ completedAt: 1 }) },
  { name: 'open reports', query: () => ReportModel.find({ status: 'open' }).sort({ createdAt: -1 }).limit(200) },
  { name: 'latest consent of a phone', query: () => ConsentModel.find({ deviceId }).sort({ acceptedAt: -1 }).limit(1) },
  { name: 'open help requests', query: () => HelpRequestModel.find({ status: 'open' }).sort({ createdAt: -1 }).limit(200) },
  { name: 'feedback of a phone', query: () => DiagnosisFeedbackModel.find({ deviceId }) },
  { name: 'feedback of a diagnosis', query: () => DiagnosisFeedbackModel.find({ diagnosisId: anyId.toString() }) },
  { name: 'audit log of a record', query: () => AuditLogModel.find({ 'target.id': anyId.toString() }).sort({ at: -1 }) },
];

export interface PlanCheck {
  name: string;
  /** Top stages of the winning plan, e.g. "LIMIT > FETCH > IXSCAN". */
  plan: string;
  fullScan: boolean;
}

/** Explains every frequent query. `fullScan` = MongoDB would read the whole collection (COLLSCAN). */
export async function checkQueryPlans(): Promise<PlanCheck[]> {
  return Promise.all(
    FREQUENT_QUERIES.map(async ({ name, query }) => {
      const stages = stageNames(winningPlan(await query().explain('queryPlanner')));
      return { name, plan: stages.join(' > '), fullScan: stages.includes('COLLSCAN') };
    }),
  );
}

function winningPlan(explained: unknown): unknown {
  const root = Array.isArray(explained) ? explained[0] : explained;
  const planner = isRecord(root) && isRecord(root.queryPlanner) ? root.queryPlanner : {};
  const plan = planner.winningPlan;
  // MongoDB 7+ (slot-based engine) wraps the classic plan in `queryPlan`.
  return isRecord(plan) && isRecord(plan.queryPlan) ? plan.queryPlan : plan;
}

function stageNames(plan: unknown): string[] {
  if (!isRecord(plan)) return [];
  const stage = typeof plan.stage === 'string' ? [plan.stage] : [];
  const children = [plan.inputStage, ...(Array.isArray(plan.inputStages) ? plan.inputStages : [])];
  return [...stage, ...children.flatMap(stageNames)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
