import { isValidObjectId, mongo } from 'mongoose';
import { AUTH_RULES } from '../../config/marketRules.js';
import { AppError } from '../../errors/AppError.js';
import type { BuyerType, LoginBody, Role } from './auth.types.js';
import type { CredentialMethod } from './credentials.js';
import type { SessionClaims } from './sessionToken.js';
import { UserModel, type UserDocument } from './user.model.js';

export interface NewAccount {
  phone: string;
  pin: string;
  name: string;
  role: Role;
  buyerType?: BuyerType;
  deviceId?: string;
  /** Coordinator creating the account for someone else. */
  createdBy?: string;
  /** Coordinator-created sellers are verified right away (the coordinator met them). */
  verifiedBy?: string;
}

/** Accounts, PIN login with lockout, and session lookup. */
export class AuthService {
  constructor(
    private readonly credentials: CredentialMethod,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createAccount(account: NewAccount): Promise<UserDocument> {
    if (this.credentials.isWeak(account.pin)) throw new AppError('WEAK_PIN');
    if (await UserModel.exists({ phone: account.phone })) throw new AppError('PHONE_TAKEN');

    try {
      return await UserModel.create({
        phone: account.phone,
        pinHash: await this.credentials.hash(account.pin),
        role: account.role,
        name: account.name,
        deviceId: account.deviceId,
        createdBy: account.createdBy,
        ...(account.role === 'seller' && {
          seller: account.verifiedBy
            ? { status: 'verified', verifiedAt: this.now(), verifiedBy: account.verifiedBy }
            : { status: 'pending' },
        }),
        ...(account.role === 'buyer' && { buyer: { buyerType: account.buyerType ?? 'household' } }),
      });
    } catch (error) {
      // Two sign-ups with the same phone at the same moment: the unique index catches the second.
      if (error instanceof mongo.MongoServerError && error.code === 11000) throw new AppError('PHONE_TAKEN');
      throw error;
    }
  }

  /**
   * Checks phone + PIN. Wrong phone and wrong PIN give the same INVALID_LOGIN.
   * After AUTH_RULES.maxFailedLogins wrong PINs in a row the account is locked for AUTH_RULES.lockMinutes.
   */
  async login({ phone, pin, deviceId }: LoginBody): Promise<UserDocument> {
    const user = await UserModel.findOne({ phone }).exec();
    if (user?.lockedUntil && user.lockedUntil > this.now()) throw new AppError('LOGIN_LOCKED');

    const valid = await this.credentials.verify(user?.pinHash ?? null, pin);
    if (!user || !valid) {
      if (user) await this.recordFailure(user._id.toString());
      throw new AppError('INVALID_LOGIN');
    }

    user.failedLogins = 0;
    user.lockedUntil = undefined;
    // First login on a phone that used the advisor: its farm profile and history now belong to the account.
    if (!user.deviceId && deviceId) user.deviceId = deviceId;
    await user.save();
    return user;
  }

  /** Ends every session of this account. */
  async logout(userId: string): Promise<void> {
    await UserModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }).exec();
  }

  /** The account behind a session token, or null if it is gone or the session was ended. */
  async findSessionUser({ userId, version }: SessionClaims): Promise<UserDocument | null> {
    if (!isValidObjectId(userId)) return null;
    const user = await UserModel.findById(userId).exec();
    return user && user.tokenVersion === version ? user : null;
  }

  private async recordFailure(userId: string): Promise<void> {
    const updated = await UserModel.findByIdAndUpdate(userId, { $inc: { failedLogins: 1 } }, { returnDocument: 'after' }).exec();
    if (updated && updated.failedLogins >= AUTH_RULES.maxFailedLogins) {
      const lockedUntil = new Date(this.now().getTime() + AUTH_RULES.lockMinutes * 60_000);
      await UserModel.updateOne({ _id: userId }, { $set: { lockedUntil, failedLogins: 0 } }).exec();
    }
  }
}
