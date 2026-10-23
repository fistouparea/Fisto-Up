import { getDeviceId } from '../utils/deviceId';
import { getJson, isRecord, sendJson } from './client';
import type { Account, BuyerProfileInput, BuyerType, SellerProfileInput } from './marketTypes';

interface AccountResponse {
  user: Account | null;
}

export async function fetchMe(): Promise<Account | null> {
  return (await getJson('/api/auth/me', isAccountResponse)).user;
}

/** The phone's advisor device id goes along, so its farm profile and history join the account. */
export async function login(phone: string, pin: string): Promise<Account> {
  return requireUser(await sendJson('POST', '/api/auth/login', { phone, pin, deviceId: getDeviceId() }, isAccountResponse));
}

export interface RegisterInput {
  phone: string;
  pin: string;
  name: string;
  role: 'seller' | 'buyer';
  buyerType?: BuyerType;
}

export async function register(input: RegisterInput): Promise<Account> {
  return requireUser(await sendJson('POST', '/api/auth/register', { ...input, deviceId: getDeviceId() }, isAccountResponse));
}

/** `pushEndpoint`: this phone stops getting the account's order notifications. */
export async function logout(pushEndpoint?: string): Promise<void> {
  await sendJson('POST', '/api/auth/logout', pushEndpoint ? { pushEndpoint } : {}, isRecord);
}

export async function saveSellerProfile(profile: SellerProfileInput): Promise<Account> {
  return requireUser(await sendJson('PUT', '/api/account/seller-profile', profile, isAccountResponse));
}

export async function saveBuyerProfile(profile: BuyerProfileInput): Promise<Account> {
  return requireUser(await sendJson('PUT', '/api/account/buyer-profile', profile, isAccountResponse));
}

function requireUser(body: AccountResponse): Account {
  if (!body.user) throw new Error('Expected a user in the response');
  return body.user;
}

export function isAccountResponse(body: unknown): body is AccountResponse {
  return isRecord(body) && (body.user === null || (isRecord(body.user) && typeof body.user.id === 'string'));
}
