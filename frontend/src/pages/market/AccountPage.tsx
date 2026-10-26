import { LuClipboardList, LuShieldCheck, LuLogIn, LuLogOut, LuPencil, LuPhone, LuUserPlus, LuUserRound } from 'react-icons/lu';
import { MyDataLink } from '../../components/MyDataLink';
import { SellerStatusCallout } from '../../components/market/SellerStatusCallout';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { notifySuccess } from '../../components/ui/notify';
import { useAuth } from '../../hooks/useAuth';
import { routes } from '../../hooks/useHashRoute';
import { hi, roleLabels, sellerStatusLabels } from '../../strings/hi';
import { navigateTo } from '../../utils/navigate';

export function AccountPage() {
  const { user, logout } = useAuth();

  if (user === undefined) return <Skeleton className="h-64" />;
  if (user === null) {
    return (
      <section className="flex flex-col gap-4">
        <PageHeader title={hi.account.title} icon={LuUserRound} />
        <EmptyState icon={LuUserRound} message={hi.auth.loginHint}>
          <Button variant="accent" icon={LuLogIn} onClick={() => navigateTo(routes.login)}>
            {hi.auth.login}
          </Button>
          <Button variant="secondary" icon={LuUserPlus} onClick={() => navigateTo(routes.register)}>
            {hi.auth.noAccount}
          </Button>
        </EmptyState>
        <p className="text-center text-base text-ink-500">{hi.auth.advisorFree}</p>
        <MyDataLink />
      </section>
    );
  }

  const onLogout = async () => {
    await logout();
    notifySuccess(hi.account.loggedOut);
    navigateTo(routes.home);
  };
  const editRoute = user.role === 'seller' ? routes.sellerProfile : user.role === 'buyer' ? routes.buyerProfile : null;
  const seller = user.seller;

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.account.title} icon={LuUserRound} />
      {seller && <SellerStatusCallout seller={seller} />}

      <Card icon={LuUserRound} title={user.name} speakText={`${user.name}, ${roleLabels[user.role]}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" label={roleLabels[user.role]} />
          {seller && (
            <Badge
              tone={seller.status === 'verified' ? 'success' : seller.status === 'rejected' ? 'danger' : 'warning'}
              label={sellerStatusLabels[seller.status]}
            />
          )}
        </div>
        <p className="mt-3 flex items-center gap-2">
          <LuPhone aria-hidden="true" className="size-5 text-ink-500" />
          {hi.account.phone}: {user.phone}
        </p>
        {seller?.village && <p>{hi.sellerProfile.village}: {seller.village}</p>}
        {seller?.upiId && <p>{hi.sellerProfile.upiId}: {seller.upiId}</p>}
        {user.buyer?.businessName && <p>{user.buyer.businessName}</p>}
        <p className="mt-2 text-base text-ink-500">{hi.account.phonePrivate}</p>
      </Card>

      {user.role === 'coordinator' && (
        <Button variant="accent" icon={LuShieldCheck} onClick={() => navigateTo(routes.admin())}>
          {hi.admin.title}
        </Button>
      )}
      {user.role !== 'coordinator' && (
        <Button variant="secondary" icon={LuClipboardList} onClick={() => navigateTo(routes.orders)}>
          {hi.orders.open}
        </Button>
      )}
      {editRoute && (
        <Button variant="secondary" icon={LuPencil} onClick={() => navigateTo(editRoute)}>
          {hi.account.editProfile}
        </Button>
      )}
      <Button variant="ghost" icon={LuLogOut} onClick={() => void onLogout()}>
        {hi.account.logout}
      </Button>
      {user.role !== 'coordinator' && <MyDataLink />}
    </section>
  );
}
