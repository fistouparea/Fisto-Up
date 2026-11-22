import { LuSprout } from 'react-icons/lu';
import type { Attention } from '../../api/adminConsole';
import { useFlags } from '../../hooks/useFlags';
import { routes, type AdminTab } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { hiAdmin } from '../../strings/hiAdmin';
import { cn } from '../../utils/cn';
import { MENU_GROUPS, visibleMenu } from './adminMenu';
import { tabTitle } from './tabTitle';

/** The grouped menu: sidebar on a computer, drawer on a phone. */
export function AdminNav({ tab, attention, onNavigate }: { tab: AdminTab; attention?: Attention; onNavigate?: () => void }) {
  const flags = useFlags();
  const items = visibleMenu(flags);

  return (
    <div className="flex h-full flex-col bg-primary-900 text-white">
      <a href={routes.admin()} onClick={onNavigate} className="flex items-center gap-3 px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-400 text-ink-900">
          <LuSprout aria-hidden="true" className="size-6" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-xl font-bold">{hi.appName}</span>
          <span className="text-sm text-primary-100">{hiAdmin.title}</span>
        </span>
      </a>
      <nav aria-label={hiAdmin.title} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {MENU_GROUPS.map((group) => {
          const inGroup = items.filter((item) => item.group === group);
          if (inGroup.length === 0) return null;
          return (
            <div key={group} className="mt-2">
              {group !== 'home' && <p className="px-3 pb-1 pt-2 text-sm font-bold text-primary-200">{hiAdmin.console.groups[group]}</p>}
              <ul>
                {inGroup.map(({ tab: target, icon: Icon, waiting }) => {
                  const count = attention && waiting ? waiting(attention) : 0;
                  return (
                    <li key={target}>
                      <a
                        href={routes.admin(target)}
                        onClick={onNavigate}
                        aria-current={target === tab ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-base',
                          target === tab ? 'bg-surface font-bold text-primary-900' : 'text-white hover:bg-primary-800',
                        )}
                      >
                        <Icon aria-hidden="true" className="size-5 shrink-0" />
                        <span className="min-w-0 flex-1">{tabTitle(target, flags)}</span>
                        {count > 0 && <span className="min-w-6 rounded-full bg-accent-400 px-2 text-center text-sm font-bold text-ink-900">{count}</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
