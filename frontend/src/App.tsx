import { useState } from 'react';
import { Header } from './components/Header';
import { useHashRoute } from './hooks/useHashRoute';
import { DiagnosePage } from './pages/DiagnosePage';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { HistoryPage } from './pages/HistoryPage';

export function App() {
  const route = useHashRoute();
  // Changing the key remounts DiagnosePage, i.e. starts a fresh check.
  const [diagnoseKey, setDiagnoseKey] = useState(0);

  return (
    <div className="min-h-dvh bg-green-50/40">
      <Header route={route} onNewCheck={() => setDiagnoseKey((key) => key + 1)} />
      <main className="mx-auto max-w-lg px-4 py-5 pb-10">
        {route.name === 'diagnose' && <DiagnosePage key={diagnoseKey} />}
        {route.name === 'history' && <HistoryPage />}
        {route.name === 'historyItem' && <HistoryDetailPage key={route.id} id={route.id} />}
      </main>
    </div>
  );
}
