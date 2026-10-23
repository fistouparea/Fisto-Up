import { LuChevronRight, LuFlag, LuShoppingBasket } from 'react-icons/lu';
import type { MarketNotification } from '../../api/marketTypes';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/formatDate';

/** Order and report notifications (marketplace), above the farm notifications. */
export function MarketNotificationList({ items, onOpen }: { items: MarketNotification[]; onOpen: (id: string) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3" aria-label={hi.nav.market}>
      {items.map((item) => {
        const Icon = item.kind === 'report' ? LuFlag : LuShoppingBasket;
        return (
          <li key={item.id}>
            <a
              href={item.href}
              onClick={() => onOpen(item.id)}
              className={cn(
                'flex min-h-20 items-center gap-3 rounded-3xl border bg-surface p-3 shadow-card',
                item.read ? 'border-line' : 'border-primary-300',
              )}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-800">
                <Icon aria-hidden="true" className="size-7" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2">
                  <span className="text-lg font-bold leading-snug text-ink-900">{item.title}</span>
                  {!item.read && <span className="rounded-full bg-danger-700 px-2 text-xs font-bold text-white">{hi.notifications.unread}</span>}
                </span>
                <span className="text-base leading-snug text-ink-700">{item.body}</span>
                <span className="text-sm text-ink-500">{formatDate(item.createdAt)}</span>
              </span>
              <LuChevronRight aria-hidden="true" className="size-6 shrink-0 text-ink-500" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
