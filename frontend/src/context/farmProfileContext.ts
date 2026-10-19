import { createContext } from 'react';
import type { ErrorCode, FarmProfile } from '../api/types';

export interface FarmProfileState {
  /** undefined while loading for the first time; null when the farmer has no profile yet. */
  profile: FarmProfile | null | undefined;
  /** Shown from the offline cache because the server could not be reached. */
  fromCache: boolean;
  errorCode: ErrorCode | null;
  save: (profile: FarmProfile) => Promise<boolean>;
  setProfile: (profile: FarmProfile | null) => void;
}

export const FarmProfileContext = createContext<FarmProfileState | null>(null);
