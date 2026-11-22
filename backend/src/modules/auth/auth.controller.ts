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
import { deviceIdSchema } from '../../types/history.js';
import { isLinkedToAccount, withOwnDeviceId } from './deviceLink.js';
import { AppError } from '../../errors/AppError.js';
import { cashPaymentOn, type FeatureFlags } from '../flags/flag.service.js';
import { inviteCodeSchema, redeemInvite, releaseInvite } from '../invites/invite.service.js';

function parseInviteCode(code: string): string {
  const parsed = inviteCodeSchema.safeParse(code);
  if (!parsed.success) throw new AppError('INVALID_INVITE');
  return parsed.data;
}

const meQuerySchema = z.object({ deviceId: deviceIdSchema.optional() });
const logoutBodySchema = z.object({ pushEndpoint: z.url().max(1000).optional() });

export interface AuthControllerDeps {
  auth: AuthService;
  tokens: SessionTokens;
  cookieSecure: boolean;
  flags: FeatureFlags;
}

type AccountResponse = Response<{ user: AccountView | null }>;

export function createAuthController({ auth, tokens, cookieSecure, flags }: AuthControllerDeps) {
  const startSession = async (res: AccountResponse, account: UserDocument) => {
    const user = await withOwnDeviceId(account);
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
      // This phone should stop getting this account's order notifications and farm alerts.
      const endpoint = logoutBodySchema.safeParse(req.body ?? {}).data?.pushEndpoint;
      if (endpoint) {
        await PushSubscriptionModel.updateOne({ endpoint, userId: req.user.id }, { $unset: { userId: 1 } }).exec();
        const linked = (await UserModel.findById(req.user.id, { deviceId: 1 }).lean().exec())?.deviceId;
        if (linked) await PushSubscriptionModel.deleteOne({ endpoint, deviceId: linked }).exec();
      }
    }
    clearSessionCookie(res, cookieSecure);
    res.json({ ok: true });
  };

  /**
   * 200 with `user: null` when not logged in, so the app can check without an error. `resetDevice`: the phone still
   * holds an account's data id without that account's session and must take a new one.
   */
  const me: RequestHandler = async (req, res: Response<{ user: AccountView | null; resetDevice?: true }>) => {
    const { deviceId } = parseOrThrow(meQuerySchema, req.query);
    const found = req.user ? await UserModel.findById(currentUser(req).id).exec() : null;
    if (!found) {
      const resetDevice = deviceId !== undefined && (await isLinkedToAccount(deviceId));
      res.json({ user: null, ...(resetDevice && { resetDevice }) });
      return;
    }
    res.json({ user: toAccountView(await withOwnDeviceId(found, deviceId), await cashPaymentOn(flags)) });
  };

  return { register, login, logout, me };
}
