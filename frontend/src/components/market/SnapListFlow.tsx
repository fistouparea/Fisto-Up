import { useEffect, useState, type ReactNode } from 'react';
import { LuArrowRight, LuCamera, LuCameraOff, LuCircleCheckBig, LuMic, LuPlus, LuRefreshCw, LuStore, LuWifiOff } from 'react-icons/lu';
import { ApiError } from '../../api/client';
import { draftListing, uploadListingPhoto } from '../../api/listings';
import type { NewListing, SellerListing } from '../../api/marketTypes';
import type { ErrorCode } from '../../api/types';
import { useConnectivity } from '../../hooks/useConnectivity';
import { hi, marketErrorMessage } from '../../strings/hi';
import { compressImage } from '../../utils/compressImage';
import { formFromDraft, validateListingForm, type ListingForm, type ListingFormField } from '../../utils/listingForm';
import { MicButton } from '../MicButton';
import { PhotoActions } from '../PhotoActions';
import { PhotoPreview } from '../PhotoPreview';
import { Button } from '../ui/Button';
import { Callout } from '../ui/Callout';
import { EmptyState } from '../ui/EmptyState';
import { Loader } from '../ui/Loader';
import { PageHeader } from '../ui/PageHeader';
import { PageTransition } from '../ui/PageTransition';
import { StepIndicator, type Step } from '../ui/StepIndicator';
import { StickyActions } from '../ui/StickyActions';
import { notifySuccess } from '../ui/notify';
import { ListingConfirmForm } from './ListingConfirmForm';

type State =
  | { step: 'photo'; preparing: boolean }
  | { step: 'describe'; photo: Blob; text: string }
  | { step: 'thinking'; photo: Blob }
  | { step: 'retake'; reason: string }
  | { step: 'confirm'; photo: Blob; photoId: string; form: ListingForm; aiFailed: boolean }
  | { step: 'saving'; photo: Blob; photoId: string; form: ListingForm }
  | { step: 'done'; listing: SellerListing }
  | { step: 'error'; code: ErrorCode; retry: (() => void) | null };

const STEPS: Step[] = [
  { label: hi.sell.steps.photo, icon: LuCamera },
  { label: hi.sell.steps.speak, icon: LuMic },
  { label: hi.sell.steps.confirm, icon: LuCircleCheckBig },
];

interface SnapListFlowProps {
  /** Saves the listing (the seller's own, or an assisted listing for a coordinator). */
  submit: (listing: NewListing) => Promise<SellerListing>;
  /** Shown above the photo step, e.g. the chosen seller and consent for assisted listing. */
  header?: ReactNode;
  /** Extra hint under the price, e.g. the fair price suggestion. */
  priceHint?: (form: ListingForm) => ReactNode;
  onFinished: () => void;
  finishLabel: string;
}

