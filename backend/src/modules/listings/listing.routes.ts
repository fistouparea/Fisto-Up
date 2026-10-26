import express, { Router, type RequestHandler, type Response } from 'express';
import multer from 'multer';
import { AppError } from '../../errors/AppError.js';
import { detectImageType } from '../../middleware/validateImage.js';
import type { AiProvider } from '../../services/ai/aiProvider.js';
import type { PhotoStorage } from '../../services/storage/photoStorage.js';
import { MAX_IMAGE_BYTES } from '../../types/diagnosis.js';
import { parseOrThrow } from '../../utils/validation.js';
import { audit } from '../audit/audit.service.js';
import { currentUser, requireRole } from '../auth/auth.middleware.js';
import {
  createListing,
  draftListing,
  findPhoto,
  listSellerListings,
  photoContent,
  storePhoto,
  toSellerListingView,
  updateListing,
  type UploadedPhoto,
} from './listing.service.js';
import { findPublicListing, searchListings, searchQuerySchema, type SearchPage } from './listing.search.js';
import {
  createListingBodySchema,
  draftBodySchema,
  updateListingBodySchema,
  type DraftResponse,
  type PublicListingView,
  type SellerListingView,
} from './listing.types.js';

/** One photo in memory (never on disk) plus a short text field (the seller's spoken words). */
const uploadListingPhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 3, fieldSize: 4 * 1024 },
}).single('image');

function requirePhoto(file: Express.Multer.File | undefined): UploadedPhoto {
  if (!file) throw new AppError('INVALID_IMAGE', 'No image uploaded');
  const mimeType = detectImageType(file.buffer);
  if (!mimeType) throw new AppError('INVALID_IMAGE', 'Unsupported image type');
  return { buffer: file.buffer, mimeType };
}

export interface ListingRouterDeps {
  ai: AiProvider;
  aiRateLimit: RequestHandler;
  photos: PhotoStorage;
}

export function createListingRouter({ ai, aiRateLimit, photos }: ListingRouterDeps): Router {
  const router = Router();
  const json = express.json({ limit: '16kb' });
  const canList = requireRole('seller', 'coordinator');

  router.post('/market/listings/draft', canList, aiRateLimit, uploadListingPhoto, async (req, res: Response<DraftResponse>) => {
    const { text } = parseOrThrow(draftBodySchema, req.body ?? {});
    res.json(await draftListing(ai, photos, currentUser(req), requirePhoto(req.file), text));
  });

  router.post('/market/photos', canList, uploadListingPhoto, async (req, res: Response<{ photoId: string }>) => {
    res.status(201).json({ photoId: await storePhoto(photos, currentUser(req).id, requirePhoto(req.file)) });
  });

  router.get('/market/photos/:id', async (req, res) => {
    const photo = await findPhoto(String(req.params.id), req.user);
    const content = photo ? await photoContent(photo, photos) : null;
    if (!photo || !content) throw new AppError('NOT_FOUND');
    // A saved photo never changes, so phones can keep it (saves data on slow networks).
    res.set('Cache-Control', photo.attached ? 'public, max-age=604800, immutable' : 'private, no-store');
    if (content.kind === 'redirect') {
      res.redirect(302, content.url);
      return;
    }
    res.type(content.mimeType).set('Cross-Origin-Resource-Policy', 'cross-origin').send(content.data);
  });

  // Public (no login): browse and open listings. Never includes phone numbers or UPI IDs.
  router.get('/market/listings', async (req, res: Response<SearchPage>) => {
    res.json(await searchListings(parseOrThrow(searchQuerySchema, req.query)));
  });

  router.get('/market/listings/:id', async (req, res: Response<{ listing: PublicListingView }>) => {
    const listing = await findPublicListing(String(req.params.id), req.user);
    if (!listing) throw new AppError('NOT_FOUND');
    res.json({ listing });
  });

  router.post('/market/listings', requireRole('seller'), json, async (req, res: Response<{ listing: SellerListingView }>) => {
    const body = parseOrThrow(createListingBodySchema, req.body);
    const user = currentUser(req);
    const listing = await createListing(user.id, body, { uploaderId: user.id });
    res.status(201).json({ listing: toSellerListingView(listing) });
  });

  router.patch('/market/listings/:id', canList, json, async (req, res: Response<{ listing: SellerListingView }>) => {
    const body = parseOrThrow(updateListingBodySchema, req.body);
    const user = currentUser(req);
    const listing = await updateListing(user, String(req.params.id), body);
    if (user.role === 'coordinator') await audit(req, 'listing.update', { type: 'listing', id: listing._id.toString() }, { ...body });
    res.json({ listing: toSellerListingView(listing) });
  });

  router.get('/market/my/listings', requireRole('seller'), async (req, res: Response<{ items: SellerListingView[] }>) => {
    const listings = await listSellerListings(currentUser(req).id);
    res.json({ items: listings.map(toSellerListingView) });
  });

  return router;
}
