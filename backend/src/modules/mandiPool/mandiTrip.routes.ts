import express, { Router, type Response } from 'express';
import { AppError } from '../../errors/AppError.js';
import { parseOrThrow } from '../../utils/validation.js';
import { audit } from '../audit/audit.service.js';
import { currentUser, requireRole, requireUser } from '../auth/auth.middleware.js';
import type { FeatureFlags } from '../flags/flag.service.js';
import { createTripSchema, joinTripSchema, MandiPool, toTripView, tripStatusSchema, type TripView } from './mandiTrip.service.js';

/** "साथ में मंडी चलें": coordinators plan trips; logged-in farmers join or leave. */
export function createMandiTripRouter({ flags, now }: { flags: FeatureFlags; now?: () => Date }): Router {
  const router = Router();
  const pool = new MandiPool(now);
  const json = express.json({ limit: '8kb' });
  const id = (value: unknown) => String(value);
  router.use(['/mandi-trips', '/admin/mandi-trips'], async (req, _res, next) => {
    if (!(await flags.isOn('mandiPool', req.user))) throw new AppError('FORBIDDEN', 'Feature off');
    next();
  });

  router.get('/mandi-trips', async (req, res: Response<{ items: TripView[] }>) => {
    const trips = await pool.listUpcoming(req.user);
    res.json({ items: await Promise.all(trips.map((trip) => toTripView(trip, req.user))) });
  });
  router.post('/mandi-trips/:id/join', requireUser, json, async (req, res: Response<{ trip: TripView }>) => {
    const user = currentUser(req);
    if (user.role === 'coordinator') throw new AppError('FORBIDDEN', 'Coordinators manage trips');
    res.json({ trip: await toTripView(await pool.join(user, id(req.params.id), parseOrThrow(joinTripSchema, req.body)), user) });
  });
  router.post('/mandi-trips/:id/leave', requireUser, async (req, res: Response<{ trip: TripView }>) => {
    const user = currentUser(req);
    res.json({ trip: await toTripView(await pool.leave(user, id(req.params.id)), user) });
  });

  router.get('/admin/mandi-trips', requireRole('coordinator'), async (req, res: Response<{ items: TripView[] }>) => {
    const trips = await pool.listAll();
    res.json({ items: await Promise.all(trips.map((trip) => toTripView(trip, req.user, { withMembers: true }))) });
  });
  router.post('/admin/mandi-trips', requireRole('coordinator'), json, async (req, res: Response<{ trip: TripView }>) => {
    const trip = await pool.create(currentUser(req), parseOrThrow(createTripSchema, req.body));
    await audit(req, 'mandiTrip.create', { type: 'mandiTrip', id: trip._id.toString() }, { mandi: trip.mandi, date: trip.date });
    res.status(201).json({ trip: await toTripView(trip, req.user, { withMembers: true }) });
  });
  router.post('/admin/mandi-trips/:id/status', requireRole('coordinator'), json, async (req, res: Response<{ trip: TripView }>) => {
    const { status } = parseOrThrow(tripStatusSchema, req.body);
    const trip = await pool.setStatus(id(req.params.id), status);
    await audit(req, 'mandiTrip.status', { type: 'mandiTrip', id: trip._id.toString() }, { status });
    res.json({ trip: await toTripView(trip, req.user, { withMembers: true }) });
  });
  return router;
}
