import type { RequestHandler, Response } from 'express';
import { WATER_TIPS } from '../config/agroRules.js';
import { AppError } from '../errors/AppError.js';
import { buildFarmSnapshot, type FarmSnapshot, type FarmSnapshotDeps } from '../services/farm/farmSnapshot.js';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';
import type { HistoryRepository } from '../services/history/historyRepository.js';
import type { WeatherProvider } from '../services/weather/weatherProvider.js';
import { profileQuerySchema } from '../types/farm.js';
import { parseOrThrow, requireRepository } from '../utils/validation.js';
import { track } from '../modules/metrics/events.js';
import type { EventName } from '../config/metrics.js';

export interface FarmAdviceDeps {
  farmProfiles: FarmProfileRepository | null;
  history: HistoryRepository | null;
  weather: WeatherProvider | null;
}

/** Wraps a handler that only needs the farm snapshot of the requesting device. */
function snapshotHandler<T>(deps: FarmAdviceDeps, respond: (snapshot: FarmSnapshot) => T, event?: EventName): RequestHandler {
  return async (req, res: Response<T>) => {
    const { deviceId } = parseOrThrow(profileQuerySchema, req.query);
    if (event) track(event, { deviceId });
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

/** Tasks shown on the home screen: at most this many, from all crops. */
const DASHBOARD_TASK_LIMIT = 3;

/**
 * GET /api/dashboard — everything the home screen needs in one request (slow networks):
 * today's weather, alerts, today's tasks, water advice and pending follow-ups.
 */
export const createDashboardController = (deps: FarmAdviceDeps) =>
  snapshotHandler(deps, ({ profile, forecast, alerts, crops, water, notifications }) => ({
    generatedAt: new Date().toISOString(),
    hasProfile: profile !== null,
    forecast,
    alerts,
    tasks: crops
      .filter((crop) => crop.stage !== null)
      .flatMap((crop) => crop.tasks.slice(0, 1).map((task) => ({ crop: crop.crop, stageName: crop.stageName, task })))
      .slice(0, DASHBOARD_TASK_LIMIT),
    water,
    followUps: notifications.filter((item) => item.type === 'followup'),
  }), 'dashboard_view');

/** GET /api/notifications — alerts, tasks and follow-ups as notifications. */
export const createNotificationsController = (deps: FarmAdviceDeps) =>
  snapshotHandler(deps, ({ notifications }) => ({ items: notifications }));
