import { model, Schema } from 'mongoose';
import { SCHEME_STATUSES } from '../../data/schemes.js';

/** A coordinator's correction of one scheme from data/schemes.ts. Only the fields they changed are stored. */
const schemeOverrideSchema = new Schema(
  {
    schemeId: { type: String, required: true, unique: true },
    summary: String,
    whoCanApply: { type: [String], default: undefined },
    documents: { type: [String], default: undefined },
    officialLink: String,
    helpline: String,
    source_url: String,
    last_verified: String,
    status: { type: String, enum: SCHEME_STATUSES },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: false },
);

export const SchemeOverrideModel = model('SchemeOverride', schemeOverrideSchema, 'scheme_overrides');
