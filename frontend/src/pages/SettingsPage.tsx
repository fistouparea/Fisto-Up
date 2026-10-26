import { LuLanguages, LuMessageCircle, LuSettings, LuVolume2 } from 'react-icons/lu';
import { LanguagePicker } from '../components/LanguagePicker';
import { useLang } from '../hooks/useLang';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Toggle } from '../components/ui/Toggle';
import { useFlags } from '../hooks/useFlags';
import { useSettings } from '../hooks/useSettings';
import { useSpeechOutput } from '../hooks/useSpeech';
import { hi } from '../strings/hi';
import { updateSettings } from '../utils/settings';

/** "सेटिंग": language, Rajasthani AI answers, read aloud. Saved on this phone only. */
export function SettingsPage() {
  const { voiceMode, languages } = useFlags();
  const { readAloud, rajasthaniAnswers } = useSettings();
  const { appLang } = useLang();
  const { supported } = useSpeechOutput();

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.settings.title} icon={LuSettings} />
      {languages && (
        <Card icon={LuLanguages} title={hi.settings.language} speakText={`${hi.settings.language}. ${hi.settings.languageHint}`}>
          <p className="mb-3 text-base text-ink-700">{hi.settings.languageHint}</p>
          <LanguagePicker />
          {appLang === 'raj' && <p className="mt-3 text-base text-ink-500">{hi.settings.rajDraftNote}</p>}
        </Card>
      )}
      {languages && (
        <Card icon={LuMessageCircle} title={hi.settings.rajasthaniAnswers} speakText={`${hi.settings.rajasthaniAnswers}. ${hi.settings.rajasthaniAnswersHint}`}>
          <p className="mb-3 text-base text-ink-700">{hi.settings.rajasthaniAnswersHint}</p>
          <Toggle on={rajasthaniAnswers} onChange={(next) => updateSettings({ rajasthaniAnswers: next })} label={hi.settings.rajasthaniAnswers} />
        </Card>
      )}
      {voiceMode && supported && (
        <Card icon={LuVolume2} title={hi.settings.readAloud} speakText={`${hi.settings.readAloud}. ${hi.settings.readAloudHint}`}>
          <p className="mb-3 text-base text-ink-700">{hi.settings.readAloudHint}</p>
          <Toggle on={readAloud} onChange={(next) => updateSettings({ readAloud: next })} label={hi.settings.readAloud} />
        </Card>
      )}
    </section>
  );
}
