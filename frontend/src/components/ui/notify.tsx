import toast from 'react-hot-toast';
import { LuCircleCheckBig, LuOctagonAlert, LuTriangleAlert } from 'react-icons/lu';
import type { ErrorCode } from '../../api/types';
import { errorMessages } from '../../strings/hi';
import { TOAST_BASE_CLASS } from './toastStyle';

export function notifySuccess(message: string) {
  toast.success(message, {
    icon: <LuCircleCheckBig aria-hidden="true" className="size-7 shrink-0 text-success-700" />,
    className: `${TOAST_BASE_CLASS} border-2 border-success-600/40 bg-success-50 text-success-800`,
  });
}

export function notifyWarning(message: string) {
  toast(message, {
    icon: <LuTriangleAlert aria-hidden="true" className="size-7 shrink-0 text-warning-700" />,
    className: `${TOAST_BASE_CLASS} border-2 border-warning-400 bg-warning-50 text-warning-800`,
  });
}

export function notifyError(code: ErrorCode) {
  toast.error(errorMessages[code], {
    id: code, // the same error is shown once, not stacked
    icon: <LuOctagonAlert aria-hidden="true" className="size-7 shrink-0 text-danger-700" />,
    className: `${TOAST_BASE_CLASS} border-2 border-danger-400/60 bg-danger-50 text-danger-800`,
  });
}
