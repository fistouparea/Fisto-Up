import { LuLightbulb, LuTriangleAlert } from 'react-icons/lu';
import type { PriceSuggestion } from '../../api/marketTypes';
import { hi, unitLabels } from '../../strings/hi';
import { shortDate } from '../../utils/dayLabel';
import { formatRupees } from '../../utils/money';
import { checkPrice, suggestedPricePaise } from '../../utils/priceCheck';
import { Button } from '../ui/Button';
import { SpeakButton } from '../ui/SpeakButton';

interface PriceSuggestionBoxProps {
  suggestion: PriceSuggestion | null;
  /** The price the seller typed, to warn about a likely slip. */
  pricePaise: number | null;
  onUse: (pricePaise: number) => void;
}

/** Mandi range + suggested fair range, clearly labelled as a suggestion. Hidden when there is no data. */
export function PriceSuggestionBox({ suggestion, pricePaise, onUse }: PriceSuggestionBoxProps) {
  if (!suggestion || suggestion.source === null) return null;

  const unit = unitLabels[suggestion.unit].hi;
  const fair = `${formatRupees(suggestion.fairMinPaise)} – ${formatRupees(suggestion.fairMaxPaise)} ${hi.sell.per} ${unit}`;
  const mandi =
    suggestion.source === 'mandi'
      ? `${hi.pricing.mandiPrice}: ${formatRupees(suggestion.mandiMinPaisePerQuintal)} – ${formatRupees(suggestion.mandiMaxPaisePerQuintal)} ${hi.pricing.perQuintal} (${shortDate(suggestion.date)})`
      : null;
  const check = checkPrice(pricePaise, suggestion.fairMinPaise, suggestion.fairMaxPaise);
  const speech = [mandi, `${hi.pricing.fairRange}: ${fair}`, hi.pricing.onlySuggestion].filter(Boolean).join('। ');

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-2xl border-2 border-accent-200 bg-surface-cream p-3">
      <div className="flex items-start gap-2">
        <LuLightbulb aria-hidden="true" className="mt-1 size-6 shrink-0 text-accent-700" />
        <div className="min-w-0 flex-1 text-base">
          {mandi && <p className="font-bold">{mandi}</p>}
          <p>
            {hi.pricing.fairRange}: <strong>{fair}</strong>
          </p>
          <p className="text-ink-500">
            {hi.pricing.sources[suggestion.source]}. {hi.pricing.onlySuggestion}
          </p>
        </div>
        <SpeakButton text={speech} />
      </div>
      {check !== 'ok' && (
        <p className="flex items-center gap-2 font-bold text-warning-800" role="alert">
          <LuTriangleAlert aria-hidden="true" className="size-5 shrink-0" />
          {hi.pricing[check]}
        </p>
      )}
      <Button variant="secondary" size="md" onClick={() => onUse(suggestedPricePaise(suggestion.fairMinPaise, suggestion.fairMaxPaise))}>
        {hi.pricing.useSuggested}
      </Button>
    </div>
  );
}
