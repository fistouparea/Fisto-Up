import { isValidObjectId, Types } from 'mongoose';
import { z } from 'zod';
import { MANDI_POOL_RULES, TRIP_MESSAGES, TRIP_STATUSES, TRIP_TRANSITIONS } from '../../config/logisticsRules.js';
import { MarketNotificationModel } from '../notifications/notification.model.js';
import { AppError } from '../../errors/AppError.js';
import { cropIdSchema, type CropId } from '../../types/diagnosis.js';
import { addDays, todayInIndia } from '../../utils/dates.js';
import type { AuthUser } from '../auth/auth.types.js';
import { UserModel } from '../auth/user.model.js';
import { MandiTripModel, type MandiTripDocument, type TripStatus } from './mandiTrip.model.js';

const text = (max: number) => z.string().trim().min(1).max(max);

export const createTripSchema = z.object({
  mandi: text(60),
  date: z.iso.date(),
  tehsil: text(60),
  pickupPoint: text(120),
  vehicle: text(80),
  capacityQuintal: z.number().int().min(1).max(MANDI_POOL_RULES.maxCapacityQuintal),
  costPerQuintalPaise: z.number().int().min(0).max(1_000_00).optional(),
  note: z.string().trim().max(300).optional(),
});
export const joinTripSchema = z.object({ crop: cropIdSchema, quantityQuintal: z.number().int().min(1).max(MANDI_POOL_RULES.maxQuantityPerMember) });
export const tripStatusSchema = z.object({ status: z.enum(TRIP_STATUSES) });
/** Coordinator corrections; capacity can never go below what farmers already booked. */
export const updateTripSchema = createTripSchema.partial().refine((body) => Object.keys(body).length > 0, 'nothing to change');

export interface TripView {
  id: string;
  mandi: string;
  date: string;
  tehsil: string;
  pickupPoint: string;
  vehicle: string;
  capacityQuintal: number;
  bookedQuintal: number;
  costPerQuintalPaise?: number;
  note?: string;
  status: TripStatus;
  members: number;
  /** This person's place in the trip. */
  mine?: { crop: CropId; quantityQuintal: number };
  /** Coordinators only: who comes with what, with phone numbers to call. */
  memberList?: { name: string; phone: string; crop: CropId; quantityQuintal: number }[];
}

export class MandiPool {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async create(coordinator: AuthUser, body: z.infer<typeof createTripSchema>): Promise<MandiTripDocument> {
    const today = todayInIndia(this.now());
    if (body.date < today || body.date > addDays(today, MANDI_POOL_RULES.maxDaysAhead)) throw new AppError('INVALID_INPUT', 'Date out of range');
    return MandiTripModel.create({ ...body, createdBy: coordinator.id });
  }

  /** Upcoming open trips (and the person's own, even when closed), soonest first. */
  async listUpcoming(viewer: AuthUser | undefined): Promise<MandiTripDocument[]> {
    const today = todayInIndia(this.now());
    return MandiTripModel.find({
      date: { $gte: today },
      $or: [{ status: 'open' }, ...(viewer ? [{ 'members.userId': new Types.ObjectId(viewer.id) }] : [])],
    })
      .sort({ date: 1 })
      .limit(50)
      .exec();
  }

  async listAll(): Promise<MandiTripDocument[]> {
    return MandiTripModel.find().sort({ date: -1 }).limit(100).exec();
  }

  /**
   * Joins a trip (or changes the own quantity). The capacity check and the update are one atomic step, so two
   * farmers joining at the same moment can never overfill the vehicle.
   */
  async join(user: AuthUser, tripId: string, body: z.infer<typeof joinTripSchema>): Promise<MandiTripDocument> {
    const trip = await this.find(tripId);
    if (trip.status !== 'open' || trip.date < todayInIndia(this.now())) throw new AppError('INVALID_TRANSITION', 'Trip not open');
    const existing = trip.members.find((member) => member.userId.equals(user.id));
    const delta = body.quantityQuintal - (existing?.quantityQuintal ?? 0);
    if (!existing && trip.members.length >= MANDI_POOL_RULES.maxMembers) throw new AppError('CONFLICT', 'Trip full');
    const member = { userId: new Types.ObjectId(user.id), name: user.name, crop: body.crop, quantityQuintal: body.quantityQuintal, joinedAt: this.now() };
    const updated = await MandiTripModel.findOneAndUpdate(
      {
        _id: trip._id,
        status: 'open',
        $expr: { $lte: [{ $add: ['$bookedQuintal', delta] }, '$capacityQuintal'] },
        ...(existing ? { 'members.userId': member.userId } : { 'members.userId': { $ne: member.userId } }),
      },
      existing
        ? { $set: { 'members.$.crop': body.crop, 'members.$.quantityQuintal': body.quantityQuintal }, $inc: { bookedQuintal: delta } }
        : { $push: { members: member }, $inc: { bookedQuintal: delta } },
      { returnDocument: 'after' },
    ).exec();
    if (!updated) throw new AppError('CONFLICT', 'Not enough space left');
    return updated;
  }

