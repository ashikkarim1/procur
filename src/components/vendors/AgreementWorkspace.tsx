'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eyebrow, Chip, Monogram, type ChipTone } from '../primitives';
import { useToast } from '../Toast';
import { clsx } from '../clsx';
import { formatMoney } from '@/lib/money';
import { monogram } from '@/lib/score';
import type { ReferralAgreement, FlagSeverity, StepState } from '@/contracts/types';

const STATUS: Record<string, { label: string; tone: ChipTone }> = {
  in_review: { label: 'IN REVIEW', tone: 'warning' },
  countered: { label: 'COUNTERED', tone: 'neutral' },
  active: { label: 'ACTIVE', tone: 'positive' },
  submitted: { label: 'SUBMITTED', tone: 'neutral' },
  approved: { label: 'APPROVED', tone: 'accent' },
  rejected: { label: 'REJECTED', tone: 'danger' },
  paused: { label: 'PAUSED', tone: 'neutral' },
};

const REC: Record<string, { label: string; tone: ChipTone }> = {
  approve: { label: 'RECOMMEND APPROVE', tone: 'positive' },
  counter: { label: 'RECOMMEND COUNTER', tone: 'warning' },
  reject: { label: 'RECOMMEND REJECT', tone: 'danger' },
};

const SEVERITY: Record<FlagSeverity, { border: string; mark: string; markCls: string }> = {
  ok: { border: 'border-l-positive', mark: '✓', markCls: 'text-positive' },
  warn: { border: 'border-l-warning-bar', mark: '!', markCls: 'text-warning' },
  block: { border: 'border-l-danger', mark: '✕', markCls: 'text-danger' },
};

function feeLine(a: ReferralAgreement): string {
  if (a.feeType === 'flat') return `${formatMoney({ amount: a.feeValue, currency: 'USD' })} flat${a.recurring ? ' · recurring' : ''}`;
  return `${a.feeValue}%${a.recurring ? ' recurring' : ' one-time'}`;
}

