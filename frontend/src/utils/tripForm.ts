import type { TripInput } from '../api/mandiTrips';
import { hi } from '../strings/hi';
import { hiF } from '../strings/hiFeatures';
import { addDays, todayInIndia } from './indiaDate';
import { rupeesToPaise } from './money';

/** The coordinator's trip form as typed (strings), before it becomes a TripInput. */
export interface TripForm {
  mandi: string;
  date: string;
  tehsil: string;
  pickupPoint: string;
  vehicle: string;
  capacity: string;
  cost: string;
  note: string;
}

export const EMPTY_TRIP_FORM: TripForm = { mandi: '', date: '', tehsil: '', pickupPoint: '', vehicle: '', capacity: '', cost: '', note: '' };

/** Mirrors MANDI_POOL_RULES (backend/src/config/logisticsRules.ts). */
const MAX_DAYS_AHEAD = 30;
const MAX_CAPACITY = 500;

/** What is missing (Hindi) or the trip to save. `minCapacity`: already booked quintals (editing). */
export function validateTripForm(form: TripForm, minCapacity = 0, today = todayInIndia()): { error: string | null; trip: TripInput | null } {
  const capacity = Number(form.capacity);
  const cost = form.cost.trim() ? rupeesToPaise(form.cost) : undefined;
  if ([form.mandi, form.tehsil, form.pickupPoint, form.vehicle].some((value) => !value.trim())) return { error: hi.sellerProfile.required, trip: null };
  if (!form.date || form.date < today || form.date > addDays(today, MAX_DAYS_AHEAD)) return { error: hiF.mandiTrips.admin.dateInvalid, trip: null };
  if (!Number.isInteger(capacity) || capacity < Math.max(1, minCapacity) || capacity > MAX_CAPACITY) return { error: hiF.mandiTrips.admin.capacityInvalid, trip: null };
  if (cost === null) return { error: hi.sell.missing.price, trip: null };
  return {
    error: null,
    trip: {
      mandi: form.mandi.trim(),
      date: form.date,
      tehsil: form.tehsil.trim(),
      pickupPoint: form.pickupPoint.trim(),
      vehicle: form.vehicle.trim(),
      capacityQuintal: capacity,
      ...(cost !== undefined && { costPerQuintalPaise: cost }),
      ...(form.note.trim() && { note: form.note.trim() }),
    },
  };
}
