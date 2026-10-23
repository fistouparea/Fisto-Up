import express, { Router, type Response } from 'express';
import { parseOrThrow } from '../../utils/validation.js';
import { toAccountView } from '../auth/accountView.js';
import { currentUser, requireRole } from '../auth/auth.middleware.js';
import type { AccountView } from '../auth/auth.types.js';
import { saveBuyerProfile, saveSellerProfile } from './seller.service.js';
import { buyerProfileBodySchema, sellerProfileBodySchema } from './seller.types.js';

/** The logged-in seller's / buyer's own profile. */
export function createAccountRouter(): Router {
  const router = Router();
  const json = express.json({ limit: '8kb' });

  router.put('/account/seller-profile', requireRole('seller'), json, async (req, res: Response<{ user: AccountView }>) => {
    const body = parseOrThrow(sellerProfileBodySchema, req.body);
    res.json({ user: toAccountView(await saveSellerProfile(currentUser(req).id, body)) });
  });

  router.put('/account/buyer-profile', requireRole('buyer'), json, async (req, res: Response<{ user: AccountView }>) => {
    const body = parseOrThrow(buyerProfileBodySchema, req.body);
    res.json({ user: toAccountView(await saveBuyerProfile(currentUser(req).id, body)) });
  });
  return router;
}
