import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_FLAGS, fetchFlags, type Flags } from '../api/flags';
import { useAuth } from '../hooks/useAuth';
import { readFromCache, saveToCache } from '../utils/offlineCache';
import { FlagsContext } from './flagsContext';

/**
 * Feature flags for this person. Fetched again after login/logout (pilot accounts may see more). The last
 * answer is kept on the phone, so a pilot farmer offline still sees the features they had (not "बंद").
 */
export function FlagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Flags>(() => readFromCache<Flags>('flags.last')?.data ?? DEFAULT_FLAGS);
  const userKey = user === undefined ? 'checking' : (user?.id ?? 'guest');
  const [shownKey, setShownKey] = useState(userKey);

  // Another person (login/logout): show their saved flags at once (adjusting state during render, as React recommends).
  if (userKey !== shownKey) {
    setShownKey(userKey);
    const saved = userKey === 'checking' ? undefined : readFromCache<Flags>(`flags.${userKey}`)?.data;
    if (saved) setFlags({ ...DEFAULT_FLAGS, ...saved });
  }

  useEffect(() => {
    if (userKey === 'checking') return;
    let current = true;
    fetchFlags().then(
      (next) => {
        if (!current) return;
        setFlags(next);
        saveToCache(`flags.${userKey}`, next);
        saveToCache('flags.last', next);
      },
      () => undefined, // offline or marketplace off: keep the saved (or default) flags
    );
    return () => {
      current = false;
    };
  }, [userKey]);

  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}
