import type { RequestHandler, Response } from 'express';
import { WATER_TIPS } from '../config/agroRules.js';
import { AppError } from '../errors/AppError.js';
import { buildFarmSnapshot, type FarmSnapshot, type FarmSnapshotDeps } from '../services/farm/farmSnapshot.js';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';
import type { HistoryRepository } from '../services/history/historyRepository.js';
import type { WeatherProvider } from '../services/weather/weatherProvider.js';
import { profileQuerySchema } from '../types/farm.js';
import { parseOrThrow, requireRepository } from '../utils/validation.js';

export interface FarmAdviceDeps {
  farmProfiles: FarmProfileRepository | null;
  history: HistoryRepository | null;
  weather: WeatherProvider | null;
}

/** Wraps a handler that only needs the farm snapshot of the requesting device. */
function snapshotHandler<T>(deps: FarmAdviceDeps, respond: (snapshot: FarmSnapshot) => T): RequestHandler {
  return async (req, res: Response<T>) => {
    const { deviceId } = parseOrThrow(profileQuerySchema, req.query);
    const snapshotDeps: FarmSnapshotDeps = { ...deps, farmProfiles: requireRepository(deps.farmProfiles) };
    res.json(respond(await buildFarmSnapshot(snapshotDeps, deviceId)));
  };
}

/** GET /api/weather — forecast for the farm location plus crop-aware alerts. */
export const createWeatherController = (deps: FarmAdviceDeps) =>
  snapshotHandler(deps, ({ profile, forecast, alerts }) => {
    if (profile?.location && !forecast) throw new AppError('WEATHER_UNAVAILABLE');
    return { forecast, alerts };
  });

/** GET /api/water — today's water advice per crop plus saving tips. */
export const createWaterController = (deps: FarmAdviceDeps) =>
  snapshotHandler(deps, ({ water }) => ({ advice: water, tips: WATER_TIPS }));

/** GET /api/calendar — stage timeline and "आज का काम" per crop. */
export const createCalendarController = (deps: FarmAdviceDeps) => snapshotHandler(deps, ({ crops }) => ({ crops }));

/** GET /api/notifications — alerts, tasks and follow-ups as notifications. */
export const createNotificationsController = (deps: FarmAdviceDeps) =>
  snapshotHandler(deps, ({ notifications }) => ({ items: notifications }));
