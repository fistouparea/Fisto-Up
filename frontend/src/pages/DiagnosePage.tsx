import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  LuCamera,
  LuCameraOff,
  LuHourglass,
  LuImageOff,
  LuRefreshCw,
  LuScanEye,
  LuScanSearch,
  LuServerCrash,
  LuWifiOff,
} from 'react-icons/lu';
import { ApiError } from '../api/client';
import { diagnoseCrop } from '../api/diagnose';
import type { CropId, Diagnosis, ErrorCode } from '../api/types';
import { ChatPanel } from '../components/ChatPanel';
import { CropGrid } from '../components/CropGrid';
import { PhotoActions } from '../components/PhotoActions';
import { PhotoPreview } from '../components/PhotoPreview';
import { ResultView } from '../components/ResultView';
import { SelectedCrop } from '../components/SelectedCrop';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loader } from '../components/ui/Loader';
import { PageHeader } from '../components/ui/PageHeader';
import { StepIndicator } from '../components/ui/StepIndicator';
import { notifySuccess } from '../components/ui/notify';
import { errorMessages, hi } from '../strings/hi';
import { compressImage } from '../utils/compressImage';

type State =
  | { step: 'choose'; crop: CropId | null; preparing: boolean }
  | { step: 'preview'; crop: CropId; photo: Blob }
  | { step: 'checking'; crop: CropId; photo: Blob }
  | { step: 'result'; crop: CropId; photo: Blob; diagnosis: Diagnosis }
  | { step: 'unclear'; crop: CropId; photo: Blob }
  | { step: 'error'; crop: CropId; photo: Blob | null; code: ErrorCode };

/** Errors where sending the same photo again can succeed. Others need a new photo. */
const RETRYABLE_ERRORS: ReadonlySet<ErrorCode> = new Set([
  'RATE_LIMITED',
  'AI_TIMEOUT',
  'AI_ERROR',
  'NETWORK',
  'INTERNAL',
  'UNKNOWN',
]);

const ERROR_ICONS: Partial<Record<ErrorCode, IconType>> = {
  NETWORK: LuWifiOff,
  RATE_LIMITED: LuHourglass,
  AI_TIMEOUT: LuHourglass,
  INVALID_IMAGE: LuImageOff,
  PHOTO_READ_FAILED: LuImageOff,
  FILE_TOO_LARGE: LuImageOff,
};

export function DiagnosePage() {
  const [state, setState] = useState<State>({ step: 'choose', crop: null, preparing: false });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);

  const chooseAgain = (crop: CropId | null) => setState({ step: 'choose', crop, preparing: false });

  const handlePhotoPicked = async (crop: CropId, file: File) => {
    setState({ step: 'choose', crop, preparing: true });
    try {
      const photo = await compressImage(file);
      setState({ step: 'preview', crop, photo });
    } catch {
      setState({ step: 'error', crop, photo: null, code: 'PHOTO_READ_FAILED' });
    }
  };

  const runDiagnosis = async (crop: CropId, photo: Blob) => {
    setState({ step: 'checking', crop, photo });
    try {
      const response = await diagnoseCrop(crop, photo);
      if (response.status === 'ok') {
        notifySuccess(hi.toast.resultReady);
        setState({ step: 'result', crop, photo, diagnosis: response.diagnosis });
      } else {
        setState({ step: 'unclear', crop, photo });
      }
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      setState({ step: 'error', crop, photo, code });
    }
  };

  const retryable =
    state.step === 'error' && state.photo && RETRYABLE_ERRORS.has(state.code)
      ? { crop: state.crop, photo: state.photo }
      : null;

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator current={currentStep(state)} />

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={state.step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col gap-4"
        >
          {state.step === 'choose' && (
            <ChooseStep
              crop={state.crop}
              preparing={state.preparing}
              onSelect={chooseAgain}
              onPick={(crop, file) => void handlePhotoPicked(crop, file)}
            />
          )}

          {state.step === 'preview' && (
            <>
              <SelectedCrop crop={state.crop} onChange={() => chooseAgain(null)} />
              <PhotoPreview photo={state.photo} />
              <Button variant="accent" size="hero" icon={LuScanSearch} onClick={() => void runDiagnosis(state.crop, state.photo)}>
                {hi.checkPhoto}
              </Button>
              <Button variant="secondary" icon={LuCamera} onClick={() => chooseAgain(state.crop)}>
                {hi.retakePhoto}
              </Button>
            </>
          )}

          {state.step === 'checking' && (
            <>
              <PhotoPreview photo={state.photo} dimmed small />
              <Loader title={hi.checking} hint={hi.checkingHint} />
            </>
          )}

          {state.step === 'result' && (
            <>
              <SelectedCrop crop={state.crop} />
              <PhotoPreview photo={state.photo} small />
              <ResultView diagnosis={state.diagnosis} />
              <ChatPanel crop={state.crop} diagnosis={state.diagnosis} />
              <Button icon={LuCamera} onClick={() => chooseAgain(null)}>
                {hi.newCheck}
              </Button>
            </>
          )}

          {state.step === 'unclear' && (
            <>
              <PhotoPreview photo={state.photo} small />
              <EmptyState icon={LuCameraOff} tone="warning" message={hi.unclearPhoto}>
                <Button variant="accent" icon={LuCamera} onClick={() => chooseAgain(state.crop)}>
                  {hi.retakePhoto}
                </Button>
              </EmptyState>
            </>
          )}

          {state.step === 'error' && (
            <ErrorStep
              code={state.code}
              onRetry={retryable ? () => void runDiagnosis(retryable.crop, retryable.photo) : undefined}
              onRetake={() => chooseAgain(state.crop)}
            />
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}

function currentStep(state: State): 0 | 1 | 2 {
  if (state.step === 'choose') return state.crop ? 1 : 0;
  if (state.step === 'preview') return 1;
  return 2;
}

interface ChooseStepProps {
  crop: CropId | null;
  preparing: boolean;
  onSelect: (crop: CropId) => void;
  onPick: (crop: CropId, file: File) => void;
}

/** Home: crop picture cards + a sticky giant camera button that is enabled once a crop is chosen. */
function ChooseStep({ crop, preparing, onSelect, onPick }: ChooseStepProps) {
  if (preparing) {
    return <Loader title={hi.preparingPhoto} />;
  }

  return (
    <>
      <PageHeader title={hi.chooseCrop} />
      <CropGrid selected={crop} onSelect={onSelect} />
      {crop && (
        <Card tone="cream" icon={LuScanEye} title={hi.takePhotoHint} speakText={hi.takePhotoHint} reveal />
      )}
      {/* Sticky above the bottom navigation so the main action is always in reach. */}
      <div className="sticky bottom-24 z-10 -mx-4 bg-linear-to-t from-surface-page from-70% to-transparent px-4 pt-6 pb-2">
        <PhotoActions enabled={crop !== null} onPick={(file) => crop && onPick(crop, file)} />
      </div>
    </>
  );
}

interface ErrorStepProps {
  code: ErrorCode;
  onRetry?: () => void;
  onRetake: () => void;
}

function ErrorStep({ code, onRetry, onRetake }: ErrorStepProps) {
  return (
    <EmptyState icon={ERROR_ICONS[code] ?? LuServerCrash} tone="danger" message={errorMessages[code]}>
      {onRetry && (
        <Button variant="accent" icon={LuRefreshCw} onClick={onRetry}>
          {hi.tryAgain}
        </Button>
      )}
      <Button variant={onRetry ? 'secondary' : 'accent'} icon={LuCamera} onClick={onRetake}>
        {hi.retakePhoto}
      </Button>
    </EmptyState>
  );
}
