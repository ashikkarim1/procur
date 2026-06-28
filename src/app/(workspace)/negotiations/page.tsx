import { notFound } from 'next/navigation';
import { getActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProductById } from '@/lib/graph';
import { toNegotiation } from '@/lib/lifecycle';
import { shortName, monogram } from '@/lib/score';
import { formatMoney, formatCompact } from '@/lib/money';
import { Eyebrow, Chip } from '@/components/primitives';
import { clsx } from '@/components/clsx';
import { SubmitForApproval } from '@/components/negotiations/SubmitForApproval';
import type {
  Negotiation,
  NegotiationLever,
  NegotiationMessage,
  LeverState,
  Money,
} from '@/contracts/types';

export default async function NegotiationsPage() {
  const actor = await getActor();
  // tenant-scoped: only this org's negotiations
  const rows = await prisma.negotiation.findMany({ where: { orgId: actor.orgId } });
  if (rows.length === 0) notFound();
  // Most recent active deal first; NG-4471 is the seeded showcase.
  const order: Record<string, number> = {
    negotiating: 0,
    awaiting_approval: 1,
    drafting: 2,
    agreed: 3,
    declined: 4,
  };
  const sorted = rows
    .map(toNegotiation)
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  const negotiation = sorted[0];

  const product = await getProductById(negotiation.productId);
  const productName = product ? shortName(product.name) : negotiation.productId;
  const vendorName = product?.vendor.name ?? 'Vendor';

  return <DealRoom negotiation={negotiation} productName={productName} vendorName={vendorName} />;
}

// ── Deal room ─────────────────────────────────────────────────────────────────
function DealRoom({
  negotiation: n,
  productName,
  vendorName,
}: {
  negotiation: Negotiation;
  productName: string;
  vendorName: string;
}) {
  const live = n.status === 'negotiating';
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow className="mb-1.5">AI negotiation · {productName}</Eyebrow>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-[24px] font-medium text-ink">Deal room</h1>
            <span className="rounded-[6px] border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] font-medium text-ink-muted">
              {n.id}
            </span>
          </div>
        </div>
        <StatusPill status={n.status} live={live} />
      </div>

      {/* Savings banner */}
      <SavingsBanner listPrice={n.listPrice} currentOffer={n.currentOffer} securedDelta={n.securedDelta} />

      {/* Body grid */}
      <div className="mt-6 grid grid-cols-1 gap-[26px] lg:grid-cols-[1fr_340px]">
        {/* Left: thread */}
        <Thread thread={n.thread} live={live} />

        {/* Right rail */}
        <aside className="flex flex-col gap-4">
          <LeversCard levers={n.levers} />
          <GuardrailsCard guardrails={n.guardrails} />
          <SubmitForApproval id={n.id} approverName={n.guardrails.approver} />
        </aside>
      </div>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status, live }: { status: string; live: boolean }) {
  const label: Record<string, string> = {
    drafting: 'DRAFTING',
    negotiating: 'AGENT NEGOTIATING',
    awaiting_approval: 'AWAITING APPROVAL',
    agreed: 'AGREED',
    declined: 'DECLINED',
  };
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-accent-tint px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
      <span
        className={clsx('h-1.5 w-1.5 rounded-full bg-accent', live && 'animate-pulse-dot')}
      />
      {label[status] ?? status}
    </span>
  );
}

// ── Savings banner (dark) ─────────────────────────────────────────────────────
function SavingsBanner({
  listPrice,
  currentOffer,
  securedDelta,
}: {
  listPrice: Money;
  currentOffer: Money;
  securedDelta: Money;
}) {
  // securedDelta is negative = savings; show the magnitude as a positive figure.
  const savings: Money = { amount: Math.abs(securedDelta.amount), currency: securedDelta.currency };
  return (
    <div
      className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-3"
      style={{ background: 'var(--color-rail-bg)', borderRadius: 13 }}
    >
      <BannerCell label="List price">
        <span className="font-mono text-[20px] font-semibold tabular-nums text-rail-text line-through">
          {formatMoney(listPrice)}
        </span>
      </BannerCell>
      <BannerCell label="Current offer">
        <span className="font-mono text-[20px] font-semibold tabular-nums text-rail-text-active">
          {formatMoney(currentOffer)}
        </span>
      </BannerCell>
      <BannerCell label="Secured so far">
        <span className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: 'var(--color-brand-mark)' }}>
          −{formatMoney(savings)}
        </span>
      </BannerCell>
    </div>
  );
}

function BannerCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-rail-text">
        {label}
      </span>
      {children}
    </div>
  );
}

