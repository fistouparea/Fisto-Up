import { model, Schema } from 'mongoose';
import { CROPS } from '../../types/diagnosis.js';

import { TRIP_STATUSES } from '../../config/logisticsRules.js';
export { TRIP_STATUSES, type TripStatus } from '../../config/logisticsRules.js';

/**
 * "साथ में मंडी चलें": a coordinator plans one shared vehicle to a mandi on a date; farmers of the area join with
 * their produce. `bookedQuintal` is kept next to the members so joining can check the capacity atomically.
 */
const mandiTripSchema = new Schema(
  {
    mandi: { type: String, required: true },
    date: { type: String, required: true },
    tehsil: { type: String, required: true },
    pickupPoint: { type: String, required: true },
    vehicle: { type: String, required: true },
    capacityQuintal: { type: Number, required: true, min: 1 },
    bookedQuintal: { type: Number, required: true, default: 0, min: 0 },
    /** Shared cost per quintal, if agreed (paid to the driver directly, not through the app). */
    costPerQuintalPaise: Number,
    note: String,
    status: { type: String, enum: TRIP_STATUSES, required: true, default: 'open' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        _id: false,
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        crop: { type: String, enum: Object.keys(CROPS), required: true },
        quantityQuintal: { type: Number, required: true, min: 1 },
        joinedAt: { type: Date, required: true },
      },
    ],
    demo: Boolean,
  },
  { timestamps: true, versionKey: false },
);

mandiTripSchema.index({ status: 1, date: 1 });
mandiTripSchema.index({ 'members.userId': 1 });

export const MandiTripModel = model('MandiTrip', mandiTripSchema, 'mandi_trips');
export type MandiTripDocument = InstanceType<typeof MandiTripModel>;
