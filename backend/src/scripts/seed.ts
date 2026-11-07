/**
 * Demo data for the marketplace: a coordinator, sellers (verified + one pending), buyers, listings with photos
 * and orders in every important state (with commission and a rating).
 *
 *   npm run seed            (Docker: docker compose exec backend node dist/scripts/seed.js)
 *
 * Safe to run again: it first removes only earlier demo data (records marked demo: true) and never touches
 * real accounts. All demo phones start with 90000; every demo PIN is 2580.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose, { type Types } from 'mongoose';
import { COMMISSION_RULES, percentToBps } from '../config/marketRules.js';
import type { ProductId } from '../config/marketCatalog.js';
import { AuthService } from '../modules/auth/auth.service.js';
import type { AuthUser } from '../modules/auth/auth.types.js';
import { PinCredentials } from '../modules/auth/credentials.js';
import { UserModel } from '../modules/auth/user.model.js';
import { CommissionEntryModel } from '../modules/commission/commission.model.js';
import { ListingModel, ListingPhotoModel } from '../modules/listings/listing.model.js';
import { createListing } from '../modules/listings/listing.service.js';
import type { CreateListingBody } from '../modules/listings/listing.types.js';
import { MarketNotificationModel } from '../modules/notifications/notification.model.js';
import { MarketNotifier } from '../modules/notifications/notifier.js';
import { OrderModel } from '../modules/orders/order.model.js';
import { OrderService } from '../modules/orders/order.service.js';
import type { OrderStatus } from '../modules/orders/orderStateMachine.js';
import { ReportModel } from '../modules/reports/report.model.js';
import { setSellerStatus } from '../modules/sellers/seller.service.js';
import { connectFromEnv } from './cli.js';
import { removePhase5Demo, seedPhase5 } from './seedPhase5.js';

const DEMO_PIN = '2580';
const ASSETS = path.resolve(process.cwd(), 'seed-assets');
const TEHSILS = {
  churu: { district: 'चूरू', tehsil: 'चूरू', lat: 28.3, lon: 74.95 },
  sardarshahar: { district: 'चूरू', tehsil: 'सरदारशहर', lat: 28.44, lon: 74.49 },
  ratangarh: { district: 'चूरू', tehsil: 'रतनगढ़', lat: 28.08, lon: 74.62 },
  sujangarh: { district: 'चूरू', tehsil: 'सुजानगढ़', lat: 27.7, lon: 74.47 },
  taranagar: { district: 'चूरू', tehsil: 'तारानगर', lat: 28.67, lon: 75.03 },
};

interface DemoSeller {
  key: string;
  phone: string;
  name: string;
  village: string;
  shgName?: string;
  /** Left out: no UPI ID, paid in cash at delivery (many SHG members). */
  upiId?: string;
  place: keyof typeof TEHSILS;
  verified: boolean;
}

const SELLERS: DemoSeller[] = [
  { key: 'ramesh', phone: '9000000101', name: 'रमेश जाट', village: 'घांघू', upiId: 'ramesh.demo@ybl', place: 'churu', verified: true },
  { key: 'sunita', phone: '9000000102', name: 'सुनीता देवी', village: 'बीनासर', shgName: 'जय माँ स्वयं सहायता समूह', upiId: 'sunita.demo@okaxis', place: 'sardarshahar', verified: true },
  { key: 'mohan', phone: '9000000103', name: 'मोहन लाल', village: 'लोहा', upiId: 'mohan.demo@oksbi', place: 'ratangarh', verified: true },
  // No UPI ID: buyers see "भुगतान: डिलीवरी पर नकद". All her demo orders are cash at delivery.
  { key: 'kamla', phone: '9000000104', name: 'कमला मेघवाल', village: 'छापर', shgName: 'उजाला महिला समूह', place: 'sujangarh', verified: true },
  { key: 'geeta', phone: '9000000105', name: 'गीता कंवर', village: 'साहवा', shgName: 'रंगीली दरी समूह', upiId: 'geeta.demo@ybl', place: 'taranagar', verified: false },
];

type DemoListing = Omit<CreateListingBody, 'photoIds' | 'description' | 'qualityNotes' | 'minOrderQty'> & {
  seller: string;
  photo: string;
  description?: { hi: string; en: string };
  qualityNotes?: string;
  minOrderQty?: number;
};

