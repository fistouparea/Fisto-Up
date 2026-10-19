import { Toaster } from 'react-hot-toast';
import { TOAST_BASE_CLASS } from './toastStyle';

/** App-wide toast container; show toasts with the helpers in notify.tsx. */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      containerStyle={{ top: 12 }}
      toastOptions={{ duration: 4000, className: `${TOAST_BASE_CLASS} bg-surface text-ink-900` }}
    />
  );
}
