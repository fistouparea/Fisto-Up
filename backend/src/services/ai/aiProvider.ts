import type { AiDiagnosis, ImageMimeType } from '../../types/diagnosis.js';

export interface DiagnoseInput {
  image: Buffer;
  mimeType: ImageMimeType;
  /** Crop name as chosen by the farmer. This and the image are the only data sent to the AI. */
  cropName: string;
}

/**
 * Any AI vision service that can diagnose a crop photo.
 * Implementations must return validated data or throw an AppError
 * (RATE_LIMITED, AI_TIMEOUT or AI_ERROR).
 */
export interface AiProvider {
  diagnose(input: DiagnoseInput): Promise<AiDiagnosis>;
}