const crop = (product: ProductId) => ({ category: 'crop' as const, product, unit: 'quintal' as const });

const LISTINGS: DemoListing[] = [
  { ...crop('bajra'), seller: 'ramesh', photo: 'bajra', quantity: 25, pricePerUnitPaise: 2450_00, minOrderQty: 5, title: { hi: 'साफ़ देसी बाजरा – थोक', en: 'Clean desi bajra – bulk' }, description: { hi: 'इस साल की फसल, धूप में सुखाया।', en: 'This season, sun dried.' }, qualityNotes: 'साफ़ और सूखा दाना' },
  { ...crop('guar'), seller: 'ramesh', photo: 'guar', quantity: 12, pricePerUnitPaise: 5200_00, title: { hi: 'ग्वार – 12 क्विंटल', en: 'Guar – 12 quintal' }, qualityNotes: 'बिना मिलावट' },
  { ...crop('moong'), seller: 'mohan', photo: 'moong', quantity: 8, pricePerUnitPaise: 7800_00, title: { hi: 'हरा मूंग', en: 'Green moong' }, description: { hi: 'बारानी खेत का मूंग।', en: 'Rain-fed moong.' } },
  { ...crop('moth'), seller: 'mohan', photo: 'moth', quantity: 6, pricePerUnitPaise: 6100_00, title: { hi: 'मोठ – 6 क्विंटल', en: 'Moth bean – 6 quintal' } },
  { ...crop('chana'), seller: 'ramesh', photo: 'chana', quantity: 10, pricePerUnitPaise: 5600_00, minOrderQty: 2, title: { hi: 'देसी चना', en: 'Desi chana' } },
  { category: 'crop', product: 'jeera', unit: 'kg', seller: 'mohan', photo: 'jeera', quantity: 150, pricePerUnitPaise: 260_00, title: { hi: 'खुशबूदार जीरा', en: 'Aromatic cumin' } },
  { ...crop('sarson'), seller: 'mohan', photo: 'sarson', quantity: 15, pricePerUnitPaise: 5650_00, minOrderQty: 5, title: { hi: 'सरसों – थोक', en: 'Mustard seed – bulk' } },
  { category: 'shg', product: 'achar', unit: 'pack', seller: 'sunita', photo: 'achar', quantity: 60, pricePerUnitPaise: 150_00, title: { hi: 'आम-केर का अचार (500 ग्राम)', en: 'Mango & ker pickle (500 g)' }, description: { hi: 'सरसों के तेल में, घर का बना।', en: 'Home made in mustard oil.' }, fssaiNumber: '22226011000123' },
  { category: 'shg', product: 'papad', unit: 'pack', seller: 'sunita', photo: 'papad', quantity: 80, pricePerUnitPaise: 90_00, title: { hi: 'मूंग के पापड़ (250 ग्राम)', en: 'Moong papad (250 g)' } },
  { category: 'shg', product: 'masala', unit: 'kg', seller: 'kamla', photo: 'masala', quantity: 40, pricePerUnitPaise: 320_00, title: { hi: 'पिसी लाल मिर्च और हल्दी', en: 'Ground chilli and turmeric' } },
  { category: 'shg', product: 'ker_sangri', unit: 'kg', seller: 'kamla', photo: 'ker_sangri', quantity: 20, pricePerUnitPaise: 1100_00, title: { hi: 'सूखी केर-सांगरी', en: 'Dried ker sangri' }, description: { hi: 'थार की असली केर-सांगरी।', en: 'Real ker sangri from the Thar.' } },
  { category: 'shg', product: 'handicraft', unit: 'piece', seller: 'geeta', photo: 'handicraft', quantity: 10, pricePerUnitPaise: 1800_00, title: { hi: 'हाथ से बुनी दरी', en: 'Hand-woven durrie' } },
];

async function main(): Promise<void> {
  await connectFromEnv();
  try {
    await removeOldDemo();
    await createDemoData();
    console.log('Demo data created. Every demo PIN is 2580.');
    console.log('  Coordinator: 9000000001 · Sellers: 9000000101–105 (105 is pending), 9000000106 input dealer · Buyers: 9000000201 (hotel), 9000000202 (household), 9000000203 (worker)');
  } finally {
    await mongoose.disconnect();
  }
}

