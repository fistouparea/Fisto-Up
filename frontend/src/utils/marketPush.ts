import { linkMarketPush } from '../api/orders';
import { saveSubscription } from '../api/push';
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

/** After logout: this phone's farm alerts follow its new data id, no longer the account's. */
export async function movePushToThisPerson(): Promise<void> {
  try {
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) await saveSubscription(subscription.toJSON());
  } catch {
    // Offline: the next login links it.
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