/** Photo → speak (or type) → AI fills the form → seller checks big cards → one button to list. */
export function SnapListFlow({ submit, header, priceHint, onFinished, finishLabel }: SnapListFlowProps) {
  const [state, setState] = useState<State>({ step: 'photo', preparing: false });
  const [errors, setErrors] = useState<Partial<Record<ListingFormField, string>>>({});
  const { offline } = useConnectivity();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.step]);

  const restart = () => setState({ step: 'photo', preparing: false });

  const pickPhoto = async (file: File) => {
    setState({ step: 'photo', preparing: true });
    try {
      setState({ step: 'describe', photo: await compressImage(file), text: '' });
    } catch {
      setState({ step: 'error', code: 'PHOTO_READ_FAILED', retry: null });
    }
  };

  const askAi = async (photo: Blob, text: string) => {
    setState({ step: 'thinking', photo });
    try {
      const result = await draftListing(photo, text.trim());
      if (result.status === 'retake') {
        setState({ step: 'retake', reason: result.reason || hi.sell.retakeDefault });
        return;
      }
      setState({ step: 'confirm', photo, photoId: result.photoId, form: formFromDraft(result.draft), aiFailed: false });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      if (code === 'INVALID_IMAGE' || code === 'FILE_TOO_LARGE' || code === 'NETWORK') {
        setState({ step: 'error', code, retry: code === 'NETWORK' ? () => void askAi(photo, text) : null });
        return;
      }
      // The AI is busy or failed: never block listing. Save the photo alone and let the seller fill the form.
      await uploadWithoutAi(photo);
    }
  };

  const uploadWithoutAi = async (photo: Blob) => {
    try {
      const photoId = await uploadListingPhoto(photo);
      setState({ step: 'confirm', photo, photoId, form: formFromDraft(null), aiFailed: true });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      setState({ step: 'error', code, retry: () => void uploadWithoutAi(photo) });
    }
  };

  const save = async (photo: Blob, photoId: string, form: ListingForm) => {
    const { errors: found, listing } = validateListingForm(form, [photoId]);
    setErrors(found);
    if (!listing) return;
    setState({ step: 'saving', photo, photoId, form });
    try {
      const saved = await submit(listing);
      notifySuccess(hi.sell.doneTitle);
      setState({ step: 'done', listing: saved });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'UNKNOWN';
      setState({ step: 'error', code, retry: () => setState({ step: 'confirm', photo, photoId, form, aiFailed: false }) });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator steps={STEPS} current={currentStep(state)} label={hi.sell.steps.label} />
      {offline && state.step !== 'done' && <Callout tone="warning" icon={LuWifiOff} text={hi.sell.offline} />}

      <PageTransition pageKey={state.step} className="flex flex-col gap-4">
        {state.step === 'photo' &&
          (state.preparing ? (
            <Loader title={hi.preparingPhoto} />
          ) : (
            <>
              {header}
              <PageHeader title={hi.sell.photoTitle} icon={LuCamera} speakText={`${hi.sell.photoTitle}। ${hi.sell.photoHint}`} />
              <Callout tone="cream" icon={LuCamera} text={hi.sell.photoHint} />
              <StickyActions>
                <PhotoActions onPick={(file) => void pickPhoto(file)} />
              </StickyActions>
            </>
          ))}

        {state.step === 'describe' && (
          <DescribeStep
            photo={state.photo}
            text={state.text}
            onText={(text) => setState({ ...state, text })}
            onNext={() => void askAi(state.photo, state.text)}
            onRetake={restart}
          />
        )}

        {state.step === 'thinking' && (
          <>
            <PhotoPreview photo={state.photo} size="small" dimmed />
            <Loader title={hi.sell.thinking} hint={hi.sell.thinkingHint} />
          </>
        )}

        {state.step === 'retake' && (
          <EmptyState icon={LuCameraOff} tone="warning" message={state.reason}>
            <Button variant="accent" icon={LuCamera} onClick={restart}>
              {hi.sell.retake}
            </Button>
          </EmptyState>
        )}

        {(state.step === 'confirm' || state.step === 'saving') && (
          <>
            <PageHeader title={hi.sell.confirmTitle} icon={LuCircleCheckBig} />
            <PhotoPreview photo={state.photo} size="small" />
            {state.step === 'confirm' && state.aiFailed && <Callout tone="warning" icon={LuStore} text={hi.sell.aiFailed} />}
            <ListingConfirmForm
              form={state.form}
              errors={errors}
              onChange={(form) => state.step === 'confirm' && setState({ ...state, form })}
              priceHint={priceHint?.(state.form)}
            />
            <StickyActions>
              <Button
                variant="accent"
                size="hero"
                icon={LuCircleCheckBig}
                disabled={state.step === 'saving'}
                onClick={() => void save(state.photo, state.photoId, state.form)}
              >
                {state.step === 'saving' ? hi.sell.saving : hi.sell.confirm}
              </Button>
            </StickyActions>
          </>
        )}

        {state.step === 'done' && (
          <EmptyState
            icon={LuCircleCheckBig}
            tone="success"
            message={`${hi.sell.doneTitle} ${state.listing.visible ? hi.sell.doneVisible : hi.sell.donePending}`}
          >
            <Button variant="accent" icon={LuPlus} onClick={restart}>
              {hi.sell.sellAnother}
            </Button>
            <Button variant="secondary" icon={LuStore} onClick={onFinished}>
              {finishLabel}
            </Button>
          </EmptyState>
        )}

        {state.step === 'error' && (
          <EmptyState icon={LuCameraOff} tone="danger" message={marketErrorMessage(state.code)}>
            {state.retry && (
              <Button variant="accent" icon={LuRefreshCw} onClick={state.retry}>
                {hi.tryAgain}
              </Button>
            )}
            <Button variant={state.retry ? 'secondary' : 'accent'} icon={LuCamera} onClick={restart}>
              {hi.sell.retake}
            </Button>
          </EmptyState>
        )}
      </PageTransition>
    </div>
  );
}

function currentStep(state: State): 0 | 1 | 2 {
  if (state.step === 'photo' || state.step === 'retake') return 0;
  if (state.step === 'describe' || state.step === 'thinking') return 1;
  return 2;
}

interface DescribeStepProps {
  photo: Blob;
  text: string;
  onText: (text: string) => void;
  onNext: () => void;
  onRetake: () => void;
}

function DescribeStep({ photo, text, onText, onNext, onRetake }: DescribeStepProps) {
  return (
    <>
      <PhotoPreview photo={photo} size="small" />
      <PageHeader title={hi.sell.speakTitle} icon={LuMic} speakText={`${hi.sell.speakTitle} ${hi.sell.speakExample}`} />
      <p className="text-lg text-ink-500">{hi.sell.speakExample}</p>
      <MicButton onTranscript={(heard) => onText(text ? `${text} ${heard}` : heard)} />
      <label className="sr-only" htmlFor="sell-text">
        {hi.sell.typeInstead}
      </label>
      <textarea
        id="sell-text"
        value={text}
        maxLength={500}
        rows={3}
        placeholder={hi.sell.typeInstead}
        onChange={(event) => onText(event.target.value)}
        className="w-full rounded-2xl border-2 border-line bg-surface p-4 text-xl text-ink-900 focus:border-primary-700 focus:outline-none"
      />
      <StickyActions>
        <Button variant="accent" size="hero" icon={LuArrowRight} onClick={onNext} className="flex-1">
          {hi.sell.next}
        </Button>
        <Button variant="secondary" size="hero" fullWidth={false} icon={LuCamera} onClick={onRetake} className="w-24 flex-col gap-1 px-2 text-base">
          {hi.retakeShort}
        </Button>
      </StickyActions>
    </>
  );
}
