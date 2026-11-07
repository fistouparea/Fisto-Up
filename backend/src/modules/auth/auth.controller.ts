import type { RequestHandler, Response } from 'express';
import { parseOrThrow } from '../../utils/validation.js';
import { toAccountView } from './accountView.js';
import { clearSessionCookie, currentUser, setSessionCookie } from './auth.middleware.js';
import type { AuthService } from './auth.service.js';
import { loginBodySchema, registerBodySchema, type AccountView } from './auth.types.js';
import type { SessionTokens } from './sessionToken.js';
import type { UserDocument } from './user.model.js';
import { UserModel } from './user.model.js';
import { PushSubscriptionModel } from '../../models/PushSubscription.js';
import { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { cashPaymentOn, type FeatureFlags } from '../flags/flag.service.js';
import { inviteCodeSchema, redeemInvite, releaseInvite } from '../invites/invite.service.js';

function parseInviteCode(code: string): string {
  const parsed = inviteCodeSchema.safeParse(code);
  if (!parsed.success) throw new AppError('INVALID_INVITE');
  return parsed.data;
}

const logoutBodySchema = z.object({ pushEndpoint: z.url().max(1000).optional() });

export interface AuthControllerDeps {
  auth: AuthService;
  tokens: SessionTokens;
  cookieSecure: boolean;
  flags: FeatureFlags;
}

type AccountResponse = Response<{ user: AccountView | null }>;

export function createAuthController({ auth, tokens, cookieSecure, flags }: AuthControllerDeps) {
  const startSession = async (res: AccountResponse, user: UserDocument) => {
    setSessionCookie(res, await tokens.sign({ userId: user._id.toString(), version: user.tokenVersion }), cookieSecure);
    res.json({ user: toAccountView(user, await cashPaymentOn(flags)) });
  };

  /** While the pilot is invite-only, a valid invite code is needed; any valid code makes it a pilot account. */
  const register: RequestHandler = async (req, res: AccountResponse) => {
    const { inviteCode, ...body } = parseOrThrow(registerBodySchema, req.body);
    if (!inviteCode && (await flags.isOn('inviteOnly', undefined))) throw new AppError('INVITE_REQUIRED');
    const inviteId = inviteCode ? await redeemInvite(parseInviteCode(inviteCode), body.role) : undefined;
    let user: UserDocument;
    try {
      user = await auth.createAccount({ ...body, pilot: Boolean(inviteId), inviteId });
    } catch (error) {
      if (inviteId) await releaseInvite(inviteId);
      throw error;
    }
    res.status(201);
    await startSession(res, user);
  };

  const login: RequestHandler = async (req, res: AccountResponse) => {
    await startSession(res, await auth.login(parseOrThrow(loginBodySchema, req.body)));
  };

  const logout: RequestHandler = async (req, res: Response<{ ok: true }>) => {
    if (req.user) {
      await auth.logout(req.user.id);
      // This phone should stop getting this account's order notifications.
      const endpoint = logoutBodySchema.safeParse(req.body ?? {}).data?.pushEndpoint;
      if (endpoint) await PushSubscriptionModel.updateOne({ endpoint, userId: req.user.id }, { $unset: { userId: 1 } }).exec();
    }
    clearSessionCookie(res, cookieSecure);
    res.json({ ok: true });
  };

  /** 200 with `user: null` when not logged in, so the app can check without an error. */
  const me: RequestHandler = async (req, res: AccountResponse) => {
    const user = req.user ? await UserModel.findById(currentUser(req).id).exec() : null;
    res.json({ user: user ? toAccountView(user, await cashPaymentOn(flags)) : null });
  };

  return { register, login, logout, me };
}
