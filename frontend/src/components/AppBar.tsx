import { LuSprout } from 'react-icons/lu';
import { hi } from '../strings/hi';

/** Slim top bar with the brand. Navigation lives in the bottom bar. */
export function AppBar() {
  return (
    <header className="bg-primary-700 text-white">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-accent-400 text-ink-900">
          <LuSprout aria-hidden="true" className="size-7" />
        </span>
        <div className="leading-tight">
          <h1 className="text-2xl font-bold">{hi.appName}</h1>
          <p className="text-base text-primary-100">{hi.appTagline}</p>
        </div>
      </div>
    </header>
  );
}
