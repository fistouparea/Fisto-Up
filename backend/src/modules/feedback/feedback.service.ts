import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import type { HistoryRepository } from '../../services/history/historyRepository.js';
import { deviceIdSchema } from '../../types/history.js';
import type { DeviceDataSource } from '../privacy/privacy.service.js';
import { DiagnosisFeedbackModel } from './feedback.model.js';
import { track } from '../metrics/events.js';

export const FEEDBACK_COMMENT_MAX = 500;

export const feedbackBodySchema = z.object({
  deviceId: deviceIdSchema,
  helpful: z.boolean(),
  comment: z.string().trim().max(FEEDBACK_COMMENT_MAX).optional(),
});

/** Saves (or changes) this phone's answer for one of its own diagnoses. */
export async function saveFeedback(history: HistoryRepository, diagnosisId: string, body: z.infer<typeof feedbackBodySchema>): Promise<void> {
  const record = await history.findById(body.deviceId, diagnosisId);
  if (!record) throw new AppError('NOT_FOUND');
  await DiagnosisFeedbackModel.updateOne(
    { diagnosisId },
    {
      $set: {
        deviceId: body.deviceId,
        crop: record.crop,
        problemName: record.diagnosis.problem_name,
        severity: record.diagnosis.severity,
        helpful: body.helpful,
        ...(body.comment ? { comment: body.comment } : {}),
      },
      ...(body.comment ? {} : { $unset: { comment: 1 } }),
    },
    { upsert: true },
  ).exec();
  track('feedback_given', { deviceId: body.deviceId, props: { crop: record.crop, helpful: body.helpful } });
}

/** For "मेरा डेटा": feedback belongs to the phone and goes with it. */
export const feedbackDeviceData: DeviceDataSource = {
  name: 'aiFeedback',
  export: ({ deviceIds }) =>
    DiagnosisFeedbackModel.find({ deviceId: { $in: deviceIds } }, { _id: 0, deviceId: 0 }).lean().exec(),
  erase: async ({ deviceIds }) => (await DiagnosisFeedbackModel.deleteMany({ deviceId: { $in: deviceIds } }).exec()).deletedCount,
};
