/**
 * Phase 5 demo data, called by seed.ts: an input dealer with खाद-बीज-दवाई listings and one kit referral order.
 * Later Phase 5 features add their demo data here too. Everything is linked to demo accounts (phones 90000…),
 * so seed.ts removes it again on the next run.
 */
import type { Types } from 'mongoose';
import { COMMISSION_RULES, percentToBps } from '../config/marketRules.js';
import type { AuthService } from '../modules/auth/auth.service.js';
import type { AuthUser } from '../modules/auth/auth.types.js';
import { UserModel } from '../modules/auth/user.model.js';
import { createListing } from '../modules/listings/listing.service.js';
import type { CreateListingBody } from '../modules/listings/listing.types.js';
import { MarketNotifier } from '../modules/notifications/notifier.js';
import { OrderService } from '../modules/orders/order.service.js';
import { setSellerStatus } from '../modules/sellers/seller.service.js';

export interface SeedContext {
  auth: AuthService;
  pin: string;
  coordinator: AuthUser;
  /** Household buyer (also a farmer who buys inputs). */
  family: AuthUser;
  hotel: AuthUser;
  /** Verified producers by key (ramesh, sunita, mohan, kamla). */
  sellers: Map<string, Types.ObjectId>;
}

const DEALER_LISTINGS: Omit<CreateListingBody, 'photoIds' | 'minOrderQty' | 'description' | 'qualityNotes'>[] = [
  { category: 'input', product: 'fungicide', genericId: 'mancozeb', unit: 'pack', quantity: 40, pricePerUnitPaise: 320_00, title: { hi: 'मैंकोजेब 75% WP – 500 ग्राम', en: 'Mancozeb 75% WP – 500 g' } },
  { category: 'input', product: 'insecticide', genericId: 'imidacloprid', unit: 'litre', quantity: 15, pricePerUnitPaise: 950_00, title: { hi: 'इमिडाक्लोप्रिड 17.8% SL – 1 लीटर', en: 'Imidacloprid 17.8% SL – 1 litre' } },
  { category: 'input', product: 'bio_input', genericId: 'neem_oil', unit: 'litre', quantity: 25, pricePerUnitPaise: 380_00, title: { hi: 'नीम का तेल (1500 ppm) – 1 लीटर', en: 'Neem oil 1500 ppm – 1 litre' } },
  { category: 'input', product: 'fertilizer', genericId: 'zinc_sulphate', unit: 'kg', quantity: 100, pricePerUnitPaise: 60_00, title: { hi: 'जिंक सल्फेट', en: 'Zinc sulphate' } },
];

export async function seedPhase5(ctx: SeedContext): Promise<void> {
  await seedInputDealer(ctx);
}

/** Task 1: a licensed input dealer (licence checked by the coordinator) and a completed kit referral order. */
async function seedInputDealer({ auth, pin, coordinator, family }: SeedContext): Promise<void> {
  const dealer = await auth.createAccount({ phone: '9000000106', pin, name: 'किसान सेवा केंद्र (डेमो)', role: 'seller' });
  await UserModel.updateOne(
    { _id: dealer._id },
    {
      $set: {
        'seller.kind': 'input_dealer',
        'seller.licenceNumber': 'RJ/CHU/DEMO-118',
        'seller.village': 'चूरू मंडी',
        'seller.upiId': 'kisansewa.demo@ybl',
        'seller.pickup': { district: 'चूरू', tehsil: 'चूरू', address: 'कृषि मंडी, दुकान 12', lat: 28.3, lon: 74.95 },
      },
    },
  ).exec();
  await setSellerStatus(dealer._id.toString(), { status: 'verified', licenceChecked: true }, coordinator.id);

  const ids: string[] = [];
  for (const listing of DEALER_LISTINGS) {
    const created = await createListing(
      dealer._id.toString(),
      { description: { hi: '', en: '' }, qualityNotes: '', minOrderQty: 1, photoIds: [], ...listing },
      { uploaderId: dealer._id.toString() },
    );
    ids.push(created._id.toString());
  }

  const orders = new OrderService({ notifier: new MarketNotifier(null), commissionBps: percentToBps(COMMISSION_RULES.defaultPercent) });
  const dealerUser: AuthUser = { id: dealer._id.toString(), role: 'seller', name: dealer.name };
  const order = await orders.placeOrder(family, { listingId: ids[0] ?? '', quantity: 2, fulfilment: 'pickup', paymentMethod: 'cash', referral: 'ai_kit' });
  for (const to of ['accepted', 'ready', 'ready_for_pickup'] as const) await orders.transition(dealerUser, order._id.toString(), to);
  await orders.transition(family, order._id.toString(), 'delivered');
  await orders.transition(dealerUser, order._id.toString(), 'paid');
  await orders.transition(family, order._id.toString(), 'completed');
}
