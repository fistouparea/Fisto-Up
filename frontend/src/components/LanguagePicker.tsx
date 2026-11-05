import { LuCheck, LuVolume2 } from 'react-icons/lu';
import { APP_LANGS, type AppLang } from '../i18n/lang';
import { useLang } from '../hooks/useLang';
import { useSpeechOutput } from '../hooks/useSpeech';
import { hi } from '../strings/hi';
import { cn } from '../utils/cn';
import { IconButton } from './ui/IconButton';

/** Each language by its own name and letter (no flags); the speaker says the name for those who cannot read. */
const LANGUAGES: Record<AppLang, { name: string; letter: string; spoken: string }> = {
  hi: { name: 'हिंदी', letter: 'अ', spoken: 'हिंदी' },
  en: { name: 'English', letter: 'A', spoken: 'इंग्लिश, English' },
  raj: { name: 'राजस्थानी', letter: 'रा', spoken: 'राजस्थानी, मारवाड़ी' },
};

export function LanguagePicker() {
  const { appLang, setLang } = useLang();
  const { supported, speak } = useSpeechOutput();

  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={hi.settings.language}>
      {APP_LANGS.map((lang) => {
        const { name, letter, spoken } = LANGUAGES[lang];
        const selected = appLang === lang;
        return (
          <div key={lang} className="flex items-center gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              lang={lang === 'en' ? 'en' : 'hi'}
              onClick={() => setLang(lang)}
              className={cn(
                'flex min-h-16 flex-1 items-center gap-3 rounded-2xl border-2 px-3 text-left text-xl font-bold',
                selected ? 'border-primary-700 bg-primary-50 ring-4 ring-primary-200' : 'border-line bg-surface hover:border-primary-300',
              )}
            >
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-200 text-xl text-accent-800">
                {letter}
              </span>
              <span className="flex-1">{name}</span>
              {selected && <LuCheck aria-hidden="true" className="size-7 text-primary-700" />}
            </button>
            {supported && <IconButton icon={LuVolume2} label={`${hi.settings.listenName}: ${name}`} onClick={() => speak(spoken)} />}
          </div>
        );
      })}
    </div>
  );
}
