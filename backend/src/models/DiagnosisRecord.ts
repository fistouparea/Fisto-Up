import { model, Schema, type InferSchemaType } from 'mongoose';
import { CROPS } from '../types/diagnosis.js';

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
  },
  { _id: false },
);

/** A saved diagnosis. The photo itself is never stored. */
const diagnosisRecordSchema = new Schema(
  {
    deviceId: { type: String, required: true },
    crop: { type: String, required: true, enum: Object.keys(CROPS) },
    diagnosis: { type: diagnosisSchema, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

diagnosisRecordSchema.index({ deviceId: 1, createdAt: -1 });

export type DiagnosisRecordDocument = InferSchemaType<typeof diagnosisRecordSchema>;

export const DiagnosisRecord = model('DiagnosisRecord', diagnosisRecordSchema, 'diagnoses');
