import { isRecord, requestApi } from './client';
import type { CropId, DiagnoseResponse } from './types';

/** Uploads the photo and crop. Resolves with the diagnosis or throws an ApiError. */
export function diagnoseCrop(crop: CropId, photo: Blob): Promise<DiagnoseResponse> {
  const form = new FormData();
  form.append('crop', crop);
  form.append('image', photo, 'photo.jpg');

  return requestApi('/api/diagnose', { method: 'POST', body: form }, isDiagnoseResponse);
}

function isDiagnoseResponse(body: unknown): body is DiagnoseResponse {
  if (!isRecord(body)) return false;
  if (body.status === 'unclear') return true;
  return body.status === 'ok' && isRecord(body.diagnosis);
}
