import { createContext } from 'react';
import type { Account } from '../api/marketTypes';

export interface AuthState {
  /** undefined while checking; null when not logged in. */
  user: Account | null | undefined;
  /** Call after login/registration/profile save with the account from the server. */
  setUser: (user: Account) => void;
  logout: () => Promise<void>;
  refresh: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);