async function createDemoData(): Promise<void> {
  try {
    const auth = new AuthService(new PinCredentials());

    const coordinator = await auth.createAccount({ phone: '9000000001', pin: DEMO_PIN, name: 'संयोजक (डेमो)', role: 'coordinator' });
    const sellers = new Map<string, Types.ObjectId>();
    for (const seller of SELLERS) {
      const user = await auth.createAccount({ phone: seller.phone, pin: DEMO_PIN, name: seller.name, role: 'seller' });
      await UserModel.updateOne(
        { _id: user._id },
        { $set: { 'seller.village': seller.village, 'seller.shgName': seller.shgName, 'seller.upiId': seller.upiId, 'seller.pickup': TEHSILS[seller.place] } },
      ).exec();
      if (seller.verified) await setSellerStatus(user._id.toString(), { status: 'verified' }, coordinator._id.toString());
      sellers.set(seller.key, user._id);
    }
    const hotel = await auth.createAccount({ phone: '9000000201', pin: DEMO_PIN, name: 'होटल मरुधर', role: 'buyer', buyerType: 'business' });
    await UserModel.updateOne({ _id: hotel._id }, { $set: { 'buyer.businessName': 'होटल मरुधर', 'buyer.village': 'चूरू', 'buyer.address': 'स्टेशन रोड, चूरू' } }).exec();
    const family = await auth.createAccount({ phone: '9000000202', pin: DEMO_PIN, name: 'अनीता शर्मा', role: 'buyer' });
    await UserModel.updateOne({ _id: family._id }, { $set: { 'buyer.village': 'रतनगढ़', 'buyer.address': 'वार्ड 7, रतनगढ़' } }).exec();

    const listings = new Map<string, string>();
    for (const listing of LISTINGS) {
      const sellerId = sellers.get(listing.seller);
      if (!sellerId) throw new Error(`Unknown demo seller ${listing.seller}`);
      const photoId = await ListingPhotoModel.create({ ownerId: sellerId, data: await readFile(path.join(ASSETS, `${listing.photo}.jpg`)), mimeType: 'image/jpeg' });
      const { seller: _seller, photo: _photo, ...body } = listing;
      const created = await createListing(
        sellerId.toString(),
        { description: { hi: '', en: '' }, qualityNotes: '', minOrderQty: 1, ...body, photoIds: [photoId._id.toString()] },
        { uploaderId: sellerId.toString(), cashOn: true },
      );
      listings.set(listing.photo, created._id.toString());
    }

    // Orders through the real service, so stock, commission and notifications follow the same rules as in the app.
    const orders = new OrderService({ notifier: new MarketNotifier(null), commissionBps: percentToBps(COMMISSION_RULES.defaultPercent), cashPaymentOn: async () => true });
    const asUser = (id: Types.ObjectId, role: AuthUser['role'], name: string): AuthUser => ({ id: id.toString(), role, name });
    const hotelUser = asUser(hotel._id, 'buyer', hotel.name);
    const familyUser = asUser(family._id, 'buyer', family.name);
    const coordinatorUser = asUser(coordinator._id, 'coordinator', coordinator.name);
    const sellerUser = (key: string) => asUser(sellers.get(key) ?? coordinator._id, 'seller', key);

    const plan: { buyer: AuthUser; seller: string; listing: string; quantity: number; steps: OrderStatus[]; offer?: number; delivery?: boolean; rating?: number }[] = [
      { buyer: hotelUser, seller: 'ramesh', listing: 'bajra', quantity: 5, steps: [] },
      { buyer: familyUser, seller: 'sunita', listing: 'achar', quantity: 4, steps: [], delivery: true },
      { buyer: hotelUser, seller: 'mohan', listing: 'sarson', quantity: 5, steps: [], offer: 5400_00 },
      { buyer: hotelUser, seller: 'ramesh', listing: 'chana', quantity: 2, steps: ['accepted'] },
      { buyer: familyUser, seller: 'kamla', listing: 'masala', quantity: 2, steps: ['accepted', 'ready', 'out_for_delivery'], delivery: true },
      { buyer: hotelUser, seller: 'sunita', listing: 'papad', quantity: 20, steps: ['accepted', 'ready', 'ready_for_pickup', 'delivered'] },
      { buyer: hotelUser, seller: 'mohan', listing: 'moong', quantity: 2, steps: ['accepted', 'ready', 'ready_for_pickup', 'delivered', 'paid', 'completed'], rating: 5 },
      { buyer: familyUser, seller: 'kamla', listing: 'ker_sangri', quantity: 3, steps: ['accepted', 'ready', 'out_for_delivery', 'delivered', 'paid', 'completed'], delivery: true, rating: 4 },
      { buyer: familyUser, seller: 'ramesh', listing: 'guar', quantity: 1, steps: ['rejected'] },
    ];
    for (const entry of plan) {
      const order = await orders.placeOrder(entry.buyer, {
        listingId: listings.get(entry.listing) ?? '',
        quantity: entry.quantity,
        fulfilment: entry.delivery ? 'delivery' : 'pickup',
        ...(entry.delivery && { deliveryAddress: entry.buyer.id === hotelUser.id ? 'स्टेशन रोड, चूरू' : 'वार्ड 7, रतनगढ़' }),
        paymentMethod: entry.delivery ? 'cash' : 'upi',
        ...(entry.offer && { offeredPricePerUnitPaise: entry.offer }),
      });
      for (const to of entry.steps) {
        const actor = to === 'delivered' || to === 'completed' ? entry.buyer : sellerUser(entry.seller);
        await orders.transition(actor, order._id.toString(), to);
      }
      if (entry.delivery && entry.steps.includes('accepted')) {
        await orders.assignDeliveryPerson(order._id.toString(), { name: 'सुरेश (डेमो)', phone: '9000000301' });
      }
      if (entry.rating) await orders.rate(entry.buyer, order._id.toString(), { stars: entry.rating, comment: 'अच्छा और साफ़ माल' });
    }
    // One collected commission line so the ledger shows both states.
    await CommissionEntryModel.updateOne({ sellerId: sellers.get('mohan') }, { $set: { status: 'collected', collectedAt: new Date(), collectedBy: coordinatorUser.id } }).exec();
    await ReportModel.create({ reporterId: family._id, reporterRole: 'buyer', listingId: listings.get('guar'), reason: 'quality', text: 'फोटो और माल अलग लगे (डेमो शिकायत)' });

    await seedPhase5({ auth, pin: DEMO_PIN, coordinator: coordinatorUser, family: familyUser, hotel: hotelUser, sellers });

  } finally {
    // Also after a failure: whatever was created is marked demo, so the next run removes it cleanly.
    await markDemo();
  }
}

