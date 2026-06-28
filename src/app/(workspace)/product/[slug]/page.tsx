import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActor } from '@/lib/auth';
import { getProductBySlug } from '@/lib/graph';
import { Card, Chip, Eyebrow, Monogram, LabeledBar } from '@/components/primitives';
import { ProvenanceMark } from '@/components/Provenance';
import { AddToCompare } from '@/components/AddToCompare';
import { gradeOf, shortName, monogram } from '@/lib/score';
import { formatMoney } from '@/lib/money';
import type { Money } from '@/contracts/types';

const TABS = ['Overview', 'Pricing', 'Technical & security', 'Integrations', 'Reviews 2.0'];

export default async function ProductProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await getActor(); // RBAC: any authenticated member can read the graph
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const v = p.vendor;
  const certs = p.technical.certifications;
  const perSeat = p.pricing.lines.find((l) => l.dimension === 'per_seat');
  const impl = p.pricing.lines.find((l) => l.dimension === 'implementation');
  const uplift = p.pricing.renewalUpliftPctPerYear;

  return (
    <div>
      <Link href="/copilot/PR-2291" className="mb-4 inline-block text-[13px] font-semibold text-accent hover:underline">
        ← Back to copilot answer
      </Link>

      {/* Header card */}
      <Card className="mb-5 p-[22px]">
        <div className="flex flex-wrap items-start gap-5">
          <Monogram letter={monogram(p.name)} size={60} />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[26px] font-medium leading-tight text-ink">{shortName(p.name)}</h1>
            <div className="mt-1.5 font-mono text-[12px] leading-relaxed text-ink-faint">
              {v.name} · {ownershipLabel(v.ownership, v.ticker)} · Founded {v.foundedYear}
              {v.employees && <> · {v.employees.value.toLocaleString()} employees</>}
              {' '}· {p.regionsServed.join('/')} region
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="font-serif text-[28px] font-medium text-positive">{gradeOf(p.aiScore.overall)}</div>
              <Eyebrow>AI score</Eyebrow>
            </div>
            {p.ratingAvg != null && (
              <div className="text-center">
                <div className="font-mono text-[26px] font-semibold text-ink">{p.ratingAvg.toFixed(1)}</div>
                <Eyebrow>{formatCount(p.ratingCount)} reviews</Eyebrow>
              </div>
            )}
            <AddToCompare productId={p.id} />
          </div>
        </div>
      </Card>

      {/* Tab bar */}
      <div className="mb-5 flex gap-6 border-b border-line">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            disabled={i !== 0}
            className={
              i === 0
                ? 'border-b-[2.5px] border-accent pb-2.5 text-[14px] font-semibold text-ink'
                : 'cursor-not-allowed pb-2.5 text-[14px] text-ink-fainter'
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* Attribute grid 2×2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* PRODUCT */}
        <Card className="p-[20px]">
          <Eyebrow className="mb-3">Product</Eyebrow>
          <Rows
            rows={[
              ['Editions', p.editions.map((e) => e.name).join(' / ')],
              ['Deployment', p.deployment.map(cap).join(' · ')],
              ['Mobile / Offline', `${[p.apps.ios && 'iOS', p.apps.android && 'Android'].filter(Boolean).join(', ')}${p.apps.offline ? ' · Offline ✓' : ''}`],
              ['Languages', `${p.languages.length} · incl. ${p.languages.includes('ar') ? 'Arabic' : p.languages[0]}`],
              ['Release cadence', p.releaseCadencePerYear ? `${p.releaseCadencePerYear}× / year` : '—'],
            ]}
          />
        </Card>

        {/* TECHNICAL & COMPLIANCE */}
        <Card className="p-[20px]">
          <Eyebrow className="mb-3">Technical &amp; compliance</Eyebrow>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {certs.map((c, i) => (
              <span key={i} className="inline-flex items-center">
                <Chip tone="positive">{String(c.value)}</Chip>
                <ProvenanceMark label={String(c.value)} provenance={c.provenance} />
              </span>
            ))}
            {p.technical.dataResidency.includes('UAE') && <Chip tone="positive">UAE residency</Chip>}
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {p.technical.auth.includes('SSO_SAML') && <Chip>SSO · SAML</Chip>}
            {p.technical.auth.includes('SCIM') && <Chip>SCIM</Chip>}
            <Chip>{p.technical.apis.join(' · ')}</Chip>
          </div>
          <Rows
            rows={[
              ['SLA', p.sla ? `${p.sla.value}% uptime` : '—', p.sla?.provenance],
              ['Data residency', p.technical.dataResidency.join(', ')],
              ['Encryption', [p.technical.encryption.atRest && 'at rest', p.technical.encryption.inTransit && 'in transit', p.technical.encryption.cmek && 'CMEK'].filter(Boolean).join(', ')],
            ]}
          />
        </Card>

        {/* PRICING MODELS */}
        <Card className="p-[20px]">
          <Eyebrow className="mb-3">Pricing models</Eyebrow>
          <Rows
            rows={[
              ['Per seat', perSeat ? rangeLabel(perSeat.rangeLow, perSeat.rangeHigh, perSeat.unit) : '—', perSeat?.provenance],
              ['Implementation', impl?.amount ? `${impl.notes ? 'from ' : ''}${formatMoney(impl.amount)}` : '—', impl?.provenance],
            ]}
          />
          <div className="mt-3 flex flex-col gap-2 border-t border-line-soft pt-3">
            {uplift && (
              <div className="flex items-center gap-2 text-[13px] text-warning">
                <span>⚠</span> Renewal uplift {uplift.value}% / yr
                <ProvenanceMark label="renewal uplift" provenance={uplift.provenance} />
              </div>
            )}
            {p.pricing.minimumCommitment && (
              <div className="flex items-center gap-2 text-[13px] text-warning">
                <span>⚠</span> Min. commitment: {p.pricing.minimumCommitment.seats} seats · {p.pricing.minimumCommitment.termMonths} mo
              </div>
            )}
          </div>
        </Card>

        {/* AI SCORE BREAKDOWN */}
        <Card className="p-[20px]">
          <Eyebrow className="mb-3">AI score breakdown</Eyebrow>
          <div className="flex flex-col gap-3">
            <LabeledBar label="AI agents & automation" value={String(p.aiScore.agentsAndAutomation)} pct={p.aiScore.agentsAndAutomation} />
            <LabeledBar label="Predictive analytics" value={String(p.aiScore.predictiveAnalytics)} pct={p.aiScore.predictiveAnalytics} />
            <LabeledBar label="Workflow / prompt UX" value={String(p.aiScore.workflowPromptUX)} pct={p.aiScore.workflowPromptUX} />
          </div>
          <div className="mt-3 border-t border-line-soft pt-2 font-mono text-[10px] text-ink-faint">
            methodology {p.aiScore.methodologyVersion}
          </div>
        </Card>
      </div>

      {/* Integrations strip */}
      <Card className="mt-4 p-[20px]">
        <Eyebrow className="mb-3">Integrations · {p.integrations.length}+</Eyebrow>
        <div className="flex flex-wrap gap-1.5">
          {p.integrations.map((i) => (
            <Chip key={i.targetId} tone={i.certified ? 'positive' : 'neutral'}>
              {i.name}
              {i.certified ? ' ✓' : ''}
            </Chip>
          ))}
          <span className="inline-flex items-center rounded-[5px] border border-dashed border-line-strong px-2 py-[3px] text-[12px] text-ink-faint">
            + more
          </span>
        </div>
      </Card>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function Rows({ rows }: { rows: [string, string, unknown?][] }) {
  return (
    <div className="flex flex-col">
      {rows.map(([label, value, prov], i) => (
        <div key={i} className="flex items-start justify-between gap-4 border-t border-line-soft py-2 text-[13px] first:border-0 first:pt-0">
          <span className="text-ink-faint">{label}</span>
          <span className="flex items-center text-right font-medium text-ink-soft">
            {value}
            {Array.isArray(prov) && prov.length > 0 && <ProvenanceMark label={label} provenance={prov as never} />}
          </span>
        </div>
      ))}
    </div>
  );
}

function ownershipLabel(o: string, ticker?: string): string {
  const base = o === 'public' ? 'Public' : o === 'pe_backed' ? 'PE-backed' : o === 'private' ? 'Private' : o;
  return ticker ? `${base} (${ticker})` : base;
}
function cap(s: string): string {
  return s.replace('_', '-').replace(/^\w/, (c) => c.toUpperCase());
}
function rangeLabel(lo?: Money, hi?: Money, unit?: string): string {
  if (!lo) return '—';
  const u = unit ? ` / ${unit}` : '';
  return hi ? `${formatMoney(lo)} – ${formatMoney(hi)}${u}` : `${formatMoney(lo)}${u}`;
}
function formatCount(n?: number): string {
  if (!n) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}
