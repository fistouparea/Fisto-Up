import { z } from 'zod';

/** Crop ids accepted by the API, with the name we send to the AI model. */
export const CROPS = {
  bajra: 'बाजरा (Bajra / Pearl millet)',
  guar: 'ग्वार (Guar / Cluster bean)',
  moong: 'मूंग (Moong / Green gram)',
  moth: 'मोठ (Moth / Moth bean)',
  chana: 'चना (Chana / Chickpea)',
  sarson: 'सरसों (Sarson / Mustard)',
  jeera: 'जीरा (Jeera / Cumin)',
  gehun: 'गेहूं (Gehun / Wheat)',
  other: 'अन्य (Other - identify the plant from the photo)',
} as const;

export type CropId = keyof typeof CROPS;

export const cropIdSchema = z.enum(Object.keys(CROPS) as [CropId, ...CropId[]]);

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageMimeType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const hindiText = z.string().trim().max(1000);
const hindiList = z.array(hindiText.min(1)).max(8);

/** Shape the AI model must return. Validated before anything reaches the farmer. */
export const aiDiagnosisSchema = z.object({
  is_plant_image: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  problem_name: hindiText,
  explanation: hindiText,
  desi_upay: hindiList,
  dawai: z
    .array(
      z.object({
        name: hindiText.min(1),
        kaise_use_karein: hindiText.min(1),
      }),
    )
    .max(8),
  savdhani: hindiList,
});

export type AiDiagnosis = z.infer<typeof aiDiagnosisSchema>;

/** The farmer-facing part of a diagnosis (no internal confidence flags). */
export const diagnosisSchema = aiDiagnosisSchema.omit({ is_plant_image: true, confidence: true });
export type Diagnosis = z.infer<typeof diagnosisSchema>;

/** Response body of POST /api/diagnose. */
export type DiagnoseResponse = { status: 'ok'; diagnosis: Diagnosis } | { status: 'unclear' };
