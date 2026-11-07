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
import { ServiceBookingModel, ServiceDayLockModel, ServiceListingModel } from '../modules/services/service.model.js';
import { ServiceEngine } from '../modules/services/service.service.js';
import { addDays, todayInIndia } from '../utils/dates.js';
import { MandiTripModel } from '../modules/mandiPool/mandiTrip.model.js';
import { MandiPool } from '../modules/mandiPool/mandiTrip.service.js';
import { FarmProfileModel } from '../models/FarmProfile.js';
import { DiagnosisRecord } from '../models/DiagnosisRecord.js';
import { Complaints } from '../modules/complaints/complaint.service.js';
import { ReportModel } from '../modules/reports/report.model.js';

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
  await seedEquipment(ctx);
  await seedLabour(ctx);
  await seedLivestock(ctx);
  await seedMandiTrips(ctx);
  await seedAdvisor(ctx);
  await seedComplaint(ctx);
}

/** The household buyer's phone: a farm profile and two saved checks, so the advisor screens have data. */
export const DEMO_DEVICE_ID = '00000000-0000-4000-8000-000000000202';

/** Removes Phase 5 demo records of the demo accounts (called before seeding again). */
export async function removePhase5Demo(userIds: Types.ObjectId[]): Promise<void> {
  const listings = await ServiceListingModel.find({ ownerId: { $in: userIds } }, { _id: 1 }).lean().exec();
  await Promise.all([
    MandiTripModel.deleteMany({ demo: true }).exec(),
    FarmProfileModel.deleteMany({ deviceId: DEMO_DEVICE_ID }).exec(),
    DiagnosisRecord.deleteMany({ deviceId: DEMO_DEVICE_ID }).exec(),
    ServiceDayLockModel.deleteMany({ listingId: { $in: listings.map((listing) => listing._id) } }).exec(),
    ServiceBookingModel.deleteMany({ $or: [{ ownerId: { $in: userIds } }, { requesterId: { $in: userIds } }] }).exec(),
    ServiceListingModel.deleteMany({ ownerId: { $in: userIds } }).exec(),
  ]);
}

const engine = new ServiceEngine();
const asUser = (id: Types.ObjectId, name: string): AuthUser => ({ id: id.toString(), role: 'seller', name });
/** The next `count` days from `offset` days after today (India), for demo calendars. */
const nextDays = (offset: number, count: number) => Array.from({ length: count }, (_, index) => addDays(todayInIndia(), offset + index));
const CHURU = { district: 'चूरू', tehsil: 'चूरू', lat: 28.3, lon: 74.95 };

/** Task 6: two machines of रमेश, one booking accepted (days locked) and one waiting for an answer. */
async function seedEquipment({ sellers, family, hotel }: SeedContext): Promise<void> {
  const rameshId = sellers.get('ramesh');
  if (!rameshId) return;
  const ramesh = asUser(rameshId, 'रमेश जाट');
  const tractor = await engine.create(ramesh, {
    kind: 'equipment',
    side: 'offer',
    typeId: 'tractor',
    title: 'महिंद्रा 575 ट्रैक्टर, ड्राइवर के साथ',
    description: 'जुताई और ट्रॉली के लिए। डीज़ल अलग।',
    photoIds: [],
    village: 'घांघू',
    place: CHURU,
    pricePaise: 800_00,
    priceUnit: 'hour',
    availableDates: nextDays(1, 10),
    details: { withOperator: true, horsePower: 45 },
  });
  await engine.create(ramesh, {
    kind: 'equipment',
    side: 'offer',
    typeId: 'thresher',
    title: 'बाजरा-ग्वार थ्रेशर',
    description: '',
    photoIds: [],
    village: 'घांघू',
    place: CHURU,
    pricePaise: 1500_00,
    priceUnit: 'bigha',
    availableDates: nextDays(2, 6),
    details: { withOperator: true },
  });
  const accepted = await engine.request(family, tractor._id.toString(), { dates: nextDays(1, 1), note: 'दो घंटे जुताई (डेमो)' });
  await engine.transition(ramesh, accepted._id.toString(), 'accepted');
  await engine.request(hotel, tractor._id.toString(), { dates: nextDays(3, 2) });
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
      { uploaderId: dealer._id.toString(), cashOn: true },
    );
    ids.push(created._id.toString());
  }

  const orders = new OrderService({ notifier: new MarketNotifier(null), commissionBps: percentToBps(COMMISSION_RULES.defaultPercent), cashPaymentOn: async () => true });
  const dealerUser: AuthUser = { id: dealer._id.toString(), role: 'seller', name: dealer.name };
  const order = await orders.placeOrder(family, { listingId: ids[0] ?? '', quantity: 2, fulfilment: 'pickup', paymentMethod: 'cash', referral: 'ai_kit' });
  for (const to of ['accepted', 'ready', 'ready_for_pickup'] as const) await orders.transition(dealerUser, order._id.toString(), to);
  await orders.transition(family, order._id.toString(), 'delivered');
  await orders.transition(dealerUser, order._id.toString(), 'paid');
  await orders.transition(family, order._id.toString(), 'completed');
}

