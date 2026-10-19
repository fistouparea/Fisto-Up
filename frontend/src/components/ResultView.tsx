import { LuCircleHelp, LuLandmark, LuLeaf, LuPill, LuSearch, LuShieldAlert, LuTriangleAlert } from 'react-icons/lu';
import type { Diagnosis } from '../api/types';
import { hi } from '../strings/hi';
import { diagnosisToSpeech } from '../utils/speechText';
import { SeverityCard } from './SeverityCard';
import { Card } from './ui/Card';
import { SpeakButton } from './ui/SpeakButton';

interface ResultViewProps {
  diagnosis: Diagnosis;
}

export function ResultView({ diagnosis }: ResultViewProps) {
  const { problem_name, explanation, desi_upay, dawai, savdhani, severity } = diagnosis;

  return (
    <div className="flex flex-col gap-4">
      {severity && <SeverityCard severity={severity} />}

      <SpeakButton text={diagnosisToSpeech(diagnosis)} variant="pill" className="self-start" />

      <Card reveal icon={LuSearch} title={hi.sections.problem} speakText={`${hi.sections.problem}: ${problem_name}`}>
        <p className="text-2xl font-bold leading-snug">{problem_name}</p>
      </Card>

      <Card reveal icon={LuCircleHelp} title={hi.sections.cause} speakText={`${hi.sections.cause}: ${explanation}`}>
        <p>{explanation}</p>
      </Card>

      {desi_upay.length > 0 && (
        <Card reveal tone="neutral" icon={LuLeaf} title={hi.sections.desiUpay} speakText={listSpeech(hi.sections.desiUpay, desi_upay)}>
          <BulletList items={desi_upay} />
        </Card>
      )}

      {dawai.length > 0 && (
        <Card reveal tone="warning" icon={LuShieldAlert} className="border-2" speakText={hi.dawaiWarning} title={hi.dawaiWarning} />
      )}

      <Card
        reveal
        icon={LuPill}
        title={hi.sections.dawai}
        speakText={
          dawai.length > 0
            ? listSpeech(hi.sections.dawai, dawai.map((item) => `${item.name}। ${item.kaise_use_karein}`))
            : `${hi.sections.dawai}: ${hi.noDawaiNeeded}`
        }
      >
        {dawai.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {dawai.map((item, index) => (
              <li key={index} className="rounded-2xl border border-line bg-surface-page p-3">
                <p className="text-xl font-bold">{item.name}</p>
                <p className="mt-1">{item.kaise_use_karein}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>{hi.noDawaiNeeded}</p>
        )}
      </Card>

      {savdhani.length > 0 && (
        <Card reveal icon={LuTriangleAlert} title={hi.sections.savdhani} speakText={listSpeech(hi.sections.savdhani, savdhani)}>
          <BulletList items={savdhani} />
        </Card>
      )}

      <Card reveal tone="cream" icon={LuLandmark} title={hi.kvkAdvice} speakText={hi.kvkAdvice} className="border-2" />
    </div>
  );
}

function listSpeech(title: string, items: string[]): string {
  return `${title}: ${items.join(' ')}`;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span aria-hidden="true" className="mt-2.5 size-2.5 shrink-0 rounded-full bg-primary-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
