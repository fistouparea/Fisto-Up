import express, { Router } from 'express';
import {
  createGetProfileController,
  createMarkWateredController,
  createSaveProfileController,
} from '../controllers/profile.controller.js';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';

export function createProfileRouter(repository: FarmProfileRepository | null): Router {
  const router = Router();
  const json = express.json({ limit: '16kb' });
  router.get('/profile', createGetProfileController(repository));
  router.put('/profile', json, createSaveProfileController(repository));
  router.post('/profile/watered', json, createMarkWateredController(repository));
  return router;
}
