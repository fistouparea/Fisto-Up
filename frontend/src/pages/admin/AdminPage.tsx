import { useEffect, useRef, useState } from 'react';
import { LuBell, LuMenu, LuUserRound, LuX } from 'react-icons/lu';
import { fetchAttention } from '../../api/adminConsole';
import type { Account } from '../../api/marketTypes';
import { AdminNav } from '../../components/admin/AdminNav';
import { tabTitle } from '../../components/admin/tabTitle';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { SpeechButtonsContext } from '../../components/ui/speechButtons';
import { useFlags } from '../../hooks/useFlags';
import { routes, type AdminTab } from '../../hooks/useHashRoute';
import { useLoad } from '../../hooks/useLoad';
import { useMarketNotifications } from '../../hooks/useMarketNotifications';
import { hi } from '../../strings/hi';
import { hiAdmin } from '../../strings/hiAdmin';
import { AdminAssistedListing } from './AdminAssistedListing';
import { AdminAudit } from './AdminAudit';
import { AdminComplaints } from './AdminComplaints';
import { AdminFlags } from './AdminFlags';
import { AdminHelp } from './AdminHelp';
import { AdminInvites } from './AdminInvites';
import { AdminLedger } from './AdminLedger';
import { AdminMandiTrips } from './AdminMandiTrips';
import { AdminOrders } from './AdminOrders';
import { AdminOverview } from './AdminOverview';
import { AdminPilot } from './AdminPilot';
import { AdminReports } from './AdminReports';
import { AdminSchemes } from './AdminSchemes';
import { AdminSellers } from './AdminSellers';
import { AdminServices } from './AdminServices';
import { AdminUsers } from './AdminUsers';

const REFRESH_MS = 60_000;
const ROUND_LINK = 'relative flex size-12 shrink-0 items-center justify-center rounded-full text-ink-700 hover:bg-primary-50';

/** Coordinator control centre: its own full-screen layout, without the farmer app's bars. */
export function AdminPage({ tab, user }: { tab: AdminTab; user: Account }) {
  const flags = useFlags();
  const { unreadCount } = useMarketNotifications();
  const [tick, setTick] = useState(0);
  const attention = useLoad(fetchAttention, [tab, tick]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const title = tabTitle(tab, flags);

  useEffect(() => {
    const timer = window.setInterval(() => document.visibilityState === 'visible' && setTick((count) => count + 1), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  useEffect(() => {
    if (!menuOpen) return;
    closeButton.current?.focus();
    const opener = menuButton.current;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [menuOpen]);

  return (
    <SpeechButtonsContext.Provider value={false}>
      <div className="min-h-dvh bg-surface-page [--sticky-bottom:0px] lg:pl-64">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
          <AdminNav tab={tab} attention={attention.data} />
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={hiAdmin.console.menu}>
            <button type="button" tabIndex={-1} aria-hidden="true" className="absolute inset-0 w-full bg-ink-900/50" onClick={() => setMenuOpen(false)} />
            <div className="relative h-full w-72 max-w-[85vw]">
              <AdminNav tab={tab} attention={attention.data} onNavigate={() => setMenuOpen(false)} />
              <button
                ref={closeButton}
                type="button"
                aria-label={hiAdmin.console.closeMenu}
                onClick={() => setMenuOpen(false)}
                className="absolute right-2 top-3 flex size-12 items-center justify-center rounded-full text-white hover:bg-primary-800"
              >
                <LuX aria-hidden="true" className="size-6" />
              </button>
            </div>
          </div>
        )}

        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-1 border-b border-line bg-surface px-2 sm:px-6">
          <button ref={menuButton} type="button" aria-label={hiAdmin.console.menu} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className={`${ROUND_LINK} lg:hidden`}>
            <LuMenu aria-hidden="true" className="size-6" />
          </button>
          <h1 className="min-w-0 flex-1 truncate px-1 text-xl font-bold text-ink-900 sm:text-2xl">{title}</h1>
          <a href={routes.notifications} aria-label={hi.notifications.bell} className={ROUND_LINK}>
            <LuBell aria-hidden="true" className="size-6" />
            {unreadCount > 0 && <span className="absolute right-1 top-1 min-w-5 rounded-full bg-accent-400 px-1 text-center text-xs font-bold text-ink-900">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </a>
          <a href={routes.account} aria-label={`${hi.account.open}: ${user.name}`} className="flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full px-2 hover:bg-primary-50">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-700 text-white">
              <LuUserRound aria-hidden="true" className="size-5" />
            </span>
            <span className="hidden max-w-48 truncate text-base font-bold text-ink-900 md:block">{user.name}</span>
          </a>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
          <ErrorBoundary key={tab}>
            {tab === 'overview' ? <AdminOverview attention={attention} /> : <TabContent tab={tab} />}
          </ErrorBoundary>
        </main>
      </div>
    </SpeechButtonsContext.Provider>
  );
}

function TabContent({ tab }: { tab: Exclude<AdminTab, 'overview'> }) {
  switch (tab) {
    case 'users':
      return <AdminUsers />;
    case 'sellers':
      return <AdminSellers />;
    case 'orders':
      return <AdminOrders />;
    case 'reports':
      return <AdminReports />;
    case 'ledger':
      return <AdminLedger />;
    case 'newListing':
      return <AdminAssistedListing />;
    case 'pilot':
      return <AdminPilot />;
    case 'help':
      return <AdminHelp />;
    case 'invites':
      return <AdminInvites />;
    case 'flags':
      return <AdminFlags />;
    case 'audit':
      return <AdminAudit />;
    case 'schemes':
      return <AdminSchemes />;
    case 'services':
      return <AdminServices />;
    case 'trips':
      return <AdminMandiTrips />;
    case 'complaints':
      return <AdminComplaints />;
  }
}
