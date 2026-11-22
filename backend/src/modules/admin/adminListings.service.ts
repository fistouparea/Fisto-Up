import type { Types } from 'mongoose';
import { z } from 'zod';
import { ADMIN_RULES } from '../../config/adminRules.js';
import type { SellerKind, SellerStatus } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { ListingModel } from '../listings/listing.model.js';
import { toSellerListingView } from '../listings/listing.service.js';
import type { SellerListingView } from '../listings/listing.types.js';

export const adminListingQuerySchema = z.object({
  /** waiting: on sale, only the seller check is missing. */
  show: z.enum(['waiting', 'all']).default('all'),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export interface AdminListingView extends SellerListingView {
  seller: { id: string; name: string; phone: string; village?: string; status: SellerStatus; kind: SellerKind };
}

async function waitingFilter() {
  const sellerIds: Types.ObjectId[] = await UserModel.find({ role: 'seller', 'seller.status': 'pending', deletedAt: { $exists: false } }).distinct('_id').exec();
  return { sellerId: { $in: sellerIds }, status: 'active' as const, hidden: false, quantityAvailable: { $gt: 0 } };
}

export async function countWaitingListings(): Promise<number> {
  return ListingModel.countDocuments(await waitingFilter()).exec();
}

/** Every listing with its seller and why buyers do or do not see it. */
export async function listAdminListings({ show, page }: z.infer<typeof adminListingQuerySchema>): Promise<{ items: AdminListingView[]; hasMore: boolean }> {
  const filter = show === 'waiting' ? await waitingFilter() : {};
  const size = ADMIN_RULES.listingsPageSize;
  const found = await ListingModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * size).limit(size + 1).exec();
  const rows = found.slice(0, size);
  const sellers = await UserModel.find({ _id: { $in: rows.map((row) => row.sellerId) } }).exec();
  const byId = new Map(sellers.map((user) => [user._id.toString(), user]));

  const items = rows.flatMap((row): AdminListingView[] => {
    const user = byId.get(row.sellerId.toString());
    if (!user?.seller) return [];
    const { status, kind, village } = user.seller;
    return [
      {
        ...toSellerListingView(row),
        seller: { id: user._id.toString(), name: user.name, phone: user.phone, status, kind: kind ?? 'producer', ...(village && { village }) },
      },
    ];
  });
  return { items, hasMore: found.length > size };
}
