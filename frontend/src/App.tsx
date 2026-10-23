import { useState } from 'react';
import { LuCamera, LuHistory, LuHouse, LuShoppingBasket, LuSprout } from 'react-icons/lu';
import { AppBar } from './components/AppBar';
import { OfflineBanner } from './components/OfflineBanner';
import { AppToaster } from './components/ui/AppToaster';
import { BottomNav } from './components/ui/BottomNav';
import { PageTransition } from './components/ui/PageTransition';
import { AuthProvider } from './context/AuthProvider';
import { LangProvider } from './context/LangProvider';
import { FarmProfileProvider } from './context/FarmProfileProvider';
import { NotificationsProvider } from './context/NotificationsProvider';
import { useFarmProfile } from './hooks/useFarmProfile';
import { routes, useHashRoute, type Route } from './hooks/useHashRoute';
import { CalendarPage } from './pages/CalendarPage';
import { DiagnosePage } from './pages/DiagnosePage';
import { FarmPage } from './pages/FarmPage';
import { FarmSetupPage } from './pages/FarmSetupPage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { HomePage } from './pages/HomePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { WaterPage } from './pages/WaterPage';
import { WeatherPage } from './pages/WeatherPage';
import { AccountPage } from './pages/market/AccountPage';
import { BuyerProfilePage } from './pages/market/BuyerProfilePage';
import { LoginPage } from './pages/market/LoginPage';
import { RegisterPage } from './pages/market/RegisterPage';
import { SellerProfilePage } from './pages/market/SellerProfilePage';
import { MySalesPage } from './pages/market/MySalesPage';
import { SnapListPage } from './pages/market/SnapListPage';
import { MarketPage } from './pages/market/MarketPage';
import { ListingDetailPage } from './pages/market/ListingDetailPage';
import { cn } from './utils/cn';
import { RequireRole } from './components/market/RequireRole';
import { useAuth } from './hooks/useAuth';
import type { Account } from './api/marketTypes';
import { roleHome } from './utils/loginRedirect';
import { navigateTo } from './utils/navigate';
import { hi } from './strings/hi';
import { readFlag, setFlag } from './utils/offlineCache';

const ONBOARDING_FLAG = 'onboardingDone';

export function App() {
  return (
    <AuthProvider>
      <LangProvider>
        <FarmProfileProvider>
          <NotificationsProvider>
            <AppShell />
          </NotificationsProvider>
        </FarmProfileProvider>
      </LangProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const route = useHashRoute();
  const { profile } = useFarmProfile();
  const { user } = useAuth();
  // Changing the key remounts DiagnosePage, i.e. starts a fresh check.
  const [diagnoseKey, setDiagnoseKey] = useState(0);
  const [onboardingDone, setOnboardingDone] = useState(() => readFlag(ONBOARDING_FLAG));

  // First open: ask about the farm once (every screen can be skipped).
  const showOnboarding = profile === null && !onboardingDone && route.name === 'home';

  const finishOnboarding = () => {
    setFlag(ONBOARDING_FLAG);
    setOnboardingDone(true);
    window.location.hash = routes.home;
  };

  return (
    <div className="min-h-dvh bg-surface-page">
      <AppBar />
      <OfflineBanner />
      <AppToaster />
      {/* Bottom padding keeps content clear of the fixed bottom navigation. */}
      {/* Shopping screens use the width of a tablet/desktop; farmer screens stay phone-narrow. */}
      <main className={cn('mx-auto px-4 pt-4 pb-32', WIDE_ROUTES.has(route.name) ? 'max-w-5xl' : 'max-w-lg')}>
        <PageTransition pageKey={showOnboarding ? 'onboarding' : pageKey(route, diagnoseKey)}>
          {showOnboarding ? <FarmSetupPage onDone={finishOnboarding} /> : <Page route={route} diagnoseKey={diagnoseKey} />}
        </PageTransition>
      </main>
      <BottomNav
        label={hi.nav.label}
        items={[
          { href: routes.home, label: hi.nav.home, icon: LuHouse, active: route.name === 'home' },
          {
            href: routes.diagnose,
            label: hi.nav.newCheck,
            icon: LuCamera,
            active: route.name === 'diagnose',
            onClick: () => setDiagnoseKey((key) => key + 1),
          },
          {
            href: user?.role === 'seller' ? routes.sell : routes.market,
            label: hi.nav.market,
            icon: LuShoppingBasket,
            active: MARKET_ROUTES.has(route.name),
          },
          {
            href: routes.history,
            label: hi.nav.history,
            icon: LuHistory,
            active: route.name === 'history' || route.name === 'historyItem',
          },
          { href: routes.farm, label: hi.farm.title, icon: LuSprout, active: route.name === 'farm' || route.name === 'farmSetup' },
        ]}
      />
    </div>
  );
}

const WIDE_ROUTES: ReadonlySet<Route['name']> = new Set(['market', 'listing']);
const MARKET_ROUTES: ReadonlySet<Route['name']> = new Set(['market', 'listing', 'sell', 'sellNew']);

function Page({ route, diagnoseKey }: { route: Route; diagnoseKey: number }) {
  const { setUser } = useAuth();
  const savedProfile = (user: Account) => {
    setUser(user);
    navigateTo(roleHome(user.role));
  };

  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'diagnose':
      return <DiagnosePage key={diagnoseKey} />;
    case 'history':
      return <HistoryPage />;
    case 'historyItem':
      return <HistoryDetailPage id={route.id} />;
    case 'farm':
      return <FarmPage />;
    case 'farmSetup':
      return <FarmSetupPage onDone={() => (window.location.hash = routes.farm)} />;
    case 'weather':
      return <WeatherPage />;
    case 'water':
      return <WaterPage />;
    case 'calendar':
      return <CalendarPage />;
    case 'notifications':
      return <NotificationsPage />;
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'account':
      return <AccountPage />;
    case 'sellerProfile':
      return <RequireRole roles={['seller']}>{(user) => <SellerProfilePage user={user} onSaved={savedProfile} />}</RequireRole>;
    case 'sell':
      return <RequireRole roles={['seller']}>{(user) => <MySalesPage user={user} />}</RequireRole>;
    case 'sellNew':
      return <RequireRole roles={['seller']}>{() => <SnapListPage />}</RequireRole>;
    case 'market':
      return <MarketPage />;
    case 'listing':
      return <ListingDetailPage id={route.id} />;
    case 'buyerProfile':
      return <RequireRole roles={['buyer']}>{(user) => <BuyerProfilePage user={user} onSaved={savedProfile} />}</RequireRole>;
  }
}

/** A new key per page (and per fresh check / history item) remounts it with a short transition. */
function pageKey(route: Route, diagnoseKey: number): string {
  if (route.name === 'diagnose') return `diagnose-${diagnoseKey}`;
  if (route.name === 'historyItem') return `history-${route.id}`;
  if (route.name === 'listing') return `listing-${route.id}`;
  return route.name;
}
