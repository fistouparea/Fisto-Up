import type { AiDiagnosis, DiagnoseResponse } from '../types/diagnosis.js';
import type { AiProvider, DiagnoseInput } from './ai/aiProvider.js';
import { withPacketDoseNote } from './dawaiSafety.js';

/** Runs the AI diagnosis and hides any result that is not confident enough to show a farmer. */
export async function diagnosePhoto(provider: AiProvider, input: DiagnoseInput): Promise<DiagnoseResponse> {
  const result = await provider.diagnose(input);
  return toDiagnoseResponse(result);
}

export function toDiagnoseResponse(result: AiDiagnosis): DiagnoseResponse {
  if (!isShowable(result)) {
    return { status: 'unclear' };
  }
  const { is_plant_image: _isPlant, confidence: _confidence, ...diagnosis } = result;
  return { status: 'ok', diagnosis: withPacketDoseNote(diagnosis) };
}

function isShowable(result: AiDiagnosis): boolean {
  return result.is_plant_image && result.confidence !== 'low' && result.problem_name.length > 0;
}
