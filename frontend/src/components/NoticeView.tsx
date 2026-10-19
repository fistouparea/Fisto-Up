import type { ReactNode } from 'react';

interface NoticeViewProps {
  icon: string;
  message: string;
  children?: ReactNode;
}

/** A large, friendly message with action buttons below it. Used for errors and unclear photos. */
export function NoticeView({ icon, message, children }: NoticeViewProps) {
  return (
    <div role="alert" className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
        <p className="text-5xl" aria-hidden="true">
          {icon}
        </p>
        <p className="mt-3 text-2xl font-bold leading-relaxed text-gray-900">{message}</p>
      </div>
      {children}
    </div>
  );
}
