import { useState } from 'react';
import { LuCamera, LuHistory, LuHouse, LuSprout } from 'react-icons/lu';
import { AppBar } from './components/AppBar';
import { OfflineBanner } from './components/OfflineBanner';
import { AppToaster } from './components/ui/AppToaster';
import { BottomNav } from './components/ui/BottomNav';
import { PageTransition } from './components/ui/PageTransition';
import { AuthProvider } from './context/AuthProvider';
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
      <FarmProfileProvider>
        <NotificationsProvider>
          <AppShell />
        </NotificationsProvider>
      </FarmProfileProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const route = useHashRoute();
  const { profile } = useFarmProfile();
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
      <main className="mx-auto max-w-lg px-4 pt-4 pb-32">
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
    case 'buyerProfile':
      return <RequireRole roles={['buyer']}>{(user) => <BuyerProfilePage user={user} onSaved={savedProfile} />}</RequireRole>;
  }
}

/** A new key per page (and per fresh check / history item) remounts it with a short transition. */
function pageKey(route: Route, diagnoseKey: number): string {
  if (route.name === 'diagnose') return `diagnose-${diagnoseKey}`;
  if (route.name === 'historyItem') return `history-${route.id}`;
  return route.name;
}
