import { Router } from 'express';
import { createHistoryItemController, createHistoryListController } from '../controllers/history.controller.js';
import type { HistoryRepository } from '../services/history/historyRepository.js';

export function createHistoryRouter(history: HistoryRepository | null): Router {
  const router = Router();
  router.get('/history', createHistoryListController(history));
  router.get('/history/:id', createHistoryItemController(history));
  return router;
}
