import { createContext } from 'react';
import type { Account } from '../api/marketTypes';

export interface AuthState {
  /** undefined while checking; null when not logged in. */
  user: Account | null | undefined;
  /**
   * Call after login/registration/profile save with the account from the server, and `nextHash` = the screen
   * to show next. (On another phone the app may reload to adopt the account's device id; it then opens that screen.)
   */
  setUser: (user: Account, nextHash?: string) => void;
  logout: () => Promise<void>;
  refresh: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);
