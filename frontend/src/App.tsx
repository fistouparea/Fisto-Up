import { AnimatePresence, m } from 'framer-motion';
import { useState } from 'react';
import { LuCamera, LuHistory } from 'react-icons/lu';
import { AppBar } from './components/AppBar';
import { BottomNav } from './components/ui/BottomNav';
import { AppToaster } from './components/ui/AppToaster';
import { routes, useHashRoute, type Route } from './hooks/useHashRoute';
import { DiagnosePage } from './pages/DiagnosePage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { hi } from './strings/hi';

export function App() {
  const route = useHashRoute();
  // Changing the key remounts DiagnosePage, i.e. starts a fresh check.
  const [diagnoseKey, setDiagnoseKey] = useState(0);
  const onHistory = route.name !== 'diagnose';

  return (
    <div className="min-h-dvh bg-surface-page">
      <AppBar />
      <AppToaster />
      {/* Bottom padding keeps content clear of the fixed bottom navigation. */}
      <main className="mx-auto max-w-lg px-4 pt-4 pb-32">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={pageKey(route, diagnoseKey)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {route.name === 'diagnose' && <DiagnosePage />}
            {route.name === 'history' && <HistoryPage />}
            {route.name === 'historyItem' && <HistoryDetailPage id={route.id} />}
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
            active: !onHistory,
            onClick: () => setDiagnoseKey((key) => key + 1),
          },
          { href: routes.history, label: hi.nav.history, icon: LuHistory, active: onHistory },
        ]}
      />
    </div>
  );
}

/** A new key per page (and per fresh check / history item) remounts it with a short transition. */
function pageKey(route: Route, diagnoseKey: number): string {
  if (route.name === 'diagnose') return `diagnose-${diagnoseKey}`;
  if (route.name === 'historyItem') return `history-${route.id}`;
  return 'history';
}
