import { model, Schema } from 'mongoose';

/**
 * "मैं सहमत हूँ" on the first-run consent screen: which version of the text, when, on which phone.
 * Every acceptance is a new record (proof of consent); all of a phone's records go when its data is deleted.
 */
const consentSchema = new Schema(
  {
    deviceId: { type: String, required: true },
    version: { type: String, required: true },
    lang: { type: String, enum: ['hi', 'en'], required: true },
    acceptedAt: { type: Date, required: true },
  },
  { versionKey: false },
);
consentSchema.index({ deviceId: 1, acceptedAt: -1 });

export const ConsentModel = model('Consent', consentSchema, 'consents');

/** Proof that a deletion happened, without saying whose data it was (no ids, no names). */
const deletionLogSchema = new Schema(
  {
    at: { type: Date, required: true },
    scope: { type: String, enum: ['device', 'account'], required: true },
    role: String,
    counts: { type: Schema.Types.Mixed },
  },
  { versionKey: false },
);

export const DeletionLogModel = model('DeletionLog', deletionLogSchema, 'deletion_log');
