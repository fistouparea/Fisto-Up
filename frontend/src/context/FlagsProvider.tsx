import { useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_FLAGS, fetchFlags, type Flags } from '../api/flags';
import { useAuth } from '../hooks/useAuth';
import { FlagsContext } from './flagsContext';

/** Feature flags for this person. Fetched again after login/logout (pilot accounts may see more). */
export function FlagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Flags>(DEFAULT_FLAGS);
  const userKey = user === undefined ? 'checking' : (user?.id ?? 'guest');

  useEffect(() => {
    if (userKey === 'checking') return;
    let current = true;
    fetchFlags().then(
      (next) => current && setFlags(next),
      () => undefined, // offline or marketplace off: keep the defaults
    );
    return () => {
      current = false;
    };
  }, [userKey]);

  return <FlagsContext.Provider value={flags}>{children}</FlagsContext.Provider>;
}
