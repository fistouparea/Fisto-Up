import mongoose, { isValidObjectId, Types, type ClientSession, type QueryFilter } from 'mongoose';
import { APPROVAL_MESSAGES, BOOKING_MESSAGES } from '../../config/serviceMessages.js';
import { PRICE_UNIT_NAMES, SERVICE_KIND_RULES, SERVICE_RULES, type ServiceKind } from '../../config/serviceKinds.js';
import { AppError } from '../../errors/AppError.js';
import { addDays, todayInIndia } from '../../utils/dates.js';
import { sellerRating } from '../auth/accountView.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { ListingPhotoModel } from '../listings/listing.model.js';
import { distanceKm } from '../listings/listing.search.js';
import { photoUrl } from '../listings/listing.service.js';
import { MarketNotificationModel } from '../notifications/notification.model.js';
import {
  allowedBookingSteps,
  BOOKING_CONTACT_STATUSES,
  findBookingRule,
  type BookingActor,
  type BookingStatus,
} from './bookingStateMachine.js';
import {
  ServiceBookingModel,
  ServiceDayLockModel,
  ServiceListingModel,
  type ServiceBookingDocument,
  type ServiceListingDocument,
} from './service.model.js';
import type {
  BookingBody,
  BookingView,
  CreateServiceBody,
  LabourMatch,
  OwnServiceView,
  PublicServiceView,
  ServiceSearch,
  UpdateServiceBody,
} from './service.types.js';

const EARTH_RADIUS_KM = 6378.1;

/** Today (India) up to SERVICE_RULES.maxDaysAhead: the only dates a calendar may hold. */
function dateWindow(now: Date): { from: string; to: string } {
  const from = todayInIndia(now);
  return { from, to: addDays(from, SERVICE_RULES.maxDaysAhead) };
}

function checkDates(dates: string[], now: Date): void {
  const { from, to } = dateWindow(now);
  if (dates.some((date) => date < from || date > to)) throw new AppError('INVALID_INPUT', 'Dates must be from today up to 90 days ahead');
}

export class ServiceEngine {
  constructor(private readonly now: () => Date = () => new Date()) {}

  /**
   * Any logged-in person can offer a machine, their work, or an animal, or (labour) post a work need.
   * Kinds that need approval (animals) stay hidden until a coordinator approves; coordinators are told.
   */
  async create(owner: AuthUser, body: CreateServiceBody): Promise<ServiceListingDocument> {
    const rules = SERVICE_KIND_RULES[body.kind];
    if (!rules.sides.includes(body.side)) throw new AppError('INVALID_INPUT', 'Side not allowed for this kind');
    if (!rules.priceUnits.includes(body.priceUnit)) throw new AppError('INVALID_INPUT', 'Price unit not allowed for this kind');
    if (body.photoIds.length > rules.maxPhotos) throw new AppError('INVALID_INPUT', 'Too many photos');
    if (rules.bookedByDate) checkDates(body.availableDates, this.now());
    else if (body.availableDates.length > 0) throw new AppError('INVALID_INPUT', 'This kind has no calendar');

    const id = new Types.ObjectId();
    const photoIds = [...new Set(body.photoIds)].map((photoId) => new Types.ObjectId(photoId));
    if (photoIds.length > 0) {
      const claimed = await ListingPhotoModel.updateMany({ _id: { $in: photoIds }, ownerId: owner.id, attached: false }, { $set: { attached: true, listingId: id } }).exec();
      if (claimed.modifiedCount !== photoIds.length) {
        await ListingPhotoModel.updateMany({ listingId: id }, { $set: { attached: false }, $unset: { listingId: 1 } }).exec();
        throw new AppError('INVALID_INPUT', 'Photo missing, expired or not yours');
      }
    }

    const typeId = body.kind === 'labour' ? (body.skills[0] ?? 'other') : body.typeId;
    const listing = await ServiceListingModel.create({
      _id: id,
      kind: body.kind,
      side: body.side,
      ownerId: owner.id,
      typeId,
      skills: body.kind === 'labour' ? body.skills : [],
      title: body.title,
      description: body.description,
      details: body.details,
      photoIds,
      village: body.village,
      place: { district: body.place.district, tehsil: body.place.tehsil },
      location: { type: 'Point', coordinates: [body.place.lon, body.place.lat] },
      pricePaise: body.pricePaise,
      priceUnit: body.priceUnit,
      availableDates: body.availableDates,
      status: rules.needsApproval ? 'pending_approval' : 'active',
    });
    if (rules.needsApproval) await notifyCoordinators(APPROVAL_MESSAGES.pending.title, APPROVAL_MESSAGES.pending.body(listing.title), '#/admin/services');
    return listing;
  }