/** Task 7: a worker (18+ confirmed) and a farmer's work need that match on कटाई and the same days. */
async function seedLabour({ auth, pin, family }: SeedContext): Promise<void> {
  const worker = await auth.createAccount({ phone: '9000000203', pin, name: 'भंवरलाल (डेमो मज़दूर)', role: 'buyer' });
  const workerUser: AuthUser = { id: worker._id.toString(), role: 'buyer', name: worker.name };
  await engine.create(workerUser, {
    kind: 'labour',
    side: 'offer',
    skills: ['katai', 'nirai', 'thresher_kaam'],
    title: 'कटाई, निराई और थ्रेशर का काम',
    description: '10 साल का अनुभव। अपने गाँव से 20 किमी तक आ सकता हूँ।',
    photoIds: [],
    village: 'बीनासर',
    place: { district: 'चूरू', tehsil: 'सरदारशहर', lat: 28.44, lon: 74.49 },
    pricePaise: 500_00,
    priceUnit: 'day',
    availableDates: nextDays(1, 14),
    details: { ageConfirmed18: true },
  });
  await engine.create(family, {
    kind: 'labour',
    side: 'need',
    skills: ['katai'],
    title: 'बाजरे की कटाई के लिए 3 मज़दूर',
    description: '5 बीघा खेत, खाना हमारी तरफ़ से।',
    photoIds: [],
    village: 'रतनगढ़',
    place: { district: 'चूरू', tehsil: 'रतनगढ़', lat: 28.08, lon: 74.62 },
    pricePaise: 550_00,
    priceUnit: 'day',
    availableDates: nextDays(4, 3),
    details: { workersNeeded: 3 },
  });
}

/** Task 8: one animal approved by the coordinator (public) and one waiting for approval. */
async function seedLivestock({ sellers, coordinator }: SeedContext): Promise<void> {
  const mohanId = sellers.get('mohan');
  const kamlaId = sellers.get('kamla');
  if (!mohanId || !kamlaId) return;
  const cow = await engine.create(asUser(mohanId, 'मोहन लाल'), {
    kind: 'livestock',
    side: 'offer',
    typeId: 'cow',
    title: 'राठी गाय, रोज़ 8 लीटर दूध',
    description: 'दूसरा ब्यांत, शांत स्वभाव।',
    photoIds: [],
    village: 'लोहा',
    place: { district: 'चूरू', tehsil: 'रतनगढ़', lat: 28.08, lon: 74.62 },
    pricePaise: 45_000_00,
    priceUnit: 'animal',
    availableDates: [],
    details: { breed: 'राठी', ageYears: 5, milkLitresPerDay: 8, vaccinations: 'खुरपका-मुंहपका (FMD), गलघोंटू – डेमो', purpose: 'dairy', count: 1 },
  });
  await engine.review(cow._id.toString(), { approve: true }, coordinator.id);
  await engine.create(asUser(kamlaId, 'कमला मेघवाल'), {
    kind: 'livestock',
    side: 'offer',
    typeId: 'goat',
    title: 'सिरोही बकरियाँ (2)',
    description: '',
    photoIds: [],
    village: 'छापर',
    place: { district: 'चूरू', tehsil: 'सुजानगढ़', lat: 27.7, lon: 74.47 },
    pricePaise: 9_000_00,
    priceUnit: 'animal',
    availableDates: [],
    details: { breed: 'सिरोही', ageYears: 1.5, vaccinations: 'PPR – डेमो', purpose: 'breeding', count: 2 },
  });
}

