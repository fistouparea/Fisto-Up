import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
  /** A new key swaps the content. */
  pageKey: string;
  className?: string;
  children: ReactNode;
}

/**
 * Short fade/slide between screens. With "reduce motion" on, screens swap instantly:
 * no animation at all (an exit animation that never finishes must never block navigation).
 */
export function PageTransition({ pageKey, className, children }: PageTransitionProps) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return (
      <div key={pageKey} className={className}>
        {children}
      </div>
    );
  }
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={pageKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className={className}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
