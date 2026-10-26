import { LazyMotion, MotionConfig } from 'framer-motion';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initErrorReporting } from './observability/errorReporting';
import './index.css';

initErrorReporting();

const loadMotionFeatures = () => import('./motionFeatures').then((module) => module.default);

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      {/* LazyMotion + `m` components keep framer-motion small; its features load after first paint.
          reducedMotion="user" honours the phone's "reduce motion" setting. */}
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </LazyMotion>
    </ErrorBoundary>
  </StrictMode>,
);
