import { useEffect, useState } from 'react';
import { fetchPushKey, saveSubscription } from '../api/push';
import { notifyError, notifySuccess, notifyWarning } from '../components/ui/notify';
import { hi } from '../strings/hi';
import { readFlag, setFlag } from '../utils/offlineCache';
import { isPushSupported, subscribeToPush } from '../utils/push';

export const USED_ONCE_FLAG = 'usedOnce';
const DISMISSED_FLAG = 'pushAsked';

/**
 * Decides whether to show the "सूचना फोन पर पाएँ?" card: only after the farmer has used the app once,
 * only if the phone and server support push, and only until they answer.
 */
export function usePushPermission() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [answered, setAnswered] = useState(() => readFlag(DISMISSED_FLAG));
  const eligible = isPushSupported() && readFlag(USED_ONCE_FLAG) && !answered && Notification.permission === 'default';

  useEffect(() => {
    if (!eligible) return;
    let cancelled = false;
    fetchPushKey()
      .then((key) => !cancelled && setPublicKey(key))
      .catch(() => undefined); // no key = no card
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  const finish = () => {
    setFlag(DISMISSED_FLAG);
    setAnswered(true);
  };

  const allow = async () => {
    if (!publicKey) return;
    finish();
    try {
      const subscription = await subscribeToPush(publicKey);
      if (!subscription) {
        notifyWarning(hi.push.denied);
        return;
      }
      await saveSubscription(subscription);
      notifySuccess(hi.push.enabled);
    } catch {
      notifyError('UNKNOWN');
    }
  };

  return { show: eligible && publicKey !== null, allow: () => void allow(), later: finish };
}
