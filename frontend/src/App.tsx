import { Suspense, useEffect, useState } from 'react';
import { lazyNamed, prefetchCommonScreens } from './utils/lazyNamed';
import { Skeleton } from './components/ui/Skeleton';
import { LuCamera, LuHistory, LuHouse, LuShoppingBasket, LuSprout } from 'react-icons/lu';
import { AppBar } from './components/AppBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { AppToaster } from './components/ui/AppToaster';
import { BottomNav } from './components/ui/BottomNav';
import { PageTransition } from './components/ui/PageTransition';
import { AuthProvider } from './context/AuthProvider';
import { LangProvider } from './context/LangProvider';
import { MarketNotificationsProvider } from './context/MarketNotificationsProvider';
import { NewOrderAlert } from './components/market/NewOrderAlert';
import { FarmProfileProvider } from './context/FarmProfileProvider';
import { NotificationsProvider } from './context/NotificationsProvider';
import { useFarmProfile } from './hooks/useFarmProfile';
import { routes, useHashRoute, type Route } from './hooks/useHashRoute';
import { FarmSetupPage } from './pages/FarmSetupPage';
import { HomePage } from './pages/HomePage';
import { ConsentPage } from './pages/ConsentPage';
import { FlagsProvider } from './context/FlagsProvider';
import { sendConsent } from './api/privacy';
import { reportAppOpen } from './utils/appOpen';
import { hasConsented, isConsentPending, markConsentSent, rememberConsent } from './utils/consentState';
import { cn } from './utils/cn';
import { RequireRole } from './components/market/RequireRole';
import { useAuth } from './hooks/useAuth';
import { useLang } from './hooks/useLang';
import type { Account } from './api/marketTypes';
import { roleHome } from './utils/loginRedirect';
import { hi } from './strings/hi';
import { readFlag, setFlag } from './utils/offlineCache';

// Screens load when first opened: the first visit downloads only the home screen (slow 2G/3G phones).
const OrderForm = lazyNamed(() => import('./components/market/OrderForm'), 'OrderForm');
const OrdersPage = lazyNamed(() => import('./pages/market/OrdersPage'), 'OrdersPage');
const OrderPage = lazyNamed(() => import('./pages/market/OrderPage'), 'OrderPage');
const AdminPage = lazyNamed(() => import('./pages/admin/AdminPage'), 'AdminPage');
const CalendarPage = lazyNamed(() => import('./pages/CalendarPage'), 'CalendarPage');
const DiagnosePage = lazyNamed(() => import('./pages/DiagnosePage'), 'DiagnosePage');
const FarmPage = lazyNamed(() => import('./pages/FarmPage'), 'FarmPage');
const HistoryDetailPage = lazyNamed(() => import('./pages/HistoryDetailPage'), 'HistoryDetailPage');
const HistoryPage = lazyNamed(() => import('./pages/HistoryPage'), 'HistoryPage');
const NotificationsPage = lazyNamed(() => import('./pages/NotificationsPage'), 'NotificationsPage');
const WaterPage = lazyNamed(() => import('./pages/WaterPage'), 'WaterPage');
const WeatherPage = lazyNamed(() => import('./pages/WeatherPage'), 'WeatherPage');
const LegalPage = lazyNamed(() => import('./pages/LegalPage'), 'LegalPage');
const MyDataPage = lazyNamed(() => import('./pages/MyDataPage'), 'MyDataPage');
const HelpPage = lazyNamed(() => import('./pages/HelpPage'), 'HelpPage');
const AccountPage = lazyNamed(() => import('./pages/market/AccountPage'), 'AccountPage');
const BuyerProfilePage = lazyNamed(() => import('./pages/market/BuyerProfilePage'), 'BuyerProfilePage');
const LoginPage = lazyNamed(() => import('./pages/market/LoginPage'), 'LoginPage');
const RegisterPage = lazyNamed(() => import('./pages/market/RegisterPage'), 'RegisterPage');
const SellerProfilePage = lazyNamed(() => import('./pages/market/SellerProfilePage'), 'SellerProfilePage');
const MySalesPage = lazyNamed(() => import('./pages/market/MySalesPage'), 'MySalesPage');
const SnapListPage = lazyNamed(() => import('./pages/market/SnapListPage'), 'SnapListPage');
const MarketPage = lazyNamed(() => import('./pages/market/MarketPage'), 'MarketPage');
const ListingDetailPage = lazyNamed(() => import('./pages/market/ListingDetailPage'), 'ListingDetailPage');

const ONBOARDING_FLAG = 'onboardingDone';