  /** Owner (or coordinator): price, calendar, pause/resume. A pending or rejected listing cannot be switched on. */
  async update(actor: AuthUser, listingId: string, body: UpdateServiceBody): Promise<ServiceListingDocument> {
    const listing = await this.findOwn(actor, listingId);
    if (body.availableDates) {
      if (!SERVICE_KIND_RULES[listing.kind].bookedByDate) throw new AppError('INVALID_INPUT', 'This kind has no calendar');
      checkDates(body.availableDates, this.now());
      listing.availableDates = body.availableDates;
    }
    if (body.pricePaise !== undefined) listing.pricePaise = body.pricePaise;
    if (body.status) {
      if (listing.status === 'pending_approval' || listing.status === 'rejected') throw new AppError('INVALID_TRANSITION', 'Waiting for or refused approval');
      listing.status = body.status;
    }
    await listing.save();
    return listing;
  }

  async search(query: ServiceSearch): Promise<{ items: PublicServiceView[]; hasMore: boolean }> {
    const filter: QueryFilter<ServiceListingDocument> = { kind: query.kind, side: query.side, status: 'active' };
    if (query.typeId) filter.typeId = query.typeId;
    if (query.skill) filter.skills = query.skill;
    if (query.date) filter.availableDates = query.date;
    if (query.lat !== undefined && query.lon !== undefined) {
      filter.location = { $geoWithin: { $centerSphere: [[query.lon, query.lat], query.radiusKm / EARTH_RADIUS_KM] } };
    }
    const size = SERVICE_RULES.pageSize;
    const rows = await ServiceListingModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * size).limit(size + 1).exec();
    const origin = query.lat !== undefined && query.lon !== undefined ? { lat: query.lat, lon: query.lon } : undefined;
    let items = await this.toPublicViews(rows.slice(0, size), origin);
    // A day that is in the calendar but already booked is not free.
    if (query.date) items = items.filter((item) => item.freeDates.includes(query.date ?? ''));
    if (origin) items.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return { items, hasMore: rows.length > size };
  }

  /** Public view; a listing that is not active is visible only to its owner and coordinators. */
  async findVisible(id: string, viewer: AuthUser | undefined): Promise<PublicServiceView | OwnServiceView> {
    const listing = isValidObjectId(id) ? await ServiceListingModel.findById(id).exec() : null;
    if (!listing) throw new AppError('NOT_FOUND');
    const isOwner = viewer && (listing.ownerId.equals(viewer.id) || viewer.role === 'coordinator');
    if (isOwner) return (await this.toOwnViews([listing]))[0] as OwnServiceView;
    if (listing.status !== 'active') throw new AppError('NOT_FOUND');
    return (await this.toPublicViews([listing]))[0] as PublicServiceView;
  }

  async listOwn(owner: AuthUser): Promise<OwnServiceView[]> {
    return this.toOwnViews(await ServiceListingModel.find({ ownerId: owner.id }).sort({ createdAt: -1 }).limit(100).exec());
  }

  /** Coordinator: approve or refuse a listing waiting for approval (animals). The owner is told. */
  async review(listingId: string, decision: { approve: boolean; reason?: string }, coordinatorId: string): Promise<ServiceListingDocument> {
    const listing = isValidObjectId(listingId)
      ? await ServiceListingModel.findOneAndUpdate(
          { _id: listingId, status: 'pending_approval' },
          {
            $set: { status: decision.approve ? 'active' : 'rejected', reviewedBy: coordinatorId, reviewedAt: this.now(), ...(decision.reason && { rejectReason: decision.reason }) },
          },
          { returnDocument: 'after' },
        ).exec()
      : null;
    if (!listing) throw new AppError('INVALID_TRANSITION', 'Not waiting for approval');
    const message = decision.approve
      ? { title: APPROVAL_MESSAGES.approved.title, body: APPROVAL_MESSAGES.approved.body(listing.title) }
      : { title: APPROVAL_MESSAGES.rejected.title, body: APPROVAL_MESSAGES.rejected.body(listing.title, decision.reason ?? '') };
    await MarketNotificationModel.create({ userId: listing.ownerId, kind: 'service', href: `#/services/item/${listing._id.toString()}`, ...message });
    return listing;
  }

  async pendingApproval(): Promise<OwnServiceView[]> {
    return this.toOwnViews(await ServiceListingModel.find({ status: 'pending_approval' }).sort({ createdAt: 1 }).limit(200).exec());
  }

  /**
   * A booking request (or an enquiry for an animal). Calendar kinds need free days from the listing's calendar;
   * the days are taken only when the owner says yes (so several people may ask for the same day).
   */
  async request(requester: AuthUser, listingId: string, body: BookingBody): Promise<ServiceBookingDocument> {
    const listing = isValidObjectId(listingId) ? await ServiceListingModel.findById(listingId).exec() : null;
    if (!listing || listing.status !== 'active') throw new AppError('NOT_FOUND');
    if (listing.ownerId.equals(requester.id)) throw new AppError('INVALID_INPUT', 'Cannot book your own listing');
    const calendar = SERVICE_KIND_RULES[listing.kind].bookedByDate;
    if (calendar) {
      if (body.dates.length === 0) throw new AppError('INVALID_INPUT', 'Pick at least one day');
      const free = await this.freeDates(listing);
      if (body.dates.some((date) => !free.includes(date))) throw new AppError('CONFLICT', 'Day not free');
    } else if (body.dates.length > 0) {
      throw new AppError('INVALID_INPUT', 'This kind has no calendar');
    }
    const open = await ServiceBookingModel.exists({ listingId: listing._id, requesterId: requester.id, status: 'requested' }).exec();
    if (open) throw new AppError('CONFLICT', 'You already asked');

    const booking = await ServiceBookingModel.create({
      listingId: listing._id,
      kind: listing.kind,
      ownerId: listing.ownerId,
      requesterId: requester.id,
      title: listing.title,
      dates: calendar ? body.dates : [],
      ...(body.note && { note: body.note }),
      pricePaise: listing.pricePaise,
      priceUnit: listing.priceUnit,
      status: 'requested',
      history: [{ status: 'requested', at: this.now(), byUserId: requester.id, byRole: requester.role }],
    });
    await this.notify(booking, 'requested', requester);
    return booking;
  }

  /**
   * One step of the booking state machine. Accepting takes the booked days in the same transaction (a unique
   * index per listing and day: two accepts for one day can never both succeed); cancelling gives them back.
   */
  async transition(actor: AuthUser, bookingId: string, to: BookingStatus): Promise<ServiceBookingDocument> {
    const booking = await this.findBooking(actor, bookingId);
    const role = bookingActor(actor, booking);
    const rule = findBookingRule(booking.status, to, role);
    if (!rule) throw new AppError('INVALID_TRANSITION');

    const updated = await mongoose.connection.transaction(async (session) => {
      const changed = await ServiceBookingModel.findOneAndUpdate(
        { _id: booking._id, status: booking.status },
        { $set: { status: to }, $push: { history: { status: to, at: this.now(), byUserId: actor.id, byRole: actor.role } } },
        { session, returnDocument: 'after' },
      ).exec();
      if (!changed) throw new AppError('INVALID_TRANSITION', 'Booking changed meanwhile');
      if (rule.effect === 'lockDates' && changed.dates.length > 0) await lockDates(changed, session);
      if (rule.effect === 'releaseDates') await ServiceDayLockModel.deleteMany({ bookingId: changed._id }, { session }).exec();
      return changed;
    });
    await this.notify(updated, to, actor);
    return updated;
  }

  /** The requester's 1–5 stars after "पूरा", once; the listing's average is kept on the listing. */
  async rate(actor: AuthUser, bookingId: string, rating: { stars: number; comment?: string }): Promise<ServiceBookingDocument> {
    const booking = await this.findBooking(actor, bookingId);
    if (bookingActor(actor, booking) !== 'requester') throw new AppError('FORBIDDEN');
    return mongoose.connection.transaction(async (session) => {
      const rated = await ServiceBookingModel.findOneAndUpdate(
        { _id: booking._id, status: 'completed', rating: { $exists: false } },
        { $set: { rating: { ...rating, at: this.now() } } },
        { session, returnDocument: 'after' },
      ).exec();
      if (!rated) throw new AppError('CONFLICT', 'Not completed or already rated');
      await ServiceListingModel.updateOne({ _id: booking.listingId }, { $inc: { ratingSum: rating.stars, ratingCount: 1 } }, { session }).exec();
      return rated;
    });
  }

  /** Owner, requester or a coordinator; anyone else gets NOT_FOUND (no hint it exists). */
  async findBooking(actor: AuthUser, bookingId: string): Promise<ServiceBookingDocument> {
    const booking = isValidObjectId(bookingId) ? await ServiceBookingModel.findById(bookingId).exec() : null;
    if (!booking) throw new AppError('NOT_FOUND');
    if (actor.role === 'coordinator' || booking.ownerId.equals(actor.id) || booking.requesterId.equals(actor.id)) return booking;
    throw new AppError('NOT_FOUND');
  }

  async listBookings(actor: AuthUser, kind?: ServiceKind): Promise<ServiceBookingDocument[]> {
    return ServiceBookingModel.find({ $or: [{ ownerId: actor.id }, { requesterId: actor.id }], ...(kind && { kind }) })
      .sort({ updatedAt: -1 })
      .limit(100)
      .exec();
  }

  /**
   * Labour: the other side's active listings that share a skill, sorted by how well they fit (shared skills,
   * shared days, distance). Contact details are never part of a match.
   */
  async labourMatches(actor: AuthUser, listingId: string): Promise<LabourMatch[]> {
    const own = await this.findOwn(actor, listingId);
    if (own.kind !== 'labour') throw new AppError('INVALID_INPUT', 'Matching is for labour');
    const [lon, lat] = own.location?.coordinates ?? [];
    const origin = { lat: lat ?? 0, lon: lon ?? 0 };
    const rows = await ServiceListingModel.find({
      kind: 'labour',
      side: own.side === 'offer' ? 'need' : 'offer',
      status: 'active',
      ownerId: { $ne: own.ownerId },
      skills: { $in: own.skills },
      location: { $geoWithin: { $centerSphere: [[origin.lon, origin.lat], SERVICE_RULES.searchRadiusKm.max / EARTH_RADIUS_KM] } },
    })
      .limit(100)
      .exec();
    const views = await this.toPublicViews(rows, origin);
    const ownDates = new Set(own.availableDates.filter((date) => date >= todayInIndia(this.now())));
    return views
      .map((listing) => {
        const sharedSkills = listing.skills.filter((skill) => own.skills.includes(skill));
        const sharedDates = listing.freeDates.filter((date) => ownDates.has(date));
        const score = sharedSkills.length * 10 + sharedDates.length * 5 - (listing.distanceKm ?? 0) / 5;
        return { listing, score: Math.round(score * 10) / 10, sharedSkills, sharedDates };
      })
      .filter((match) => ownDates.size === 0 || match.listing.freeDates.length === 0 || match.sharedDates.length > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }

  async findOwn(actor: AuthUser, listingId: string): Promise<ServiceListingDocument> {
    const listing = isValidObjectId(listingId) ? await ServiceListingModel.findById(listingId).exec() : null;
    if (!listing) throw new AppError('NOT_FOUND');
    if (actor.role === 'coordinator' || listing.ownerId.equals(actor.id)) return listing;
    throw new AppError('FORBIDDEN');
  }

  private async freeDates(listing: ServiceListingDocument): Promise<string[]> {
    const booked = new Set((await ServiceDayLockModel.find({ listingId: listing._id }, { date: 1 }).lean().exec()).map((row) => row.date));
    const today = todayInIndia(this.now());
    return listing.availableDates.filter((date) => date >= today && !booked.has(date));
  }

  async toPublicViews(listings: ServiceListingDocument[], origin?: { lat: number; lon: number }): Promise<PublicServiceView[]> {
    const owners = await UserModel.find({ _id: { $in: [...new Set(listings.map((listing) => listing.ownerId.toString()))] } }, { name: 1, seller: 1 }).lean().exec();
    const ownerById = new Map(owners.map((user) => [user._id.toString(), user]));
    const locks = await ServiceDayLockModel.find({ listingId: { $in: listings.map((listing) => listing._id) } }, { listingId: 1, date: 1 }).lean().exec();
    const today = todayInIndia(this.now());
    return listings.map((listing) => {
      const owner = ownerById.get(listing.ownerId.toString());
      const booked = new Set(locks.filter((lock) => lock.listingId.equals(listing._id)).map((lock) => lock.date));
      const [lon, lat] = listing.location?.coordinates ?? [];
      return {
        id: listing._id.toString(),
        kind: listing.kind,
        side: listing.side,
        typeId: listing.typeId,
        skills: listing.skills,
        title: listing.title,
        description: listing.description,
        details: (listing.details ?? {}) as Record<string, unknown>,
        photoUrls: listing.photoIds.map(photoUrl),
        village: listing.village,
        place: { ...(listing.place?.district && { district: listing.place.district }), ...(listing.place?.tehsil && { tehsil: listing.place.tehsil }) },
        pricePaise: listing.pricePaise,
        priceUnit: listing.priceUnit,
        freeDates: listing.availableDates.filter((date) => date >= today && !booked.has(date)),
        owner: { id: listing.ownerId.toString(), name: owner?.name ?? '—', rating: sellerRating(owner?.seller ?? { ratingSum: 0, ratingCount: 0 }) },
        ...(origin && lat !== undefined && lon !== undefined && { distanceKm: Math.round(distanceKm(origin, { lat, lon })) }),
        rating: sellerRating({ ratingSum: listing.ratingSum, ratingCount: listing.ratingCount }),
        createdAt: listing.createdAt,
      };
    });
  }

  private async toOwnViews(listings: ServiceListingDocument[]): Promise<OwnServiceView[]> {
    const views = await this.toPublicViews(listings);
    const locks = await ServiceDayLockModel.find({ listingId: { $in: listings.map((listing) => listing._id) } }, { listingId: 1, date: 1 }).lean().exec();
    return views.map((view, index) => {
      const listing = listings[index] as ServiceListingDocument;
      return {
        ...view,
        status: listing.status,
        ...(listing.rejectReason && { rejectReason: listing.rejectReason }),
        bookedDates: locks.filter((lock) => lock.listingId.equals(listing._id)).map((lock) => lock.date).sort(),
      };
    });
  }

  /** In-app (and coordinators' panel) notice to the other side of the booking. */
  private async notify(booking: ServiceBookingDocument, status: BookingStatus, actor: AuthUser): Promise<void> {
    const recipients = [booking.ownerId, booking.requesterId].filter((id) => !id.equals(actor.id));
    const days = booking.dates.length > 0 ? ` – ${booking.dates.length} ${PRICE_UNIT_NAMES.day}` : '';
    const message = BOOKING_MESSAGES[status];
    await MarketNotificationModel.insertMany(
      recipients.map((userId) => ({
        userId,
        kind: 'service',
        title: message.title,
        body: message.body(`${booking.title}${days}`, actor.name),
        href: `#/services/booking/${booking._id.toString()}`,
      })),
    );
  }
}