// ── Negotiation thread ────────────────────────────────────────────────────────
function Thread({ thread, live }: { thread: NegotiationMessage[]; live: boolean }) {
  const last = thread[thread.length - 1];
  const reviewing = live && last?.author === 'agent';
  return (
    <div className="rounded-xl border border-line bg-surface p-[22px]">
      <div className="mb-4 flex items-center gap-3">
        <Eyebrow>Negotiation thread</Eyebrow>
        <div className="h-px flex-1 bg-line" />
      </div>
      <div className="flex flex-col gap-4">
        {thread.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {reviewing && (
          <div className="pl-[52px] text-[13px] italic text-ink-faint">Vendor is reviewing…</div>
        )}
      </div>
    </div>
  );
}

function Bubble({ message: m }: { message: NegotiationMessage }) {
  const agent = m.author === 'agent';
  const vendor = m.author === 'vendor';
  const mark = agent ? 'P' : vendor ? 'V' : 'U';
  return (
    <div className={clsx('flex gap-3', agent ? 'flex-row' : 'flex-row')}>
      {/* monogram */}
      <div
        className={clsx(
          'grid h-10 w-10 shrink-0 place-items-center rounded-[10px] font-mono text-[15px] font-semibold',
          agent ? '' : 'border border-line bg-surface-2 text-ink-soft',
        )}
        style={
          agent
            ? { background: 'var(--color-brand-mark-bg)', color: 'var(--color-brand-mark)' }
            : undefined
        }
      >
        {mark}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            {agent ? 'Procur agent' : vendor ? 'Vendor' : 'You'}
          </span>
          {m.action && (
            <Chip tone={agent ? 'accent' : 'neutral'} mono className="text-[10px]">
              {m.action}
            </Chip>
          )}
          <span className="ml-auto font-mono text-[11px] text-ink-faint">{relTime(m.at)}</span>
        </div>
        <div
          className={clsx(
            'rounded-[11px] px-3.5 py-2.5 text-[13.5px] leading-relaxed',
            agent ? 'bg-accent-tint text-ink' : 'bg-surface-2 text-ink-soft',
          )}
        >
          {m.body}
        </div>
      </div>
    </div>
  );
}

// ── Levers ────────────────────────────────────────────────────────────────────
function LeversCard({ levers }: { levers: NegotiationLever[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-[18px]">
      <Eyebrow className="mb-3">Negotiation levers</Eyebrow>
      <ul className="flex flex-col gap-2.5">
        {levers.map((l, i) => (
          <LeverRow key={i} lever={l} />
        ))}
      </ul>
    </div>
  );
}

function LeverRow({ lever }: { lever: NegotiationLever }) {
  const cfg: Record<LeverState, { icon: string; iconCls: string; ring: string; resultCls: string }> = {
    secured: { icon: '✓', iconCls: 'text-positive', ring: 'border-positive-border bg-positive-bg', resultCls: 'text-positive' },
    in_play: { icon: '●', iconCls: 'text-accent', ring: 'border-accent bg-accent-tint', resultCls: 'text-accent' },
    queued: { icon: '○', iconCls: 'text-ink-faint', ring: 'border-line bg-surface-2', resultCls: 'text-ink-faint' },
    lost: { icon: '✗', iconCls: 'text-danger', ring: 'border-[#e8c8be] bg-[#f7e7e2]', resultCls: 'text-danger' },
  };
  const c = cfg[lever.state];
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={clsx(
          'mt-0.5 grid h-[20px] w-[20px] shrink-0 place-items-center rounded-full border text-[11px] font-semibold',
          c.ring,
          c.iconCls,
        )}
      >
        {c.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-ink-soft">{lever.label}</div>
        {lever.result && (
          <div className={clsx('font-mono text-[12px] font-medium tabular-nums', c.resultCls)}>
            {lever.result}
          </div>
        )}
      </div>
    </li>
  );
}

// ── Guardrails ────────────────────────────────────────────────────────────────
function GuardrailsCard({ guardrails }: { guardrails: Negotiation['guardrails'] }) {
  const rows: { label: string; value: string }[] = [];
  if (guardrails.maxBudget) rows.push({ label: 'Max budget', value: formatCompact(guardrails.maxBudget) });
  if (guardrails.maxTermMonths != null)
    rows.push({ label: 'Max term', value: `${guardrails.maxTermMonths} months` });
  if (guardrails.residency) rows.push({ label: 'Residency', value: guardrails.residency });
  if (guardrails.approver) rows.push({ label: 'Approver', value: guardrails.approver });

  return (
    <div className="rounded-xl border border-line bg-surface p-[18px]">
      <Eyebrow className="mb-3">Your guardrails</Eyebrow>
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between border-t border-line-soft py-2 first:border-0 first:pt-0"
          >
            <span className="text-[13px] text-ink-muted">{r.label}</span>
            <span className="font-mono text-[12px] font-medium text-ink tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function relTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
