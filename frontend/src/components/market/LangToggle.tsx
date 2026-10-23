import { LuLanguages } from 'react-icons/lu';
import { useLang } from '../../hooks/useLang';

/** Switches the buyer marketplace between Hindi and English. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  const next = lang === 'hi' ? 'en' : 'hi';
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      lang={next}
      className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 border-primary-700 bg-surface px-4 text-base font-bold text-primary-700 hover:bg-primary-50"
    >
      <LuLanguages aria-hidden="true" className="size-5" />
      {next === 'en' ? 'English' : 'हिंदी'}
    </button>
  );
}
