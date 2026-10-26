import { createContext } from 'react';
import type { Flags } from '../api/flags';

export const FlagsContext = createContext<Flags | null>(null);
