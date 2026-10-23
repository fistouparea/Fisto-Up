import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMe, logout as logoutRequest } from '../api/auth';
import type { Account } from '../api/marketTypes';
import { adoptDeviceId, getDeviceId } from '../utils/deviceId';
import { AuthContext, type AuthState } from './authContext';
import { currentPushEndpoint } from '../utils/marketPush';

/** Who is logged in (marketplace). The advisor works the same with or without login. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Account | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((loaded) => !cancelled && setUserState(loaded))
      // Offline or marketplace off: behave as logged out; the advisor keeps working.
      .catch(() => !cancelled && setUserState(null));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const setUser = useCallback((next: Account) => {
    // Logged in on another phone: use the account's device id so its farm profile and history appear here.
    if (next.deviceId && next.deviceId !== getDeviceId()) {
      adoptDeviceId(next.deviceId);
      window.location.reload();
      return;
    }
    setUserState(next);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest(await currentPushEndpoint());
    } finally {
      setUserState(null);
    }
  }, []);

  const refresh = useCallback(() => setAttempt((count) => count + 1), []);

  const value = useMemo<AuthState>(() => ({ user, setUser, logout, refresh }), [user, setUser, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
