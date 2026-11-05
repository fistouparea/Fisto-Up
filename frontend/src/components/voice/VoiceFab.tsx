import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { hasStickyActions, subscribeStickyActions } from '../../utils/stickyActions';
import { LuLoaderCircle, LuMic, LuSquare, LuX } from 'react-icons/lu';
import { askIntent } from '../../api/voice';
import { VOICE_FALLBACK_CHOICES, VOICE_INTENT_SCREENS, type VoiceIntentId } from '../../data/voiceIntents';
import { useFlags } from '../../hooks/useFlags';
import { useSpeechInput, useSpeechOutput } from '../../hooks/useSpeech';
import { hi } from '../../strings/hi';
import { cn } from '../../utils/cn';
import { navigateTo } from '../../utils/navigate';
import { IconButton } from '../ui/IconButton';
import { SelectCard } from '../ui/SelectCard';
import { notifyWarning } from '../ui/notify';

type State = { step: 'idle' } | { step: 'thinking'; heard: string } | { step: 'choose'; heard: string; reply: string };

/**
 * "बोलकर चलाएँ": a big floating mic on every farmer screen. The farmer says e.g. "मौसम बताओ" and the screen
 * opens. Not understood → a polite reply (spoken) and big icon choices. Hidden when the phone has no speech input.
 */
export function VoiceFab() {
  const { voiceMode } = useFlags();
  const [state, setState] = useState<State>({ step: 'idle' });
  const { speak } = useSpeechOutput();
  const aboveActions = useSyncExternalStore(subscribeStickyActions, hasStickyActions);

  const open = useCallback(
    (intent: VoiceIntentId) => {
      setState({ step: 'idle' });
      speak(`${hi.voiceMode.opening} ${hi.voiceMode.intents[intent]}`);
      navigateTo(VOICE_INTENT_SCREENS[intent].href);
    },
    [speak],
  );

  const onTranscript = useCallback(
    (heard: string) => {
      setState({ step: 'thinking', heard });
      askIntent(heard).then(
        ({ intent }) => {
          if (intent) return open(intent);
          setState({ step: 'choose', heard, reply: hi.voiceMode.notUnderstood });
          speak(hi.voiceMode.notUnderstood);
        },
        () => {
          setState({ step: 'choose', heard, reply: hi.voiceMode.failed });
          speak(hi.voiceMode.failed);
        },
      );
    },
    [open, speak],
  );

  const { supported, listening, notHeard, start, stop } = useSpeechInput(onTranscript);
  useEffect(() => {
    if (notHeard) notifyWarning(hi.voice.notHeard);
  }, [notHeard]);

  if (!voiceMode || !supported) return null;
  const thinking = state.step === 'thinking';

  return (
    <>
      <button
        type="button"
        onClick={listening ? stop : start}
        disabled={thinking}
        aria-pressed={listening}
        aria-label={listening ? hi.voice.listening : hi.voiceMode.button}
        className={cn(
          'fixed right-4 z-30 flex size-20 items-center justify-center rounded-full shadow-raised transition-colors',
          // Above a screen's sticky main button, else just above the bottom navigation.
          aboveActions ? 'bottom-60' : 'bottom-24',
          'mb-[env(safe-area-inset-bottom)]',
          listening ? 'bg-danger-700 text-white' : 'bg-accent-400 text-ink-900 hover:bg-accent-300',
        )}
      >
        {listening && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-danger-400/50" />}
        {thinking ? (
          <LuLoaderCircle aria-hidden="true" className="size-10 animate-spin" />
        ) : listening ? (
          <LuSquare aria-hidden="true" className="relative size-9" />
        ) : (
          <LuMic aria-hidden="true" className="size-10" />
        )}
      </button>
      {listening && (
        <p role="status" className={cn('fixed right-4 z-30 rounded-2xl bg-ink-900 px-4 py-2 text-lg font-bold text-white', aboveActions ? 'bottom-84' : 'bottom-48')}>
          {hi.voiceMode.sayHint}
        </p>
      )}
      {state.step === 'choose' && <ChoiceSheet heard={state.heard} reply={state.reply} onPick={open} onClose={() => setState({ step: 'idle' })} />}
    </>
  );
}

function ChoiceSheet({ heard, reply, onPick, onClose }: { heard: string; reply: string; onPick: (intent: VoiceIntentId) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink-900/40" role="dialog" aria-modal="true" aria-label={hi.voiceMode.chooseTitle}>
      <div className="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-raised">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base text-ink-500">
              {hi.voiceMode.youSaid}: “{heard}”
            </p>
            <p className="mt-1 text-xl font-bold text-ink-900">{reply}</p>
          </div>
          <IconButton icon={LuX} label={hi.voiceMode.close} onClick={onClose} />
        </div>
        <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
          {VOICE_FALLBACK_CHOICES.map((intent) => (
            <SelectCard key={intent} icon={VOICE_INTENT_SCREENS[intent].icon} label={hi.voiceMode.intents[intent]} selected={false} onClick={() => onPick(intent)} />
          ))}
        </div>
      </div>
    </div>
  );
}
