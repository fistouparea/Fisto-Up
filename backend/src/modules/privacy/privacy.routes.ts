import express, { Router, type Response } from 'express';
import { z } from 'zod';
import { CONSENT_VERSION } from '../../config/privacy.js';
import type { PhotoStorage } from '../../services/storage/photoStorage.js';
import { deviceIdSchema } from '../../types/history.js';
import { parseOrThrow, requireRepository } from '../../utils/validation.js';
import { clearSessionCookie } from '../auth/auth.middleware.js';
import {
  deletePersonalData,
  exportPersonalData,
  latestConsent,
  recordConsent,
  type ConsentView,
  type DeletionResult,
  type DeviceDataSource,
} from './privacy.service.js';

const consentBodySchema = z.object({ deviceId: deviceIdSchema, lang: z.enum(['hi', 'en']).default('hi'), version: z.literal(CONSENT_VERSION) });
const deviceQuerySchema = z.object({ deviceId: deviceIdSchema });
/** The app sends the word only after the person confirmed twice. */
const deleteBodySchema = z.object({ deviceId: deviceIdSchema, confirm: z.literal('DELETE') });

/** First-run consent. Works without login; needs MongoDB (`enabled`). */
export function createConsentRouter(enabled: boolean): Router {
  const router = Router();
  const storage = () => requireRepository(enabled ? true : null);

  router.get('/consent', async (req, res: Response<{ consent: ConsentView | null; currentVersion: string }>) => {
    storage();
    const { deviceId } = parseOrThrow(deviceQuerySchema, req.query);
    res.json({ consent: await latestConsent(deviceId), currentVersion: CONSENT_VERSION });
  });

  router.post('/consent', express.json({ limit: '2kb' }), async (req, res: Response<{ consent: ConsentView }>) => {
    storage();
    const { deviceId, lang } = parseOrThrow(consentBodySchema, req.body);
    res.status(201).json({ consent: await recordConsent(deviceId, lang) });
  });
  return router;
}

export interface MyDataDeps {
  photos: PhotoStorage;
  cookieSecure: boolean;
  /** Data of later features linked to the phone (feedback, help requests). */
  deviceData?: DeviceDataSource[];
}

/**
 * "मेरा डेटा": download everything and delete it. The phone's anonymous id proves the device data is yours;
 * the login cookie (if any) adds the account. Runs behind the marketplace session middleware.
 */
export function createMyDataRouter({ photos, cookieSecure, deviceData = [] }: MyDataDeps): Router {
  const router = Router();

  router.get('/account/my-data', async (req, res) => {
    const { deviceId } = parseOrThrow(deviceQuerySchema, req.query);
    const data = await exportPersonalData(deviceId, req.user, deviceData);
    res
      .set('Content-Disposition', 'attachment; filename="agriai-mera-data.json"')
      .set('Cache-Control', 'no-store')
      .json(data);
  });

  router.post('/account/my-data/delete', express.json({ limit: '2kb' }), async (req, res: Response<DeletionResult>) => {
    const { deviceId } = parseOrThrow(deleteBodySchema, req.body);
    const result = await deletePersonalData(deviceId, req.user, photos, deviceData);
    if (req.user) clearSessionCookie(res, cookieSecure);
    res.json(result);
  });
  return router;
}
