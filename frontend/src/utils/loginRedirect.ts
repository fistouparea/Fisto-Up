import type { Role } from '../api/marketTypes';
import { routes } from '../hooks/useHashRoute';
import { navigateTo } from './navigate';

const RETURN_KEY = 'agriai.returnTo';

/** Opens the login screen and comes back to `returnTo` (default: the current screen) afterwards. */
export function goToLogin(returnTo: string = window.location.hash): void {
  try {
    sessionStorage.setItem(RETURN_KEY, returnTo);
  } catch {
    // Storage blocked: after login the user lands on their role's home screen instead.
  }
  navigateTo(routes.login);
}

/** Where to go after login: the saved screen, else the role's home screen. */
export function afterLoginTarget(role: Role): string {
  const saved = takeSavedReturn();
  const isAuthScreen = saved === routes.login || saved === routes.register;
  return saved && saved.startsWith('#/') && !isAuthScreen ? saved : roleHome(role);
}

/** The screen each role starts on. */
export function roleHome(role: Role): string {
  const homes: Record<Role, string> = { seller: routes.sell, buyer: routes.market, coordinator: routes.admin() };
  return homes[role];
}

function takeSavedReturn(): string | null {
  try {
    const saved = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return saved;
  } catch {
    return null;
  }
}
