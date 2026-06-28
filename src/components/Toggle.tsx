'use client';
import { clsx } from './clsx';

// Reusable switch (DESIGN_SPEC §10): 38×22 track, 18×18 knob, accent when on.
export function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={clsx(
        'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-150',
        on ? 'bg-accent' : 'bg-line-strong',
        disabled && 'opacity-50',
      )}
    >
      <span
        className="absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)] transition-transform duration-150"
        style={{ transform: on ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}
