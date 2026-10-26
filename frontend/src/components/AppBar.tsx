import { LuBell, LuLifeBuoy, LuSprout, LuUserRound } from 'react-icons/lu';
import { useFlags } from '../hooks/useFlags';
import { useAuth } from '../hooks/useAuth';
import { useMarketNotifications } from '../hooks/useMarketNotifications';
import { routes } from '../hooks/useHashRoute';
import { useNotifications } from '../hooks/useNotifications';
import { hi } from '../strings/hi';

/** 48 px round buttons: three fit next to the name on a 360 px phone. */
const ROUND_LINK = 'flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-800 hover:bg-primary-900';

/** Slim top bar with the brand and the सूचनाएँ bell. Navigation lives in the bottom bar. */
export function AppBar() {
  const { unreadCount: farmUnread } = useNotifications();
  const { unreadCount: marketUnread } = useMarketNotifications();
  const unreadCount = farmUnread + marketUnread;
  const { user } = useAuth();
  const { helpRequests } = useFlags();
  const bellLabel = unreadCount > 0 ? `${hi.notifications.bell} (${unreadCount} ${hi.notifications.unread})` : hi.notifications.bell;

  return (
    <header className="bg-primary-700 text-white">
      <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-400 text-ink-900">
          <LuSprout aria-hidden="true" className="size-7" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="text-2xl font-bold">{hi.appName}</h1>
          <p className="truncate text-base text-primary-100">{hi.appTagline}</p>
        </div>
        {helpRequests && (
          <a href={routes.help} aria-label={hi.help.button} className={ROUND_LINK}>
            <LuLifeBuoy aria-hidden="true" className="size-7" />
          </a>
        )}
        <a
          href={routes.account}
          aria-label={user ? `${hi.account.open}: ${user.name}` : hi.account.login}
          className={ROUND_LINK}
        >
          <LuUserRound aria-hidden="true" className="size-7" />
        </a>
        <a
          href={routes.notifications}
          aria-label={bellLabel}
          className={`relative ${ROUND_LINK}`}
        >
          <LuBell aria-hidden="true" className="size-7" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-6 items-center justify-center rounded-full bg-accent-400 px-1.5 text-sm font-bold text-ink-900">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </a>
      </div>
    </header>
  );
}
