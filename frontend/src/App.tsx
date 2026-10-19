import { Header } from './components/Header';
import { DiagnosePage } from './pages/DiagnosePage';

export function App() {
  return (
    <div className="min-h-dvh bg-green-50/40">
      <Header />
      <main className="mx-auto max-w-lg px-4 py-5 pb-10">
        <DiagnosePage />
      </main>
    </div>
  );
}
