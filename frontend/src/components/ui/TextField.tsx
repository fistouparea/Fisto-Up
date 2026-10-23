import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  hint?: string;
  /** Shown in red under the field. */
  error?: string;
  /** Fixed text before the input, e.g. "+91". */
  prefix?: string;
  /** Extra control at the end of the row (e.g. a mic button). */
  trailing?: ReactNode;
  inputClassName?: string;
}

/** Big labelled input (56px+) for outdoor use with big fingers. */
export function TextField({ label, hint, error, prefix, trailing, inputClassName, ...props }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-lg font-bold text-ink-900">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex min-h-14 flex-1 items-center rounded-2xl border-2 bg-surface focus-within:border-primary-700',
            error ? 'border-danger-600' : 'border-line',
          )}
        >
          {prefix && <span className="pl-4 text-xl font-bold text-ink-500">{prefix}</span>}
          <input
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn('min-w-0 flex-1 bg-transparent px-4 py-3 text-xl text-ink-900 outline-none placeholder:text-ink-300', inputClassName)}
            {...props}
          />
        </div>
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-base font-bold text-danger-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-base text-ink-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** 10-digit mobile number with a fixed +91. */
export function PhoneField(props: Omit<TextFieldProps, 'prefix' | 'type' | 'inputMode'>) {
  return (
    <TextField
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={10}
      prefix="+91"
      inputClassName="tracking-wider"
      {...props}
      onChange={(event) => {
        event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
        props.onChange?.(event);
      }}
    />
  );
}

/** 4-digit PIN: number keypad, hidden digits, big spacing. */
export function PinField(props: Omit<TextFieldProps, 'type' | 'inputMode'>) {
  return (
    <TextField
      type="password"
      inputMode="numeric"
      autoComplete="current-password"
      maxLength={4}
      inputClassName="text-center text-3xl tracking-[0.8em]"
      {...props}
      onChange={(event) => {
        event.target.value = event.target.value.replace(/\D/g, '').slice(0, 4);
        props.onChange?.(event);
      }}
    />
  );
}
