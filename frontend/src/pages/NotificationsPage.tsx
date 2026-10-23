import { LuBell, LuCheckCheck, LuInbox } from 'react-icons/lu';
import { FollowUpCard } from '../components/notifications/FollowUpCard';
import { NotificationRow } from '../components/notifications/NotificationRow';
import { PushPermissionCard } from '../components/notifications/PushPermissionCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { useNotifications } from '../hooks/useNotifications';
import { hi } from '../strings/hi';
import { useMarketNotifications } from '../hooks/useMarketNotifications';
import { MarketNotificationList } from '../components/market/MarketNotificationList';

export function NotificationsPage() {
  const { items, unreadCount, isUnread, markRead, markAllRead, reload, loading } = useNotifications();
  const market = useMarketNotifications();
  const followUps = items.filter((item) => item.type === 'followup');
  const others = items.filter((item) => item.type !== 'followup');

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.notifications.title} icon={LuBell} />
      <PushPermissionCard />

      <MarketNotificationList items={market.items} onOpen={(id) => market.markRead([id])} />

      {loading && items.length === 0 && <Skeleton className="h-40" />}
      {!loading && items.length === 0 && market.items.length === 0 && <EmptyState icon={LuInbox} message={hi.notifications.empty} />}

      {followUps.map((item) => (
        <FollowUpCard key={item.id} notification={item} onAnswered={reload} />
      ))}

      {others.length > 0 && (
        <ul className="flex flex-col gap-3">
          {others.map((item) => (
            <NotificationRow key={item.id} item={item} unread={isUnread(item.id)} onOpen={() => markRead(item.id)} />
          ))}
        </ul>
      )}

      {unreadCount + market.unreadCount > 0 && (
        <Button
          variant="secondary"
          icon={LuCheckCheck}
          onClick={() => {
            markAllRead();
            market.markRead();
          }}
        >
          {hi.notifications.markAllRead}
        </Button>
      )}
    </section>
  );
}
