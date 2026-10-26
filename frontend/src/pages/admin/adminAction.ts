import { ApiError } from '../../api/client';
import { notifyError, notifySuccess } from '../../components/ui/notify';

/** Runs a coordinator action: success toast + refresh, or the Hindi error toast. */
export async function runAdminAction(action: () => Promise<unknown>, message: string, after: () => void): Promise<void> {
  try {
    await action();
    notifySuccess(message);
    after();
  } catch (error) {
    notifyError(error instanceof ApiError ? error.code : 'UNKNOWN');
  }
}