function bookingActor(actor: AuthUser, booking: ServiceBookingDocument): BookingActor {
  if (booking.ownerId.equals(actor.id)) return 'owner';
  if (booking.requesterId.equals(actor.id)) return 'requester';
  return 'coordinator';
}

/** Takes every booked day; a day already taken fails the whole step (CONFLICT), so nothing is half-booked. */
async function lockDates(booking: ServiceBookingDocument, session: ClientSession): Promise<void> {
  try {
    await ServiceDayLockModel.insertMany(
      booking.dates.map((date) => ({ listingId: booking.listingId, date, bookingId: booking._id })),
      { session, ordered: true },
    );
  } catch (error) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) throw new AppError('CONFLICT', 'Day already booked');
    throw error;
  }
}

async function notifyCoordinators(title: string, body: string, href: string): Promise<void> {
  const coordinators = await UserModel.find({ role: 'coordinator', deletedAt: { $exists: false } }, { _id: 1 }).lean().exec();
  if (coordinators.length > 0) await MarketNotificationModel.insertMany(coordinators.map((user) => ({ userId: user._id, kind: 'service', title, body, href })));
}

/** The booking as this person may see it: phone numbers only once both said yes. */
export async function toBookingView(booking: ServiceBookingDocument, viewer: AuthUser): Promise<BookingView> {
  const viewerRole = bookingActor(viewer, booking);
  const [owner, requester] = await Promise.all([
    UserModel.findById(booking.ownerId, { name: 1, phone: 1 }).lean().exec(),
    UserModel.findById(booking.requesterId, { name: 1, phone: 1 }).lean().exec(),
  ]);
  const contactVisible = BOOKING_CONTACT_STATUSES.includes(booking.status);
  return {
    id: booking._id.toString(),
    listingId: booking.listingId.toString(),
    kind: booking.kind,
    title: booking.title,
    dates: booking.dates,
    ...(booking.note && { note: booking.note }),
    pricePaise: booking.pricePaise,
    priceUnit: booking.priceUnit,
    status: booking.status,
    history: booking.history.map((entry) => ({ status: entry.status, at: entry.at, byRole: entry.byRole })),
    owner: { name: owner?.name ?? '—' },
    requester: { name: requester?.name ?? '—' },
    viewerRole,
    allowedNext: allowedBookingSteps(booking.status, viewerRole),
    ...(contactVisible && {
      contact: {
        ...(viewerRole !== 'owner' && owner && { ownerPhone: owner.phone }),
        ...(viewerRole !== 'requester' && requester && { requesterPhone: requester.phone }),
      },
    }),
    ...(booking.rating && { rating: { stars: booking.rating.stars, ...(booking.rating.comment && { comment: booking.rating.comment }) } }),
    canRate: viewerRole === 'requester' && booking.status === 'completed' && !booking.rating,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}
