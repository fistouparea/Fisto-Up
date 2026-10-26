import { LuSettings, LuVolume2 } from 'react-icons/lu';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { Toggle } from '../components/ui/Toggle';
import { useFlags } from '../hooks/useFlags';
import { useSettings } from '../hooks/useSettings';
import { useSpeechOutput } from '../hooks/useSpeech';
import { hi } from '../strings/hi';
import { updateSettings } from '../utils/settings';

/** "सेटिंग": read aloud (and, from Task 3, language). Saved on this phone only. */
export function SettingsPage() {
  const { voiceMode } = useFlags();
  const { readAloud } = useSettings();
  const { supported } = useSpeechOutput();

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title={hi.settings.title} icon={LuSettings} />
      {voiceMode && supported && (
        <Card icon={LuVolume2} title={hi.settings.readAloud} speakText={`${hi.settings.readAloud}. ${hi.settings.readAloudHint}`}>
          <p className="mb-3 text-base text-ink-700">{hi.settings.readAloudHint}</p>
          <Toggle on={readAloud} onChange={(next) => updateSettings({ readAloud: next })} label={hi.settings.readAloud} />
        </Card>
      )}
    </section>
  );
}
