import express, { Router } from 'express';
import {
  createFollowUpController,
  createHistoryItemController,
  createHistoryListController,
} from '../controllers/history.controller.js';
import type { HistoryRepository } from '../services/history/historyRepository.js';

export function createHistoryRouter(history: HistoryRepository | null): Router {
  const router = Router();
  router.get('/history', createHistoryListController(history));
  router.get('/history/:id', createHistoryItemController(history));
  router.post('/history/:id/follow-up', express.json({ limit: '4kb' }), createFollowUpController(history));
  return router;
}