export function AgreementWorkspace({ agreements, vendorName }: { agreements: ReferralAgreement[]; vendorName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState(agreements[0]?.id);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => agreements.find((a) => a.id === selectedId), [agreements, selectedId]);

  async function act(path: string, body: object, okMsg: string) {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/referral/agreements/${selected.id}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p.detail ?? 'Action failed');
      }
      toast(okMsg);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const hasBlock = Boolean(selected?.policyReview?.flags.some((f) => f.severity === 'block'));
  const canSign = selected && (selected.status === 'countered' || selected.status === 'approved');

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: '300px 1fr' }}>
      {/* LEFT — agreement queue */}
      <div className="flex flex-col gap-2.5">
        <Eyebrow className="mb-1">Agreement queue</Eyebrow>
        {agreements.map((a) => {
          const s = STATUS[a.status] ?? { label: a.status.toUpperCase(), tone: 'neutral' as ChipTone };
          const active = a.id === selectedId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedId(a.id)}
              className={clsx(
                'rounded-xl border p-3.5 text-left transition',
                active ? 'border-accent bg-accent-tint2' : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px] font-semibold text-ink-soft">{a.id}</span>
                <Chip tone={s.tone} mono>{s.label}</Chip>
              </div>
              <div className="mt-1.5 font-serif text-[14px] font-medium text-ink">{vendorName}</div>
              <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{feeLine(a)}</div>
            </button>
          );
        })}
      </div>

      {/* RIGHT — detail */}
      {selected ? (
        <div className="rounded-xl border border-line bg-surface">
          {/* vendor header */}
          <div className="flex items-center justify-between gap-4 border-b border-line p-[18px]">
            <div className="flex items-center gap-3">
              <Monogram letter={monogram(vendorName)} size={44} />
              <div>
                <div className="font-serif text-[18px] font-medium text-ink">{vendorName}</div>
                <div className="font-mono text-[11px] text-ink-faint">{selected.id} · {selected.connector ?? 'no connector'}</div>
              </div>
            </div>
            {selected.policyReview && (
              <div className="flex flex-col items-end gap-1">
                <Eyebrow>AI policy review</Eyebrow>
                <Chip tone={REC[selected.policyReview.recommendation].tone} mono>
                  {REC[selected.policyReview.recommendation].label}
                </Chip>
              </div>
            )}
          </div>

          {/* proposed-terms grid */}
          <div className="grid grid-cols-3 gap-px bg-line-soft">
            <Term label="Fee" value={feeLine(selected)} />
            <Term label="Qualified lead" value={selected.qualifiedLeadDef} />
            <Term label="Cookie window" value={selected.cookieDays != null ? `${selected.cookieDays} days` : '—'} />
            <Term label="Territories" value={(selected.territories ?? []).join(', ') || '—'} />
            <Term label="Min contract" value={selected.minContractValue ? formatMoney(selected.minContractValue) : '—'} />
            <Term label="Payment timing" value={selected.paymentTiming} />
          </div>

          {/* AI review flags */}
          {selected.policyReview && (
            <div className="border-t border-line p-[18px]">
              <Eyebrow className="mb-3">AI policy review · {selected.policyReview.policyVersion}</Eyebrow>
              <div className="flex flex-col gap-2.5">
                {selected.policyReview.flags.map((f, i) => {
                  const sv = SEVERITY[f.severity];
                  return (
                    <div key={i} className={clsx('rounded-lg border border-line border-l-[3px] bg-surface p-3', sv.border)}>
                      <div className="flex items-start gap-2">
                        <span className={clsx('mt-px font-mono text-[14px] font-bold leading-none', sv.markCls)}>{sv.mark}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[14px] font-semibold text-ink">{f.title}</span>
                            {f.clauseRef && <span className="font-mono text-[10px] text-ink-faint">{f.clauseRef}</span>}
                          </div>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{f.detail}</p>
                          {f.suggestion && (
                            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                              <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Suggestion · </span>
                              {f.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* action bar */}
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 p-[18px]">
            <button
              type="button"
              disabled={busy}
              onClick={() => act('decision', { decision: 'counter' }, 'Redline & counter generated')}
              className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
            >
              Generate redline &amp; counter
            </button>
            <button
              type="button"
              disabled={busy || hasBlock}
              title={hasBlock ? 'Blocked: a block-severity flag prevents approval' : undefined}
              onClick={() => act('decision', { decision: 'approve' }, 'Approved as-is')}
              className="rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong disabled:opacity-50"
            >
              Approve as-is
            </button>
            {canSign && (
              <button
                type="button"
                disabled={busy}
                onClick={() => act('sign', { party: 'platform' }, 'Signed by platform')}
                className="rounded-lg border border-accent bg-surface px-3.5 py-2 text-[13px] font-semibold text-accent transition hover:bg-accent-tint disabled:opacity-50"
              >
                Sign
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => act('decision', { decision: 'reject' }, 'Rejected')}
              className="ml-auto rounded-lg border border-[#e8c8be] bg-surface px-3.5 py-2 text-[13px] font-semibold text-danger transition hover:bg-[#f7e7e2] disabled:opacity-50"
            >
              Reject
            </button>
          </div>

          {hasBlock && (
            <div className="border-t border-line px-[18px] py-2.5 text-[12px] text-ink-muted">
              A block-flagged agreement never auto-activates. Resolve the blocking clause and re-review before approval.
            </div>
          )}

          {/* workflow stepper */}
          <Stepper status={selected.status} />
        </div>
      ) : (
        <div className="grid place-items-center rounded-xl border border-line bg-surface p-12 text-[14px] text-ink-faint">
          No agreements to review.
        </div>
      )}
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3.5">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 text-[14px] font-medium text-ink">{value}</div>
    </div>
  );
}

const STEP_ORDER = ['submitted', 'in_review', 'decided', 'esign', 'leads'] as const;
function stepStates(status: string): StepState[] {
  // index of the currently-active stage
  const idx: Record<string, number> = {
    submitted: 1, in_review: 1, countered: 2, approved: 3, rejected: 2, active: 4, paused: 4,
  };
  const cur = idx[status] ?? 0;
  return STEP_ORDER.map((_, i): StepState => (i < cur ? 'done' : i === cur ? 'active' : 'pending'));
}

function Stepper({ status }: { status: string }) {
  const labels = ['Submitted', 'AI review', 'Approve / counter', 'E-sign', 'Leads flow'];
  const states = stepStates(status);
  return (
    <div className="border-t border-line p-[18px]">
      <Eyebrow className="mb-3">Workflow</Eyebrow>
      <div className="flex items-center">
        {labels.map((label, i) => {
          const st = states[i];
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={clsx(
                    'grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] font-semibold',
                    st === 'done' && 'bg-accent text-white',
                    st === 'active' && 'border-2 border-accent bg-surface text-accent',
                    st === 'pending' && 'border border-line bg-surface text-ink-faint',
                  )}
                >
                  {st === 'done' ? '✓' : st === 'active' ? '●' : i + 1}
                </span>
                <span className={clsx('whitespace-nowrap text-[11px]', st === 'pending' ? 'text-ink-faint' : 'text-ink-soft')}>{label}</span>
              </div>
              {i < labels.length - 1 && (
                <div className={clsx('mx-1.5 h-px flex-1', states[i + 1] === 'pending' ? 'bg-line' : 'bg-accent')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
