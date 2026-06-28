import { notFound } from 'next/navigation';
import { getActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProductById } from '@/lib/graph';
import { toImplementationPlan } from '@/lib/lifecycle';
import { shortName } from '@/lib/score';
import { Eyebrow } from '@/components/primitives';
import { clsx } from '@/components/clsx';
import { ExportPlan } from '@/components/implementation/ExportPlan';
import { GoLiveChecklist } from '@/components/implementation/GoLiveChecklist';
import type {
  ImplementationPlan,
  ImplementationPhase,
  ImplementationRisk,
  ImplementationKPI,
  PhaseState,
} from '@/contracts/types';

export default async function ImplementationPage() {
  const actor = await getActor();
  // tenant-scoped: IMP-3301 is the seeded plan for org_falcon
  const row = await prisma.implementationPlan.findFirst({ where: { orgId: actor.orgId } });
  if (!row) notFound();
  const plan = toImplementationPlan(row);

  const product = await getProductById(plan.productId);
  const productName = product ? shortName(product.name) : plan.productId;

  return <PlanView plan={plan} productName={productName} />;
}

function PlanView({ plan, productName }: { plan: ImplementationPlan; productName: string }) {
  const openRisks = plan.risks.filter((r) => r.tone === 'warning' || r.tone === 'danger').length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow className="mb-1.5">Implementation plan · {productName}</Eyebrow>
          <h1 className="font-serif text-[24px] font-medium text-ink">Phased rollout &amp; go-live</h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            Migrating from {plan.fromSystem} · {plan.totalWeeks}-week plan
            {plan.partner ? ` · delivered with ${plan.partner.name}` : ''}
          </p>
        </div>
        <ExportPlan id={plan.id} />
      </div>

      {/* Stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Timeline" value={`${plan.totalWeeks} wks`} />
        <Stat label="Milestones" value={`${plan.milestonesDone}/${plan.milestonesTotal} done`} />
        <Stat label="Open risks" value={String(openRisks)} tone="warning" />
        <Stat label="Partner" value={plan.partner?.name ?? '—'} />
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 gap-[26px] lg:grid-cols-[1fr_320px]">
        {/* Left: timeline */}
        <div className="rounded-xl border border-line bg-surface p-[22px]">
          <div className="mb-5 flex items-center gap-3">
            <Eyebrow>Phased rollout</Eyebrow>
            <div className="h-px flex-1 bg-line" />
          </div>
          <Timeline phases={plan.phases} />
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-4">
          <RisksCard risks={plan.risks} />
          <KpisCard kpis={plan.kpis} />
          <div className="rounded-xl border border-line bg-surface p-[18px]">
            <Eyebrow className="mb-2">Go-live checklist</Eyebrow>
            <GoLiveChecklist id={plan.id} items={plan.goLiveChecklist} />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-[16px]">
      <Eyebrow>{label}</Eyebrow>
      <div
        className={clsx(
          'mt-1.5 font-mono text-[20px] font-semibold tracking-[-0.02em] tabular-nums',
          tone === 'warning' ? 'text-warning' : 'text-ink',
        )}
      >
        {value}
      </div>
    </div>
  );
}

// ── Timeline ──────────────────────────────────────────────────────────────────
function Timeline({ phases }: { phases: ImplementationPhase[] }) {
  return (
    <ol className="flex flex-col">
      {phases.map((p, i) => (
        <PhaseRow key={i} phase={p} last={i === phases.length - 1} />
      ))}
    </ol>
  );
}

function PhaseRow({ phase, last }: { phase: ImplementationPhase; last: boolean }) {
  const cfg: Record<PhaseState, { node: string; nodeCls: string; line: string }> = {
    done: { node: '✓', nodeCls: 'border-positive bg-positive text-white', line: 'bg-positive' },
    active: { node: '●', nodeCls: 'border-accent bg-accent text-white', line: 'bg-line' },
    pending: { node: '', nodeCls: 'border-line-strong bg-surface text-transparent', line: 'bg-line' },
  };
  const c = cfg[phase.state];
  return (
    <li className="flex gap-4">
      {/* node + connector */}
      <div className="flex flex-col items-center">
        <span
          className={clsx(
            'grid h-[24px] w-[24px] shrink-0 place-items-center rounded-full border-[1.5px] text-[12px] font-semibold leading-none',
            c.nodeCls,
          )}
        >
          {c.node}
        </span>
        {!last && <span className={clsx('w-[2px] flex-1', c.line)} style={{ minHeight: 28 }} />}
      </div>
      {/* content */}
      <div className={clsx('min-w-0 flex-1', last ? 'pb-0' : 'pb-6')}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={clsx(
              'font-serif text-[16px] font-medium',
              phase.state === 'pending' ? 'text-ink-muted' : 'text-ink',
            )}
          >
            {phase.name}
          </span>
          <span className="font-mono text-[11px] text-ink-faint">{phase.weekRange}</span>
        </div>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{phase.detail}</p>
        {phase.state === 'active' && phase.progressPct != null && (
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-accent-track">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${Math.max(0, Math.min(100, phase.progressPct))}%` }}
              />
            </div>
            <span className="font-mono text-[11px] font-semibold text-accent tabular-nums">
              {phase.progressPct}%
            </span>
          </div>
        )}
      </div>
    </li>
  );
}

// ── Risks ─────────────────────────────────────────────────────────────────────
function RisksCard({ risks }: { risks: ImplementationRisk[] }) {
  const border: Record<ImplementationRisk['tone'], string> = {
    warning: 'border-l-warning-bar',
    danger: 'border-l-danger',
    positive: 'border-l-positive',
  };
  return (
    <div className="rounded-xl border border-line bg-surface p-[18px]">
      <Eyebrow className="mb-3">Risks</Eyebrow>
      <ul className="flex flex-col gap-2.5">
        {risks.map((r, i) => (
          <li
            key={i}
            className={clsx('rounded-[8px] border-l-[3px] bg-surface-2 px-3 py-2', border[r.tone])}
          >
            <div className="text-[13px] font-medium text-ink">{r.title}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{r.detail}</div>
            {r.owner && (
              <div className="mt-1 font-mono text-[11px] text-ink-faint">Owner · {r.owner}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
function KpisCard({ kpis }: { kpis: ImplementationKPI[] }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-[18px]">
      <Eyebrow className="mb-2">Success KPIs</Eyebrow>
      <ul className="flex flex-col">
        {kpis.map((k, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 border-t border-line-soft py-2 first:border-0 first:pt-0"
          >
            <span className="text-[13px] text-ink-soft">{k.label}</span>
            <span className="shrink-0 font-mono text-[12px] font-medium text-ink tabular-nums">
              {k.target}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
