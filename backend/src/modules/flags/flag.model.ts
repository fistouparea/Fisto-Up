import { model, Schema } from 'mongoose';
import { FLAG_KEYS, FLAG_STATES } from '../../config/featureFlags.js';

/** A coordinator's choice for one flag (overrides the default in config/featureFlags.ts). */
const featureFlagSchema = new Schema(
  {
    key: { type: String, enum: FLAG_KEYS, required: true, unique: true },
    state: { type: String, enum: FLAG_STATES, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false },
);

export const FeatureFlagModel = model('FeatureFlag', featureFlagSchema, 'feature_flags');
