import { useContext } from 'react';
import type { Flags } from '../api/flags';
import { FlagsContext } from '../context/flagsContext';

export function useFlags(): Flags {
  const flags = useContext(FlagsContext);
  if (!flags) throw new Error('useFlags must be used inside <FlagsProvider>');
  return flags;
}
