import { useEffect, useRef } from 'react';
import { LuShieldCheck } from 'react-icons/lu';
import { ADMIN_TABS, routes, type AdminTab } from '../../hooks/useHashRoute';
import { hi } from '../../strings/hi';
import { useFlags } from '../../hooks/useFlags';
import { cn } from '../../utils/cn';
import { AdminAssistedListing } from './AdminAssistedListing';
import { AdminLedger } from './AdminLedger';
import { AdminOrders } from './AdminOrders';
import { AdminOverview } from './AdminOverview';
import { AdminReports } from './AdminReports';
import { AdminSellers } from './AdminSellers';
import { AdminAudit } from './AdminAudit';
import { AdminPilot } from './AdminPilot';
import { AdminFlags } from './AdminFlags';
import { AdminHelp } from './AdminHelp';
import { AdminInvites } from './AdminInvites';

/** Coordinator panel: wide on desktop, tabs scroll sideways on a phone. */
export function AdminPage({ tab }: { tab: AdminTab }) {
  const activeTab = useRef<HTMLAnchorElement>(null);
  const { pilotDashboard } = useFlags();
  // On a phone the tab row scrolls; keep the open tab visible.
  useEffect(() => {
    activeTab.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <LuShieldCheck aria-hidden="true" className="size-8 text-primary-700" />
        <h2 className="text-2xl font-bold">{hi.admin.title}</h2>
      </div>
      <nav aria-label={hi.admin.title} className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2 pb-1">
          {ADMIN_TABS.filter((item) => item !== 'pilot' || pilotDashboard).map((item) => (
            <li key={item}>
              <a
                href={routes.admin(item)}
                ref={item === tab ? activeTab : undefined}
                aria-current={item === tab ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-12 items-center whitespace-nowrap rounded-full border-2 px-4 text-base font-bold',
                  item === tab ? 'border-primary-700 bg-primary-700 text-white' : 'border-line bg-surface text-ink-700 hover:border-primary-300',
                )}
              >
                {hi.admin.tabs[item]}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <TabContent tab={tab} />
    </section>
  );
}

function TabContent({ tab }: { tab: AdminTab }) {
  switch (tab) {
    case 'overview':
      return <AdminOverview />;
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
  }
}
