import { useContext } from 'react';
import { FarmProfileContext, type FarmProfileState } from '../context/farmProfileContext';

export function useFarmProfile(): FarmProfileState {
  const state = useContext(FarmProfileContext);
  if (!state) throw new Error('useFarmProfile must be used inside <FarmProfileProvider>');
  return state;
}