export function App() {
  return (
    <AuthProvider>
      <FlagsProvider>
        <LangProvider>
          <FarmProfileProvider>
            <NotificationsProvider>
              <MarketNotificationsProvider>
                <AppShell />
              </MarketNotificationsProvider>
            </NotificationsProvider>
          </FarmProfileProvider>
        </LangProvider>
      </FlagsProvider>
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

  const { lang } = useLang();
  const [consented, setConsented] = useState(hasConsented);
  // Consent comes first; the policy pages stay readable from the consent screen.
  const showConsent = !consented && !LEGAL_ROUTES.has(route.name);
  // First open: ask about the farm once (every screen can be skipped).
  const showOnboarding = consented && profile === null && !onboardingDone && route.name === 'home';

  // A consent given offline is sent to the server once the phone is online again.
  useEffect(() => {
    if (consented && isConsentPending()) sendConsent(lang).then(() => markConsentSent(), () => undefined);
    // Anonymous "active today" for the pilot dashboard, only after consent.
    if (consented) reportAppOpen();
    // After the first screen: fetch the photo check and history in the background (instant when tapped).
    if (consented) prefetchCommonScreens([() => import('./pages/DiagnosePage'), () => import('./pages/HistoryPage')]);
  }, [consented, lang]);

  const agree = () => {
    rememberConsent();
    setConsented(true);
  };

  const screenKey = showConsent ? 'consent' : showOnboarding ? 'onboarding' : pageKey(route, diagnoseKey);

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
      <NewOrderAlert />
      {/* Bottom padding keeps content clear of the fixed bottom navigation. */}
      {/* Shopping screens use the width of a tablet/desktop; farmer screens stay phone-narrow. */}
      <main className={cn('mx-auto px-4 pt-4 pb-32', WIDE_ROUTES.has(route.name) ? 'max-w-5xl' : 'max-w-lg')}>
        <PageTransition pageKey={screenKey}>
          {/* A crash inside one screen keeps the app bar and bottom navigation usable; changing screen resets it. */}
          <ErrorBoundary key={screenKey}>
            {showConsent ? (
              <ConsentPage onAgree={agree} />
            ) : showOnboarding ? (
              <FarmSetupPage onDone={finishOnboarding} />
            ) : (
              <Suspense fallback={<Skeleton className="h-64" />}>
                <Page route={route} diagnoseKey={diagnoseKey} />
              </Suspense>
            )}
          </ErrorBoundary>
        </PageTransition>
      </main>
      {!showConsent && (
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
              href: user?.role === 'seller' ? routes.sell : user?.role === 'coordinator' ? routes.admin() : routes.market,
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
      )}
    </div>
  );
}

const LEGAL_ROUTES: ReadonlySet<Route['name']> = new Set(['privacy', 'terms']);
const WIDE_ROUTES: ReadonlySet<Route['name']> = new Set(['market', 'listing', 'admin']);
const MARKET_ROUTES: ReadonlySet<Route['name']> = new Set(['market', 'listing', 'sell', 'sellNew', 'orders', 'order', 'admin']);

function Page({ route, diagnoseKey }: { route: Route; diagnoseKey: number }) {
  const { setUser } = useAuth();
  const savedProfile = (user: Account) => setUser(user, roleHome(user.role));

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
      return <ListingDetailPage id={route.id} actions={(listing) => <OrderForm listing={listing} />} />;
    case 'orders':
      return <RequireRole roles={['buyer', 'seller']}>{(user) => <OrdersPage user={user} />}</RequireRole>;
    case 'order':
      return <RequireRole>{() => <OrderPage id={route.id} />}</RequireRole>;
    case 'admin':
      return <RequireRole roles={['coordinator']}>{() => <AdminPage tab={route.tab} />}</RequireRole>;
    case 'privacy':
      return <LegalPage doc="privacy" />;
    case 'terms':
      return <LegalPage doc="terms" />;
    case 'myData':
      return <MyDataPage />;
    case 'help':
      return <HelpPage />;
    case 'buyerProfile':
      return <RequireRole roles={['buyer']}>{(user) => <BuyerProfilePage user={user} onSaved={savedProfile} />}</RequireRole>;
  }
}

/** A new key per page (and per fresh check / history item) remounts it with a short transition. */
function pageKey(route: Route, diagnoseKey: number): string {
  if (route.name === 'diagnose') return `diagnose-${diagnoseKey}`;
  if (route.name === 'historyItem') return `history-${route.id}`;
  if (route.name === 'listing') return `listing-${route.id}`;
  if (route.name === 'order') return `order-${route.id}`;
  if (route.name === 'admin') return `admin-${route.tab}`;
  return route.name;
}