/** Everything created by the seed run gets demo: true, so the next run can remove exactly that. */
async function markDemo(): Promise<void> {
  const users = await UserModel.find({ phone: /^90000/ }, { _id: 1 }).lean().exec();
  const ids = users.map((user) => user._id);
  await UserModel.updateMany({ _id: { $in: ids } }, { $set: { demo: true } }).exec();
  await ListingModel.updateMany({ sellerId: { $in: ids } }, { $set: { demo: true } }).exec();
  await OrderModel.updateMany({ buyerId: { $in: ids } }, { $set: { demo: true } }).exec();
  await CommissionEntryModel.updateMany({ sellerId: { $in: ids } }, { $set: { demo: true } }).exec();
  await ReportModel.updateMany({ reporterId: { $in: ids } }, { $set: { demo: true } }).exec();
}

async function removeOldDemo(): Promise<void> {
  const users = await UserModel.find({ demo: true }, { _id: 1 }).lean().exec();
  const ids = users.map((user) => user._id);
  const leftover = await UserModel.countDocuments({ phone: /^90000/, demo: { $ne: true } }).exec();
  if (leftover > 0) throw new Error('Some 90000… phone numbers belong to real accounts; not seeding. Remove them first.');
  await Promise.all([
    ListingPhotoModel.deleteMany({ ownerId: { $in: ids } }).exec(),
    ListingModel.deleteMany({ demo: true }).exec(),
    OrderModel.deleteMany({ demo: true }).exec(),
    CommissionEntryModel.deleteMany({ demo: true }).exec(),
    ReportModel.deleteMany({ demo: true }).exec(),
    MarketNotificationModel.deleteMany({ userId: { $in: ids } }).exec(),
    removePhase5Demo(ids),
  ]);
  await UserModel.deleteMany({ _id: { $in: ids } }).exec();
}

await main();
