import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryStorage } from '../test/memoryStorage';
import { afterLoginTarget, goToLogin, roleHome } from './loginRedirect';

beforeEach(() => {
  vi.stubGlobal('sessionStorage', memoryStorage());
  vi.stubGlobal('window', { location: { hash: '#/market/listing/abc' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('login redirect', () => {
  it('comes back to the screen that asked for login, once', () => {
    goToLogin();
    expect(window.location.hash).toBe('#/login');
    expect(afterLoginTarget('buyer')).toBe('#/market/listing/abc');
    expect(afterLoginTarget('buyer')).toBe(roleHome('buyer'));
  });

  it('never returns to the login or register screen itself', () => {
    goToLogin('#/register');
    expect(afterLoginTarget('seller')).toBe(roleHome('seller'));
  });

  it('ignores anything that is not an app route', () => {
    goToLogin('https://evil.example');
    expect(afterLoginTarget('coordinator')).toBe(roleHome('coordinator'));
  });
});
