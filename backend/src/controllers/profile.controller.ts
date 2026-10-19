import type { RequestHandler, Response } from 'express';
import type { FarmProfileRepository } from '../services/farm/farmProfileRepository.js';
import { markCropWatered, saveFarmProfile } from '../services/farm/farmProfileService.js';
import {
  markWateredBodySchema,
  profileQuerySchema,
  saveProfileBodySchema,
  type StoredFarmProfile,
} from '../types/farm.js';
import { parseOrThrow, requireRepository } from '../utils/validation.js';

type ProfileResponse = Response<{ profile: StoredFarmProfile | null }>;

export function createGetProfileController(repository: FarmProfileRepository | null): RequestHandler {
  return async (req, res: ProfileResponse) => {
    const query = parseOrThrow(profileQuerySchema, req.query);
    res.json({ profile: await requireRepository(repository).get(query.deviceId) });
  };
}

export function createSaveProfileController(repository: FarmProfileRepository | null): RequestHandler {
  return async (req, res: ProfileResponse) => {
    const body = parseOrThrow(saveProfileBodySchema, req.body);
    res.json({ profile: await saveFarmProfile(requireRepository(repository), body.deviceId, body.profile) });
  };
}

export function createMarkWateredController(repository: FarmProfileRepository | null): RequestHandler {
  return async (req, res: ProfileResponse) => {
    const body = parseOrThrow(markWateredBodySchema, req.body);
    res.json({ profile: await markCropWatered(requireRepository(repository), body.deviceId, body.crop) });
  };
}
