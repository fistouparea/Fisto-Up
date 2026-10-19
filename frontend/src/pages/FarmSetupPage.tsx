import { useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheck, LuDroplets, LuMapPin, LuSprout } from 'react-icons/lu';
import type { FarmProfile } from '../api/types';
import { CropsStep } from '../components/farm/CropsStep';
import { FieldStep } from '../components/farm/FieldStep';
import { LocationStep } from '../components/farm/LocationStep';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { notifyError, notifySuccess } from '../components/ui/notify';
import { SpeakButton } from '../components/ui/SpeakButton';
import { StepIndicator, type Step } from '../components/ui/StepIndicator';
import { StickyActions } from '../components/ui/StickyActions';
import { useFarmProfile } from '../hooks/useFarmProfile';
import { hi } from '../strings/hi';

const SETUP_STEPS: Step[] = [
  { label: hi.farm.steps.location, icon: LuMapPin },
  { label: hi.farm.steps.crops, icon: LuSprout },
  { label: hi.farm.steps.field, icon: LuDroplets },
];
const LAST_STEP = SETUP_STEPS.length - 1;

interface FarmSetupPageProps {
  /** Called after saving (or skipping everything during onboarding). */
  onDone: () => void;
}

/** Onboarding and editing of "मेरा खेत": 3 icon-based screens, each one skippable. */
export function FarmSetupPage({ onDone }: FarmSetupPageProps) {
  const { profile, save } = useFarmProfile();
  const [draft, setDraft] = useState<FarmProfile>(profile ?? { crops: [] });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const update = (changes: Partial<FarmProfile>) => setDraft((current) => ({ ...current, ...changes }));

  const finish = async () => {
    setSaving(true);
    const saved = await save(draft);
    setSaving(false);
    if (saved) {
      notifySuccess(hi.farm.saved);
      onDone();
    } else {
      notifyError('STORAGE_UNAVAILABLE');
    }
  };

  const goNext = () => {
    window.scrollTo({ top: 0 });
    if (step < LAST_STEP) setStep(step + 1);
    else void finish();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-tight text-ink-900">{hi.farm.setupTitle}</h2>
          <p className="text-lg text-ink-500">{hi.farm.setupHint}</p>
        </div>
        <SpeakButton text={`${hi.farm.setupTitle}। ${hi.farm.setupHint}`} />
      </div>
      <StepIndicator steps={SETUP_STEPS} current={step} label={hi.farm.title} />

      {step === 0 && <LocationStep value={draft.location} onChange={(location) => update({ location })} />}
      {step === 1 && <CropsStep value={draft.crops} onChange={(crops) => update({ crops })} />}
      {step === 2 && (
        <FieldStep
          size={draft.fieldSizeBigha}
          irrigation={draft.irrigation}
          onSizeChange={(fieldSizeBigha) => update({ fieldSizeBigha })}
          onIrrigationChange={(irrigation) => update({ irrigation })}
        />
      )}

      <StickyActions>
        {step > 0 && <IconButton icon={LuArrowLeft} label={hi.back} onClick={() => setStep(step - 1)} className="self-center" />}
        <Button variant="secondary" size="md" fullWidth={false} onClick={goNext} disabled={saving} className="self-center px-3">
          {hi.skip}
        </Button>
        <Button
          variant="accent"
          size="lg"
          icon={step < LAST_STEP ? LuArrowRight : LuCheck}
          onClick={goNext}
          disabled={saving}
          className="flex-1 px-3"
        >
          {step < LAST_STEP ? hi.next : hi.save}
        </Button>
      </StickyActions>
    </div>
  );
}
