import { model, Schema } from 'mongoose';
import { EVENT_NAMES, EVENT_RETENTION_DAYS } from '../../config/metrics.js';

/**
 * One product event. `actor` is a keyed hash of the phone's id *and the week*: it counts weekly active phones,
 * but cannot be linked to the phone, to a person, or to the same phone in another week. `props` holds only
 * fixed values (crop, result, category), never free text.
 */
const eventSchema = new Schema(
  {
    name: { type: String, enum: EVENT_NAMES, required: true },
    at: { type: Date, required: true },
    week: { type: String, required: true },
    actor: String,
    props: { type: Schema.Types.Mixed },
  },
  { versionKey: false },
);
eventSchema.index({ week: 1, name: 1 });
eventSchema.index({ at: 1 }, { expireAfterSeconds: EVENT_RETENTION_DAYS * 86_400 });
eventSchema.index({ actor: 1 });

export const EventModel = model('Event', eventSchema, 'events');
