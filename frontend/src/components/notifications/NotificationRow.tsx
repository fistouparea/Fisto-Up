import type { IconType } from 'react-icons';
import { LuChevronRight, LuListChecks } from 'react-icons/lu';
import type { AlertType, AppNotification } from '../../api/types';
import { ALERT_ICONS } from '../../data/alertIcons';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';

const SEVERITY_STYLES: Record<AppNotification['severity'], string> = {
  danger: 'bg-danger-700 text-white',
  warning: 'bg-warning-400 text-ink-900',
  info: 'bg-primary-50 text-primary-700',
};

interface NotificationRowProps {
  item: AppNotification;
  unread: boolean;
  onOpen: () => void;
}

export function NotificationRow({ item, unread, onOpen }: NotificationRowProps) {
  const alertType = item.id.split(':')[1] as AlertType;
  const Icon: IconType = (item.type === 'alert' && ALERT_ICONS[alertType]) || LuListChecks;
  return (
    <li>
      <a
        href={item.href}
        onClick={onOpen}
        className={cn(
          'flex min-h-20 items-center gap-3 rounded-3xl border bg-surface p-3 shadow-card',
          unread ? 'border-primary-300' : 'border-line',
        )}
      >
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-2xl', SEVERITY_STYLES[item.severity])}>
          <Icon aria-hidden="true" className="size-7" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <span className="text-lg font-bold leading-snug text-ink-900">{item.title}</span>
            {unread && <span className="rounded-full bg-danger-700 px-2 text-xs font-bold text-white">{hi.notifications.unread}</span>}
          </span>
          <span className="text-base leading-snug text-ink-700">{item.body}</span>
        </span>
        <LuChevronRight aria-hidden="true" className="size-6 shrink-0 text-ink-500" />
      </a>
    </li>
  );
}

