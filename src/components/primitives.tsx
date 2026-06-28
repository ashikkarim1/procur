import { clsx } from './clsx';

// ── Eyebrow: IBM Plex Mono, uppercase, tracked (DESIGN_SPEC typography) ───────
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint', className)}>
      {children}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  return (
    <As className={clsx('rounded-xl border border-line bg-surface', className)}>{children}</As>
  );
}

// ── Chip / badge with semantic variants ──────────────────────────────────────
export type ChipTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'danger';
const chipTone: Record<ChipTone, string> = {
  neutral: 'bg-[#efece5] border-line text-ink-soft',
  accent: 'bg-accent-tint border-transparent text-accent',
  positive: 'bg-positive-bg border-positive-border text-positive',
  warning: 'bg-warning-bg border-warning-border text-warning',
  danger: 'bg-[#f7e7e2] border-[#e8c8be] text-danger',
};
export function Chip({
  children,
  tone = 'neutral',
  mono = false,
  className,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-[5px] border px-2 py-[3px] text-[12px] font-medium leading-none',
        mono ? 'font-mono' : 'font-sans',
        chipTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Big mono figure ──────────────────────────────────────────────────────────
export function Figure({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'ink' | 'accent' | 'danger' | 'positive';
}) {
  const toneCls =
    tone === 'accent' ? 'text-accent' : tone === 'danger' ? 'text-danger' : tone === 'positive' ? 'text-positive' : 'text-ink';
  return (
    <div className={clsx('font-mono font-semibold tracking-[-0.02em] tabular-nums', toneCls, className)}>
      {children}
    </div>
  );
}

// ── Labeled progress bar (track + accent fill) ───────────────────────────────
export function LabeledBar({
  label,
  value,
  pct,
  trackClassName,
  fillClassName,
}: {
  label?: string;
  value?: string;
  pct: number;
  trackClassName?: string;
  fillClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {(label || value) && (
        <div className="flex items-baseline justify-between">
          {label && <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</span>}
          {value && <span className="font-mono text-[12px] font-semibold text-ink-soft tabular-nums">{value}</span>}
        </div>
      )}
      <div className={clsx('h-[7px] w-full overflow-hidden rounded-full bg-accent-track', trackClassName)}>
        <div
          className={clsx('h-full rounded-full bg-accent transition-[width] duration-500', fillClassName)}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

// ── Fit ring (conic gradient, DESIGN_SPEC §3) ────────────────────────────────
export function FitRing({ score, size = 62 }: { score: number; size?: number }) {
  const inner = size - 14;
  return (
    <div
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(var(--accent) ${score}%, var(--color-line) 0)` }}
      aria-label={`Fit score ${score} out of 100`}
    >
      <div className="grid place-items-center rounded-full bg-surface" style={{ width: inner, height: inner }}>
        <span className="font-mono font-semibold leading-none text-accent" style={{ fontSize: size * 0.3 }}>
          {score}
        </span>
        <span className="font-mono uppercase tracking-[0.1em] text-ink-faint" style={{ fontSize: size * 0.13 }}>
          FIT
        </span>
      </div>
    </div>
  );
}

// ── Dark monogram tile (vendor mark) ─────────────────────────────────────────
export function Monogram({ letter, size = 48 }: { letter: string; size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-[10px] font-mono font-semibold"
      style={{ width: size, height: size, background: 'var(--color-brand-mark-bg)', color: 'var(--color-brand-mark)', fontSize: size * 0.4 }}
    >
      {letter}
    </div>
  );
}
