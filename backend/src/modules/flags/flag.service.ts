import mongoose, { type ClientSession } from 'mongoose';
import { FEATURE_FLAGS, FLAG_KEYS, isOnOffFlag, type FlagKey, type FlagState } from '../../config/featureFlags.js';
import { logger } from '../../observability/logger.js';
import type { AuthUser } from '../auth/auth.types.js';
import { FeatureFlagModel } from './flag.model.js';

const CACHE_MS = 15_000;

export interface FlagView {
  key: FlagKey;
  description: string;
  state: FlagState;
  default: FlagState;
  /** Only off/all (a rule for everyone, e.g. cashPayment). */
  onOff: boolean;
}

/** Who is asking: pilot accounts and coordinators see "pilot" features. */
export function isPilotViewer(user: AuthUser | undefined): boolean {
  return user?.role === 'coordinator' || user?.pilot === true;
}

export function flagAllows(state: FlagState, user: AuthUser | undefined): boolean {
  return state === 'all' || (state === 'pilot' && isPilotViewer(user));
}

/**
 * Current flag states: defaults from config, overridden by coordinators (MongoDB). Read at most every 15 s.
 * Without a database connection the defaults apply, so the advisor never waits for MongoDB.
 */
export class FeatureFlags {
  private cache: { states: Record<FlagKey, FlagState>; until: number } | null = null;

  constructor(private readonly defaults: Record<FlagKey, FlagState>) {}

  async states(): Promise<Record<FlagKey, FlagState>> {
    if (this.cache && this.cache.until > Date.now()) return this.cache.states;
    const states = { ...this.defaults };
    if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
      try {
        for (const row of await FeatureFlagModel.find().lean().exec()) states[row.key] = row.state;
        this.cache = { states, until: Date.now() + CACHE_MS };
      } catch (error) {
        logger.warn({ err: error }, 'feature flags not readable, using defaults');
      }
    }
    return states;
  }

  async isOn(key: FlagKey, user: AuthUser | undefined): Promise<boolean> {
    return flagAllows((await this.states())[key], user);
  }

  /** Every flag as true/false for this person (what the app shows). */
  async forViewer(user: AuthUser | undefined): Promise<Record<FlagKey, boolean>> {
    const states = await this.states();
    return Object.fromEntries(FLAG_KEYS.map((key) => [key, flagAllows(states[key], user)])) as Record<FlagKey, boolean>;
  }

  async list(): Promise<FlagView[]> {
    const states = await this.states();
    return FLAG_KEYS.map((key) => ({ key, description: FEATURE_FLAGS[key].description, state: states[key], default: this.defaults[key], onOff: isOnOffFlag(key) }));
  }

  /** `session`: save the flag in the caller's transaction (e.g. together with the listings it hides). */
  async set(key: FlagKey, state: FlagState, coordinatorId: string, session?: ClientSession): Promise<void> {
    await FeatureFlagModel.updateOne({ key }, { $set: { state, updatedBy: coordinatorId } }, { upsert: true, ...(session && { session }) }).exec();
    this.cache = null;
  }

  clearCache(): void {
    this.cache = null;
  }
}

/** Cash at delivery allowed (flag cashPayment; only off/all, so the same for every viewer). */
export function cashPaymentOn(flags: FeatureFlags): Promise<boolean> {
  return flags.isOn('cashPayment', undefined);
}
