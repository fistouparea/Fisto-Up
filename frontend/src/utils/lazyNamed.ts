import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/** React.lazy for a named export: `lazyNamed(() => import('./pages/X'), 'X')`. */
export function lazyNamed<Props extends object, Name extends string>(
  load: () => Promise<Record<Name, ComponentType<Props>>>,
  name: Name,
): LazyExoticComponent<ComponentType<Props>> {
  return lazy(async () => ({ default: (await load())[name] }));
}

/** Downloads screens the farmer will probably open next, once the phone is idle (never during first paint). */
export function prefetchCommonScreens(loaders: (() => Promise<unknown>)[]): void {
  const run = () => loaders.forEach((load) => void load().catch(() => undefined));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 5_000 });
  else setTimeout(run, 2_000);
}
