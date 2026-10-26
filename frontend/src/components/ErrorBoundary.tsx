import { Component, type ErrorInfo, type ReactNode } from 'react';
import { LuRefreshCw, LuHouse, LuTriangleAlert } from 'react-icons/lu';
import { reportError } from '../observability/errorReporting';
import { hi } from '../strings/hi';
import { routes } from '../hooks/useHashRoute';
import { SpeakButton } from './ui/SpeakButton';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches a crash while drawing a screen and shows a calm Hindi message with two big buttons instead of a
 * blank page. The error goes to error tracking (if on). Plain elements only: the fallback must not depend on
 * the parts of the app that may have failed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    reportError(error, info.componentStack);
  }

  override render() {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}

export function ErrorScreen() {
  const goHome = () => {
    window.location.hash = routes.home;
    window.location.reload();
  };
  return (
    <div role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-10 text-center">
      <span className="flex size-28 items-center justify-center rounded-full bg-warning-100">
        <LuTriangleAlert aria-hidden="true" className="size-14 text-warning-700" />
      </span>
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-ink-900">{hi.errorScreen.title}</h1>
        <SpeakButton text={`${hi.errorScreen.title} ${hi.errorScreen.body}`} />
      </div>
      <p className="text-lg text-ink-700">{hi.errorScreen.body}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary-700 px-6 text-xl font-bold text-white"
      >
        <LuRefreshCw aria-hidden="true" className="size-7" />
        {hi.errorScreen.reload}
      </button>
      <button
        type="button"
        onClick={goHome}
        className="flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-primary-700 px-6 text-xl font-bold text-primary-700"
      >
        <LuHouse aria-hidden="true" className="size-7" />
        {hi.errorScreen.home}
      </button>
    </div>
  );
}
