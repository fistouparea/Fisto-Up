import { Router } from 'express';
import { createMandiController } from '../controllers/mandi.controller.js';
import type { MandiProvider } from '../services/mandi/agmarknetProvider.js';
import {
  createCalendarController,
  createDashboardController,
  createNotificationsController,
  createWaterController,
  createWeatherController,
  type FarmAdviceDeps,
} from '../controllers/farmAdvice.controller.js';

export function createFarmAdviceRouter(deps: FarmAdviceDeps, mandi: MandiProvider | null): Router {
  const router = Router();
  router.get('/weather', createWeatherController(deps));
  router.get('/water', createWaterController(deps));
  router.get('/calendar', createCalendarController(deps));
  router.get('/notifications', createNotificationsController(deps));
  router.get('/dashboard', createDashboardController(deps));
  router.get('/mandi', createMandiController(deps.farmProfiles, mandi));
  return router;
}
