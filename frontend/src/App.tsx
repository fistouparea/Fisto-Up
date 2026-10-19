import { AnimatePresence, m } from 'framer-motion';
import { useState } from 'react';
import { LuCamera, LuHistory, LuSprout } from 'react-icons/lu';
import { AppBar } from './components/AppBar';
import { AppToaster } from './components/ui/AppToaster';
import { BottomNav } from './components/ui/BottomNav';
import { FarmProfileProvider } from './context/FarmProfileProvider';
import { useFarmProfile } from './hooks/useFarmProfile';
import { routes, useHashRoute, type Route } from './hooks/useHashRoute';
import { DiagnosePage } from './pages/DiagnosePage';
import { FarmPage } from './pages/FarmPage';
import { FarmSetupPage } from './pages/FarmSetupPage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { hi } from './strings/hi';
import { readFlag, setFlag } from './utils/offlineCache';

const ONBOARDING_FLAG = 'onboardingDone';

export function App() {
  return (
    <FarmProfileProvider>
      <AppShell />
    </FarmProfileProvider>
  );
}

function AppShell() {
  const route = useHashRoute();
  const { profile } = useFarmProfile();
  // Changing the key remounts DiagnosePage, i.e. starts a fresh check.
  const [diagnoseKey, setDiagnoseKey] = useState(0);
  const [onboardingDone, setOnboardingDone] = useState(() => readFlag(ONBOARDING_FLAG));

  // First open: ask about the farm once (every screen can be skipped).
  const showOnboarding = profile === null && !onboardingDone && route.name === 'diagnose';

  const finishOnboarding = () => {
    setFlag(ONBOARDING_FLAG);
    setOnboardingDone(true);
    window.location.hash = routes.diagnose;
  };

  return (
    <div className="min-h-dvh bg-surface-page">
      <AppBar />
      <AppToaster />
      {/* Bottom padding keeps content clear of the fixed bottom navigation. */}
      <main className="mx-auto max-w-lg px-4 pt-4 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={showOnboarding ? 'onboarding' : pageKey(route, diagnoseKey)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {showOnboarding ? <FarmSetupPage onDone={finishOnboarding} /> : <Page route={route} diagnoseKey={diagnoseKey} />}
          </m.div>
        </AnimatePresence>
      </main>
      <BottomNav
        label={hi.nav.label}
        items={[
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
  switch (route.name) {
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
  }
}

/** A new key per page (and per fresh check / history item) remounts it with a short transition. */
function pageKey(route: Route, diagnoseKey: number): string {
  if (route.name === 'diagnose') return `diagnose-${diagnoseKey}`;
  if (route.name === 'historyItem') return `history-${route.id}`;
  return route.name;
}
