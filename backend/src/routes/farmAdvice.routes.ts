import { Router } from 'express';
import {
  createCalendarController,
  createNotificationsController,
  createWaterController,
  createWeatherController,
  type FarmAdviceDeps,
} from '../controllers/farmAdvice.controller.js';

export function createFarmAdviceRouter(deps: FarmAdviceDeps): Router {
  const router = Router();
  router.get('/weather', createWeatherController(deps));
  router.get('/water', createWaterController(deps));
  router.get('/calendar', createCalendarController(deps));
  router.get('/notifications', createNotificationsController(deps));
  return router;
}
