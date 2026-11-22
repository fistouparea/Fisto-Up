import { randomUUID } from 'node:crypto';
import type { Types } from 'mongoose';
import { UserModel, type UserDocument } from './user.model.js';

/*
 * The advisor's data (farm, checks, alerts) is keyed by a data id. Rules:
 *   - an id belongs to at most one account, and only that account's session may use it (deviceGuard.ts);
 *   - an id no account owns is a guest's phone and joins the first farmer account that signs in on it;
 *   - ids that several accounts shared (before this rule) are retired: kept in `sharedDeviceId`, shown to nobody,
 *     never deleted by one of those accounts, because we cannot know whose data it is.
 */

/** Is `deviceId` linked to an account (other than `exceptUserId`), now or before it was retired? */
export async function isLinkedToAccount(deviceId: string, exceptUserId?: Types.ObjectId | string): Promise<boolean> {
  const found = await UserModel.exists({
    $or: [{ deviceId }, { sharedDeviceId: deviceId }],
    ...(exceptUserId && { _id: { $ne: exceptUserId } }),
  }).exec();
  return found !== null;
}

/**
 * The account, with a data id that is only its own. `phoneId` is the id of the phone it is signing in on: a guest's
 * id joins a farmer account that has none. Coordinators never take it, they sign in on farmers' phones.
 */
export async function withOwnDeviceId(user: UserDocument, phoneId?: string): Promise<UserDocument> {
  const current = user.deviceId;
  if (current && !(await isLinkedToAccount(current, user._id))) return user;
  // Nothing to link yet: the first sign-in that names its phone decides.
  if (!current && !phoneId) return user;

  const claim = !current && phoneId && user.role !== 'coordinator' && !(await isLinkedToAccount(phoneId, user._id));
  const next = claim ? phoneId : randomUUID();
  // Only if nobody changed it meanwhile (two requests at once): then both answer with the same id.
  await UserModel.updateOne(
    { _id: user._id, deviceId: current ?? null },
    { $set: { deviceId: next, ...(current && { sharedDeviceId: current }) } },
  ).exec();
  return (await UserModel.findById(user._id).exec()) ?? user;
}
