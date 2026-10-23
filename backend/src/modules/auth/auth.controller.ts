import type { RequestHandler, Response } from 'express';
import { parseOrThrow } from '../../utils/validation.js';
import { toAccountView } from './accountView.js';
import { clearSessionCookie, currentUser, setSessionCookie } from './auth.middleware.js';
import type { AuthService } from './auth.service.js';
import { loginBodySchema, registerBodySchema, type AccountView } from './auth.types.js';
import type { SessionTokens } from './sessionToken.js';
import type { UserDocument } from './user.model.js';
import { UserModel } from './user.model.js';

export interface AuthControllerDeps {
  auth: AuthService;
  tokens: SessionTokens;
  cookieSecure: boolean;
}

type AccountResponse = Response<{ user: AccountView | null }>;

export function createAuthController({ auth, tokens, cookieSecure }: AuthControllerDeps) {
  const startSession = async (res: AccountResponse, user: UserDocument) => {
    setSessionCookie(res, await tokens.sign({ userId: user._id.toString(), version: user.tokenVersion }), cookieSecure);
    res.json({ user: toAccountView(user) });
  };

  const register: RequestHandler = async (req, res: AccountResponse) => {
    const body = parseOrThrow(registerBodySchema, req.body);
    res.status(201);
    await startSession(res, await auth.createAccount(body));
  };

  const login: RequestHandler = async (req, res: AccountResponse) => {
    await startSession(res, await auth.login(parseOrThrow(loginBodySchema, req.body)));
  };

  const logout: RequestHandler = async (req, res: Response<{ ok: true }>) => {
    if (req.user) await auth.logout(req.user.id);
    clearSessionCookie(res, cookieSecure);
    res.json({ ok: true });
  };

  /** 200 with `user: null` when not logged in, so the app can check without an error. */
  const me: RequestHandler = async (req, res: AccountResponse) => {
    const user = req.user ? await UserModel.findById(currentUser(req).id).exec() : null;
    res.json({ user: user ? toAccountView(user) : null });
  };

  return { register, login, logout, me };
}
