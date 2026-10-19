import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { diagnoseCrop } from '../api/diagnose';
import type { CropId, Diagnosis, ErrorCode } from '../api/types';
import { BigButton } from '../components/BigButton';
import { ChatPanel } from '../components/ChatPanel';
import { CropPicker } from '../components/CropPicker';
import { LoadingView } from '../components/LoadingView';
import { NoticeView } from '../components/NoticeView';
import { PhotoPicker } from '../components/PhotoPicker';
import { PhotoPreview } from '../components/PhotoPreview';
import { ResultView } from '../components/ResultView';
import { SelectedCrop } from '../components/SelectedCrop';
import { errorMessages, hi } from '../strings/hi';
import { compressImage } from '../utils/compressImage';

type State =
  | { step: 'crop' }
  | { step: 'photo'; crop: CropId; preparing: boolean }
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

export function DiagnosePage() {
  const [state, setState] = useState<State>({ step: 'crop' });

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);

  const startOver = () => setState({ step: 'crop' });
  const choosePhoto = (crop: CropId) => setState({ step: 'photo', crop, preparing: false });

  const handlePhotoPicked = async (crop: CropId, file: File) => {
    setState({ step: 'photo', crop, preparing: true });
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
      setState(
        response.status === 'ok'
          ? { step: 'result', crop, photo, diagnosis: response.diagnosis }
          : { step: 'unclear', crop, photo },
      );
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      setState({ step: 'error', crop, photo, code });
    }
  };

  if (state.step === 'crop') {
    return <CropPicker onSelect={choosePhoto} />;
  }

  const { crop } = state;
  const retryablePhoto = state.step === 'error' && RETRYABLE_ERRORS.has(state.code) ? state.photo : null;
  const retakeButton = (
    <BigButton variant="secondary" onClick={() => choosePhoto(crop)}>
      <span aria-hidden="true">📷</span> {hi.retakePhoto}
    </BigButton>
  );

  return (
    <>
      <SelectedCrop crop={crop} onChange={state.step === 'checking' ? undefined : startOver} />

      {state.step === 'photo' && (
        <PhotoPicker busy={state.preparing} onPick={(file) => void handlePhotoPicked(crop, file)} />
      )}

      {state.step === 'preview' && (
        <div className="flex flex-col gap-4">
          <PhotoPreview photo={state.photo} />
          <BigButton size="large" onClick={() => void runDiagnosis(crop, state.photo)}>
            <span aria-hidden="true">✅</span> {hi.checkPhoto}
          </BigButton>
          {retakeButton}
        </div>
      )}

      {state.step === 'checking' && (
        <>
          <PhotoPreview photo={state.photo} dimmed />
          <LoadingView />
        </>
      )}

      {state.step === 'result' && (
        <div className="flex flex-col gap-4">
          <PhotoPreview photo={state.photo} small />
          <ResultView diagnosis={state.diagnosis} />
          <ChatPanel crop={crop} diagnosis={state.diagnosis} />
          <BigButton onClick={startOver}>{hi.newCheck}</BigButton>
        </div>
      )}

      {state.step === 'unclear' && (
        <>
          <PhotoPreview photo={state.photo} small />
          <NoticeView icon="📷" message={hi.unclearPhoto}>
            {retakeButton}
          </NoticeView>
        </>
      )}

      {state.step === 'error' && (
        <NoticeView icon="😟" message={errorMessages[state.code]}>
          {retryablePhoto && (
            <BigButton onClick={() => void runDiagnosis(crop, retryablePhoto)}>{hi.tryAgain}</BigButton>
          )}
          {retakeButton}
        </NoticeView>
      )}
    </>
  );
}
