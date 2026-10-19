import type { IconType } from 'react-icons';
import { cn } from '../../utils/cn';

export interface BottomNavItem {
  href: string;
  label: string;
  icon: IconType;
  active: boolean;
  onClick?: () => void;
}

/** Fixed bottom tab bar: big icon + label, active tab in a highlighted pill. */
export function BottomNav({ items, label }: { items: BottomNavItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-raised"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ href, label: itemLabel, icon: Icon, active, onClick }) => (
          <li key={href} className="flex-1">
            <a
              href={href}
              onClick={onClick}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-20 flex-col items-center justify-center gap-1 py-2"
            >
              <span
                className={cn(
                  'flex h-9 w-16 items-center justify-center rounded-full transition-colors',
                  active ? 'bg-accent-400 text-ink-900' : 'text-ink-500',
                )}
              >
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <span className={cn('text-base', active ? 'font-bold text-ink-900' : 'text-ink-500')}>{itemLabel}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
