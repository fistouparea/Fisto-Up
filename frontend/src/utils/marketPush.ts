import { linkMarketPush } from '../api/orders';
import { getDeviceId } from './deviceId';
import { isPushSupported } from './push';

/** Links this phone's existing push subscription (if push is allowed) to the logged-in account. */
export async function linkExistingPushSubscription(): Promise<void> {
  try {
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await linkMarketPush(getDeviceId(), subscription.toJSON());
  } catch {
    // Push is a bonus; in-app notifications still work.
  }
}

/** The phone's push endpoint, sent with logout so this phone stops getting the account's order notifications. */
export async function currentPushEndpoint(): Promise<string | undefined> {
  try {
    if (!isPushSupported()) return undefined;
    const registration = await navigator.serviceWorker.getRegistration();
    return (await registration?.pushManager.getSubscription())?.endpoint;
  } catch {
    return undefined;
  }
}
