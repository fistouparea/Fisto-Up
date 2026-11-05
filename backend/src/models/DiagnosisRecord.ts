import { model, Schema } from 'mongoose';
import { CROPS, SEVERITIES } from '../types/diagnosis.js';
import { FOLLOW_UP_ANSWERS } from '../types/history.js';

const dawaiSchema = new Schema(
  {
    name: { type: String, required: true },
    kaise_use_karein: { type: String, required: true },
  },
  { _id: false },
);

const diagnosisSchema = new Schema(
  {
    problem_name: { type: String, required: true },
    explanation: { type: String, default: '' },
    desi_upay: { type: [String], default: [] },
    dawai: { type: [dawaiSchema], default: [] },
    savdhani: { type: [String], default: [] },
    severity: { type: String, enum: SEVERITIES },
  },
  { _id: false },
);

/** A saved diagnosis. The photo itself is never stored. */
const diagnosisRecordSchema = new Schema(
  {
    deviceId: { type: String, required: true },
    crop: { type: String, required: true, enum: Object.keys(CROPS) },
    diagnosis: { type: diagnosisSchema, required: true },
    /** "क्या फसल ठीक हुई?" answer, a few days after the check. */
    followUp: {
      type: new Schema(
        { answer: { type: String, enum: FOLLOW_UP_ANSWERS, required: true }, answeredAt: { type: Date, required: true } },
        { _id: false },
      ),
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

diagnosisRecordSchema.index({ deviceId: 1, createdAt: -1 });
// Pilot dashboard: follow-up answers given in the chosen weeks.
diagnosisRecordSchema.index({ 'followUp.answeredAt': 1 }, { partialFilterExpression: { followUp: { $exists: true } } });


export const DiagnosisRecord = model('DiagnosisRecord', diagnosisRecordSchema, 'diagnoses');
