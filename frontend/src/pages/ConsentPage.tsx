import { LuCamera, LuChartColumn, LuFileText, LuHistory, LuShieldCheck, LuShoppingBasket, LuSprout } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { Button } from '../components/ui/Button';
import { Callout } from '../components/ui/Callout';
import { SpeakButton } from '../components/ui/SpeakButton';
import { routes } from '../hooks/useHashRoute';
import { hi } from '../strings/hi';

const ITEM_ICONS: IconType[] = [LuCamera, LuSprout, LuHistory, LuShoppingBasket, LuChartColumn];

/** Spoken by the big speaker button: the whole screen, so farmers who cannot read hear everything. */
const SPOKEN = [hi.consent.title, hi.consent.intro, ...hi.consent.items.map((item) => `${item.title}: ${item.why}`), hi.consent.rights].join(' ');

/** First run: what we keep and why, in simple Hindi, before anything is saved. */
export function ConsentPage({ onAgree }: { onAgree: () => void }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="consent-title">
      <div className="flex items-center gap-3">
        <LuShieldCheck aria-hidden="true" className="size-9 shrink-0 text-primary-700" />
        <h2 id="consent-title" className="min-w-0 flex-1 text-2xl font-bold leading-tight text-ink-900">
          {hi.consent.title}
        </h2>
      </div>
      <p className="text-lg text-ink-700">{hi.consent.intro}</p>
      <SpeakButton text={SPOKEN} variant="pill" />

      <ul className="flex flex-col gap-3">
        {hi.consent.items.map((item, index) => {
          const Icon = ITEM_ICONS[index] ?? LuShieldCheck;
          return (
            <li key={item.title} className="flex gap-3 rounded-3xl border-2 border-line bg-surface p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                <Icon aria-hidden="true" className="size-7" />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-bold text-ink-900">{item.title}</p>
                <p className="text-base leading-snug text-ink-700">{item.why}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <Callout tone="neutral" icon={LuShieldCheck} text={hi.consent.rights} />

      <Button variant="accent" size="hero" icon={LuShieldCheck} onClick={onAgree}>
        {hi.consent.agree}
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" size="md" icon={LuFileText} onClick={() => (window.location.hash = routes.privacy)}>
          {hi.consent.readPolicy}
        </Button>
        <Button variant="ghost" size="md" icon={LuFileText} onClick={() => (window.location.hash = routes.terms)}>
          {hi.consent.readTerms}
        </Button>
      </div>
    </section>
  );
}