/** Mandi trips: one open trip with two farmers already in, one cancelled (to show both states). */
async function seedMandiTrips({ coordinator, family, sellers }: SeedContext): Promise<void> {
  const pool = new MandiPool();
  const open = await pool.create(coordinator, {
    mandi: 'चूरू कृषि उपज मंडी',
    date: addDays(todayInIndia(), 3),
    tehsil: 'चूरू',
    pickupPoint: 'घांघू बस स्टैंड, सुबह 6 बजे',
    vehicle: 'पिकअप (डेमो)',
    capacityQuintal: 40,
    costPerQuintalPaise: 40_00,
  });
  await pool.join(family, open._id.toString(), { crop: 'bajra', quantityQuintal: 8 });
  const rameshId = sellers.get('ramesh');
  if (rameshId) await pool.join(asUser(rameshId, 'रमेश जाट'), open._id.toString(), { crop: 'guar', quantityQuintal: 12 });
  const cancelled = await pool.create(coordinator, {
    mandi: 'सरदारशहर मंडी',
    date: addDays(todayInIndia(), 6),
    tehsil: 'सरदारशहर',
    pickupPoint: 'बीनासर चौक',
    vehicle: 'ट्रैक्टर-ट्रॉली (डेमो)',
    capacityQuintal: 25,
  });
  await pool.setStatus(cancelled._id.toString(), 'cancelled');
  await MandiTripModel.updateMany({ _id: { $in: [open._id, cancelled._id] } }, { $set: { demo: true } }).exec();
}

/** Advisor: farm profile + two checks on the household buyer's phone (linked to the account). */
async function seedAdvisor({ family }: SeedContext): Promise<void> {
  await UserModel.updateOne({ _id: family.id }, { $set: { deviceId: DEMO_DEVICE_ID } }).exec();
  await FarmProfileModel.create({
    deviceId: DEMO_DEVICE_ID,
    location: { lat: 28.08, lon: 74.62, source: 'list', district: 'चूरू', tehsil: 'रतनगढ़' },
    crops: [
      { crop: 'bajra', sowingDate: addDays(todayInIndia(), -80) },
      { crop: 'chana', sowingDate: addDays(todayInIndia(), -10) },
    ],
    fieldSizeBigha: 6,
    irrigation: 'tubewell',
  });
  await DiagnosisRecord.create([
    {
      deviceId: DEMO_DEVICE_ID,
      crop: 'bajra',
      diagnosis: {
        problem_name: 'पत्तों पर झुलसा (डेमो)',
        explanation: 'ज़्यादा नमी से फफूंद लगी है।',
        desi_upay: ['नीम के तेल का छिड़काव करें।'],
        dawai: [{ name: 'मैंकोजेब', kaise_use_karein: 'शाम को छिड़कें। पैकेट पर लिखी मात्रा के अनुसार ही डालें।' }],
        savdhani: ['छिड़काव करते समय दस्ताने और मास्क पहनें।'],
        severity: 'mild',
      },
    },
    {
      deviceId: DEMO_DEVICE_ID,
      crop: 'chana',
      diagnosis: { problem_name: 'पौधा स्वस्थ है (डेमो)', explanation: '', desi_upay: ['समय पर निराई करें।'], dawai: [], savdhani: [], severity: 'healthy' },
    },
  ]);
}

/** Complaints: the household buyer complains about the tractor booking; the coordinator is working on it. */
async function seedComplaint({ family, coordinator }: SeedContext): Promise<void> {
  const booking = await ServiceBookingModel.findOne({ requesterId: family.id }).exec();
  if (!booking) return;
  const complaints = new Complaints();
  const complaint = await complaints.create(family, { target: { kind: 'booking', id: booking._id.toString() }, category: 'not_delivered', text: 'ट्रैक्टर तय समय पर नहीं आया (डेमो शिकायत)' });
  await complaints.addMessage(coordinator, complaint._id.toString(), 'रमेश जी से बात कर रहे हैं, कल तक जवाब देंगे।');
  await complaints.transition(coordinator, complaint._id.toString(), 'in_progress');
  await ReportModel.updateOne({ _id: complaint._id }, { $set: { demo: true } }).exec();
}
