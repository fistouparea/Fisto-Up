import { model, Schema } from 'mongoose';
import { CROPS } from '../types/diagnosis.js';
import { IRRIGATION_SOURCES } from '../types/farm.js';

const farmCropSchema = new Schema(
  {
    crop: { type: String, required: true, enum: Object.keys(CROPS) },
    sowingDate: { type: String, required: true },
    lastWateredOn: { type: String },
  },
  { _id: false },
);

/** "मेरा खेत": one profile per anonymous device. Location is stored rounded (~1 km). */
const farmProfileSchema = new Schema(
  {
    deviceId: { type: String, required: true, unique: true },
    location: {
      type: new Schema(
        {
          lat: { type: Number, required: true },
          lon: { type: Number, required: true },
          source: { type: String, required: true, enum: ['gps', 'list'] },
          district: String,
          tehsil: String,
        },
        { _id: false },
      ),
    },
    crops: { type: [farmCropSchema], default: [] },
    fieldSizeBigha: Number,
    irrigation: { type: String, enum: IRRIGATION_SOURCES },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false },
);

export const FarmProfileModel = model('FarmProfile', farmProfileSchema, 'farm_profiles');
