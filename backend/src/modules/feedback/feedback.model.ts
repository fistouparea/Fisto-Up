import { model, Schema } from 'mongoose';
import { CROPS, SEVERITIES } from '../../types/diagnosis.js';

/**
 * "क्या जवाब सही था?" for one saved diagnosis: 👍/👎 and an optional comment (typed or spoken; only the text is
 * kept, never audio). The device id is only for "may change own answer" and for deleting; exports never show it.
 */
const diagnosisFeedbackSchema = new Schema(
  {
    diagnosisId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true, index: true },
    crop: { type: String, enum: Object.keys(CROPS), required: true },
    problemName: { type: String, required: true },
    severity: { type: String, enum: SEVERITIES },
    helpful: { type: Boolean, required: true },
    comment: String,
  },
  { timestamps: true, versionKey: false },
);
// Pilot dashboard ("👍 by crop" in the chosen weeks) and the comments export.
diagnosisFeedbackSchema.index({ updatedAt: -1 });

export const DiagnosisFeedbackModel = model('DiagnosisFeedback', diagnosisFeedbackSchema, 'diagnosis_feedback');