  async leave(user: AuthUser, tripId: string): Promise<MandiTripDocument> {
    const trip = await this.find(tripId);
    const existing = trip.members.find((member) => member.userId.equals(user.id));
    if (!existing) throw new AppError('NOT_FOUND');
    const updated = await MandiTripModel.findOneAndUpdate(
      { _id: trip._id, 'members.userId': existing.userId },
      { $pull: { members: { userId: existing.userId } }, $inc: { bookedQuintal: -existing.quantityQuintal } },
      { returnDocument: 'after' },
    ).exec();
    if (!updated) throw new AppError('CONFLICT');
    return updated;
  }

  /** One step in TRIP_TRANSITIONS (checked against the current state atomically); every member is told. */
  async setStatus(tripId: string, status: TripStatus): Promise<MandiTripDocument> {
    const trip = await this.find(tripId);
    if (!TRIP_TRANSITIONS[trip.status].includes(status)) throw new AppError('INVALID_TRANSITION');
    const updated = await MandiTripModel.findOneAndUpdate({ _id: trip._id, status: trip.status }, { $set: { status } }, { returnDocument: 'after' }).exec();
    if (!updated) throw new AppError('INVALID_TRANSITION', 'Trip changed meanwhile');
    await notifyMembers(updated, status === 'open' ? TRIP_MESSAGES.reopened : TRIP_MESSAGES[status]);
    return updated;
  }

  /** Date, place, vehicle or capacity changed: only before departure; members are told. */
  async update(tripId: string, change: z.infer<typeof updateTripSchema>): Promise<MandiTripDocument> {
    const trip = await this.find(tripId);
    if (trip.status !== 'open' && trip.status !== 'closed') throw new AppError('INVALID_TRANSITION', 'Trip already left or cancelled');
    const today = todayInIndia(this.now());
    if (change.date && (change.date < today || change.date > addDays(today, MANDI_POOL_RULES.maxDaysAhead))) throw new AppError('INVALID_INPUT', 'Date out of range');
    const updated = await MandiTripModel.findOneAndUpdate(
      { _id: trip._id, status: trip.status, ...(change.capacityQuintal !== undefined && { bookedQuintal: { $lte: change.capacityQuintal } }) },
      { $set: change },
      { returnDocument: 'after' },
    ).exec();
    if (!updated) throw new AppError('CONFLICT', 'Capacity below what is booked, or trip changed');
    await notifyMembers(updated, TRIP_MESSAGES.changed);
    return updated;
  }

  private async find(tripId: string): Promise<MandiTripDocument> {
    const trip = isValidObjectId(tripId) ? await MandiTripModel.findById(tripId).exec() : null;
    if (!trip) throw new AppError('NOT_FOUND');
    return trip;
  }
}

async function notifyMembers(trip: MandiTripDocument, body: string): Promise<void> {
  if (trip.members.length === 0) return;
  const title = `${trip.mandi} · ${trip.date}`;
  await MarketNotificationModel.insertMany(trip.members.map((member) => ({ userId: member.userId, kind: 'mandiTrip', title, body, href: '#/mandi-trips' })));
}

/** Members' names and phones only in the coordinator panel (they arrange the vehicle and call everyone). */
export async function toTripView(trip: MandiTripDocument, viewer: AuthUser | undefined, { withMembers = false } = {}): Promise<TripView> {
  const mine = viewer ? trip.members.find((member) => member.userId.equals(viewer.id)) : undefined;
  const phones = withMembers && viewer?.role === 'coordinator' ? new Map((await UserModel.find({ _id: { $in: trip.members.map((member) => member.userId) } }, { phone: 1 }).lean().exec()).map((user) => [user._id.toString(), user.phone])) : null;
  return {
    id: trip._id.toString(),
    mandi: trip.mandi,
    date: trip.date,
    tehsil: trip.tehsil,
    pickupPoint: trip.pickupPoint,
    vehicle: trip.vehicle,
    capacityQuintal: trip.capacityQuintal,
    bookedQuintal: trip.bookedQuintal,
    ...(trip.costPerQuintalPaise !== undefined && trip.costPerQuintalPaise !== null && { costPerQuintalPaise: trip.costPerQuintalPaise }),
    ...(trip.note && { note: trip.note }),
    status: trip.status,
    members: trip.members.length,
    ...(mine && { mine: { crop: mine.crop as CropId, quantityQuintal: mine.quantityQuintal } }),
    ...(phones && {
      memberList: trip.members.map((member) => ({ name: member.name, phone: phones.get(member.userId.toString()) ?? '', crop: member.crop as CropId, quantityQuintal: member.quantityQuintal })),
    }),
  };
}
