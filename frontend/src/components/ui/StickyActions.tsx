import { m } from 'framer-motion';
import type { ReactNode } from 'react';

/** Keeps the main action(s) in thumb reach, floating just above the bottom navigation. */
export function StickyActions({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="sticky bottom-24 z-10 -mx-4 flex gap-3 bg-linear-to-t from-surface-page from-75% to-transparent px-4 pt-6 pb-2"
    >
      {children}
    </m.div>
  );
}
