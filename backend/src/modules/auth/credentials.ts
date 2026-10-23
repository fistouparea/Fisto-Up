import bcrypt from 'bcryptjs';
import { AUTH_RULES } from '../../config/marketRules.js';

/**
 * A way to prove "this is my account". Today the app uses a 4-digit PIN. Phone OTP can be added later as
 * another implementation (send a code, then `verify` checks it) without changing the auth service or routes.
 */
export interface CredentialMethod {
  /** Turns a new secret into what is stored on the account. */
  hash(secret: string): Promise<string>;
  /** True if `secret` matches the stored value. Pass null for an unknown phone: still takes the same time. */
  verify(stored: string | null, secret: string): Promise<boolean>;
  /** True if the secret is too easy to guess. */
  isWeak(secret: string): boolean;
}

/** Compared against when the phone is unknown, so a wrong phone and a wrong PIN take equally long. */
const DUMMY_HASH = bcrypt.hashSync('0000', AUTH_RULES.bcryptCost);

export class PinCredentials implements CredentialMethod {
  constructor(private readonly cost: number = AUTH_RULES.bcryptCost) {}

  hash(pin: string): Promise<string> {
    return bcrypt.hash(pin, this.cost);
  }

  async verify(stored: string | null, pin: string): Promise<boolean> {
    const matches = await bcrypt.compare(pin, stored ?? DUMMY_HASH);
    return stored !== null && matches;
  }

  isWeak(pin: string): boolean {
    const allSame = /^(\d)\1+$/.test(pin);
    return allSame || (AUTH_RULES.weakPins as readonly string[]).includes(pin);
  }
}
