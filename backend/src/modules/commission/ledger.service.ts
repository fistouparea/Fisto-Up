import mongoose, { Types } from 'mongoose';
import { AppError } from '../../errors/AppError.js';
import { UserModel } from '../auth/user.model.js';
import { CommissionEntryModel } from './commission.model.js';
import { toCsv } from '../../utils/csv.js';

export interface MonthTotal {
  month: string;
  orders: number;
  salesPaise: number;
  commissionPaise: number;
  collectedPaise: number;
  duePaise: number;
}

export interface SellerDues {
  sellerId: string;
  name: string;
  village?: string;
  phone: string;
  orders: number;
  salesPaise: number;
  commissionPaise: number;
  collectedPaise: number;
  duePaise: number;
}

interface Totals {
  orders: number;
  salesPaise: number;
  commissionPaise: number;
  collectedPaise: number;
}

/** Sums used by every ledger view. Due = commission − collected. All integer paise. */
const TOTALS = {
  orders: { $sum: 1 },
  salesPaise: { $sum: '$orderTotalPaise' },
  commissionPaise: { $sum: '$amountPaise' },
  collectedPaise: { $sum: { $cond: [{ $eq: ['$status', 'collected'] }, '$amountPaise', 0] } },
};

const withDue = <T extends Totals>(row: T) => ({ ...row, duePaise: row.commissionPaise - row.collectedPaise });

/** Month by month, newest first. */
export async function monthlyTotals(): Promise<MonthTotal[]> {
  const rows = await CommissionEntryModel.aggregate<Totals & { _id: string }>([
    { $group: { _id: '$month', ...TOTALS } },
    { $sort: { _id: -1 } },
  ]).exec();
  return rows.map(({ _id, ...totals }) => withDue({ month: _id, ...totals }));
}

/** Partner referrals (input dealers' orders from the "ज़रूरी सामान" kit) month by month: our income source. */
export async function referralTotals(): Promise<MonthTotal[]> {
  const rows = await CommissionEntryModel.aggregate<Totals & { _id: string }>([
    { $match: { type: 'partner_referral' } },
    { $group: { _id: '$month', ...TOTALS } },
    { $sort: { _id: -1 } },
  ]).exec();
  return rows.map(({ _id, ...totals }) => withDue({ month: _id, ...totals }));
}

/** Per seller for one month (or all time without `month`), biggest dues first. */
export async function sellerDues(month?: string): Promise<SellerDues[]> {
  const rows = await CommissionEntryModel.aggregate<Totals & { _id: Types.ObjectId }>([
    ...(month ? [{ $match: { month } }] : []),
    { $group: { _id: '$sellerId', ...TOTALS } },
  ]).exec();
  const sellers = await UserModel.find({ _id: { $in: rows.map((row) => row._id) } }).exec();
  const byId = new Map(sellers.map((user) => [user._id.toString(), user]));

  return rows
    .map(({ _id, ...totals }) => {
      const seller = byId.get(_id.toString());
      return withDue({
        sellerId: _id.toString(),
        name: seller?.name ?? '—',
        ...(seller?.seller?.village && { village: seller.seller.village }),
        phone: seller?.phone ?? '',
        ...totals,
      });
    })
    .sort((a, b) => b.duePaise - a.duePaise || a.name.localeCompare(b.name));
}

/**
 * The coordinator collected the seller's dues (cash/UPI): marks the due lines (of `month`, or all) collected.
 * Read and update run in one transaction, so a double tap can never count the same money twice.
 * Returns exactly what was marked, for the confirmation on screen.
 */
export async function markCollected(sellerId: string, coordinatorId: string, month?: string): Promise<{ entries: number; amountPaise: number }> {
  if (!Types.ObjectId.isValid(sellerId)) throw new AppError('NOT_FOUND');
  const filter = { sellerId: new Types.ObjectId(sellerId), status: 'due' as const, ...(month && { month }) };

  return mongoose.connection.transaction(async (session) => {
    const due = await CommissionEntryModel.find(filter, { _id: 1, amountPaise: 1 }).session(session).lean().exec();
    if (due.length === 0) return { entries: 0, amountPaise: 0 };
    await CommissionEntryModel.updateMany(
      { _id: { $in: due.map((entry) => entry._id) } },
      { $set: { status: 'collected', collectedAt: new Date(), collectedBy: coordinatorId } },
      { session },
    ).exec();
    return { entries: due.length, amountPaise: due.reduce((sum, entry) => sum + entry.amountPaise, 0) };
  });
}

/** Ledger lines as CSV (opens in Excel). Cells that could run as a formula are neutralised. */
export async function ledgerCsv(month?: string): Promise<string> {
  const entries = await CommissionEntryModel.find(month ? { month } : {}).sort({ completedAt: 1 }).lean().exec();
  const sellers = await UserModel.find({ _id: { $in: [...new Set(entries.map((entry) => entry.sellerId.toString()))] } }).exec();
  const byId = new Map(sellers.map((user) => [user._id.toString(), user]));
  const rupees = (paise: number) => (paise / 100).toFixed(2);

  const header = ['month', 'completed_at', 'order_ref', 'seller', 'village', 'seller_phone', 'order_total_inr', 'rate_percent', 'commission_inr', 'status', 'collected_at', 'type'];
  const lines = entries.map((entry) => {
    const seller = byId.get(entry.sellerId.toString());
    return [
      entry.month,
      entry.completedAt.toISOString(),
      entry.orderRef,
      seller?.name ?? '',
      seller?.seller?.village ?? '',
      seller?.phone ?? '',
      rupees(entry.orderTotalPaise),
      (entry.rateBps / 100).toFixed(2),
      rupees(entry.amountPaise),
      entry.status,
      entry.collectedAt?.toISOString() ?? '',
      entry.type ?? 'order',
    ];
  });
  return toCsv(header, lines);
}
