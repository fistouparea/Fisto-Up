import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchMe, logout as logoutRequest } from '../api/auth';
import type { Account } from '../api/marketTypes';
import { routes } from '../hooks/useHashRoute';
import { createUuid, getDeviceId, isDeviceIdChange } from '../utils/deviceId';
import { currentPushEndpoint, movePushToThisPerson } from '../utils/marketPush';
import { dropOtherPeoplesCache } from '../utils/offlineCache';
import { isLogoutPending, setLogoutPending, switchPerson } from '../utils/phoneData';
import { AuthContext, type AuthState } from './authContext';

/**
 * Who is using the phone. When that changes (login, logout, expired login) the phone switches its data id and the
 * app starts over, so no screen, saved copy or late answer of the previous person is left.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<Account | null | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [person, setPerson] = useState(0);
  /** Counts logins and logouts: a slow "who am I" answer from before one must not undo it. */
  const changes = useRef(0);

  const startOver = useCallback((deviceId: string, next: Account | null, hash?: string) => {
    const saved = switchPerson(deviceId);
    if (hash) window.location.hash = hash;
    if (saved) {
      window.location.reload();
      return;
    }
    // Storage blocked: a reload would lose the new id, so only the screens start over.
    setUserState(next);
    setPerson((count) => count + 1);
  }, []);

  useEffect(() => {
    dropOtherPeoplesCache();
    // Another tab logged in or out.
    const onStorage = (event: StorageEvent) => {
      if (isDeviceIdChange(event)) window.location.reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const startedAt = changes.current;
    const outdated = () => cancelled || changes.current !== startedAt;

    const load = async () => {
      if (isLogoutPending()) {
        await logoutRequest();
        setLogoutPending(false);
      }
      const { user: loaded, resetDevice } = await fetchMe();
      if (outdated()) return;
      if (loaded?.deviceId && loaded.deviceId !== getDeviceId()) startOver(loaded.deviceId, loaded);
      else if (!loaded && resetDevice) startOver(createUuid(), null);
      else setUserState(loaded);
    };
    // Offline or marketplace off: behave as logged out; the advisor keeps working. A failed re-check (refresh)
    // keeps who is already shown.
    load().catch(() => !outdated() && setUserState((current) => current ?? null));
    return () => {
      cancelled = true;
    };
  }, [attempt, startOver]);

  const setUser = useCallback(
    (next: Account, nextHash?: string) => {
      changes.current += 1;
      setLogoutPending(false);
      if (next.deviceId && next.deviceId !== getDeviceId()) {
        startOver(next.deviceId, next, nextHash);
        return;
      }
      setUserState(next);
      if (nextHash) window.location.hash = nextHash;
    },
    [startOver],
  );

  const logout = useCallback(async () => {
    changes.current += 1;
    try {
      await logoutRequest(await currentPushEndpoint());
    } catch {
      setLogoutPending(true);
    }
    // A new id first: the next person must never act under this account's id.
    const id = createUuid();
    switchPerson(id);
    await movePushToThisPerson();
    startOver(id, null, routes.home);
  }, [startOver]);

  const refresh = useCallback(() => setAttempt((count) => count + 1), []);

  const value = useMemo<AuthState>(() => ({ user, setUser, logout, refresh }), [user, setUser, logout, refresh]);
  return (
    <AuthContext.Provider value={value}>
      <Fragment key={person}>{children}</Fragment>
    </AuthContext.Provider>
  );
}
