import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getActor } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getProductById } from '@/lib/graph';
import { formatCompact } from '@/lib/money';
import { gradeOf, shortName, monogram } from '@/lib/score';
import { Eyebrow, FitRing, Monogram, Chip, Figure } from '@/components/primitives';
import { ProvenanceMark } from '@/components/Provenance';
import { ReasoningTrace } from '@/components/copilot/ReasoningTrace';
import { SendShare } from '@/components/copilot/SendShare';
import { TakeAction } from '@/components/copilot/TakeAction';
import { AskBox } from '@/components/copilot/AskBox';
import { StreamingView } from '@/components/copilot/StreamingView';
import type { ProductWithVendor } from '@/contracts/graph';
import type { Recommendation, ProcurementBrief } from '@/contracts/types';

export default async function CopilotPage({ params }: { params: Promise<{ briefId: string }> }) {
  const { briefId } = await params;
  const actor = await getActor();
  // tenant-scoped row fetch — also tells us whether generation is still pending
  const row = await prisma.brief.findFirst({ where: { id: briefId, orgId: actor.orgId } });
  if (!row) notFound();
  const payload = row.payload as unknown as ProcurementBrief;
  const ready = row.status === 'ready' && Array.isArray(payload?.shortlist) && payload.shortlist.length > 0;

  return (
    <div>
      <AskBox />
      {ready ? <BriefView brief={payload} /> : <StreamingView briefId={briefId} query={row.query} />}
    </div>
  );
}

async function BriefView({ brief }: { brief: ProcurementBrief }) {
  // hydrate product display info for the shortlist
  const products = new Map<string, ProductWithVendor>();
  for (const r of brief.shortlist) {
    const p = await getProductById(r.productId);
    if (p) products.set(r.productId, p);
  }

  const top = brief.shortlist.find((r) => r.isTopPick) ?? brief.shortlist[0];
  const alts = brief.shortlist.filter((r) => r !== top);
  const compareHref = `/compare?ids=${brief.shortlist.map((r) => r.productId).join(',')}`;

  const mail = buildMail(brief.request.id, brief, products);

  return (
    <div>
      {/* Question header */}
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-1 shrink-0 rounded-[6px] border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] font-medium text-ink-muted">
          {brief.request.id}
        </span>
        <h1 className="font-serif text-[26px] font-normal leading-[1.32] tracking-[-0.01em] text-ink">
          &ldquo;{brief.request.query}&rdquo;
        </h1>
      </div>

      {/* Status row */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-positive animate-pulse-dot" />
          Answer ready
        </span>
        <span className="text-line-strong">·</span>
        <span className="font-mono">
          Scanned {brief.scanned.toLocaleString()} products → {brief.viable} viable → {brief.shortlist.length} recommended
        </span>
        <span className="text-line-strong">·</span>
        <ReasoningTrace steps={brief.reasoning} />
      </div>

      {/* Lead paragraph */}
      <p className="mb-8 max-w-[760px] font-serif text-[18px] leading-[1.6] text-[#3a362f]">{brief.summary}</p>

      <div className="grid grid-cols-1 gap-[26px] lg:grid-cols-[1fr_312px]">
        {/* Left column */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Eyebrow>Recommended shortlist</Eyebrow>
            <div className="h-px flex-1 bg-line" />
          </div>

          {top && products.get(top.productId) && (
            <TopPickCard rec={top} product={products.get(top.productId)!} region={brief.region} />
          )}

          <div className="mt-4 flex flex-col gap-3">
            {alts.map((r) => {
              const p = products.get(r.productId);
              if (!p) return null;
              return <AltCard key={r.productId} rec={r} product={p} />;
            })}
          </div>
        </div>

        {/* Right rail */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start">
          <ConfidenceCard brief={brief} />
          <TakeAction compareHref={compareHref} />
          <SendShare briefId={brief.request.id} subject={mail.subject} body={mail.body} />
        </aside>
      </div>
    </div>
  );
}

// ── Top-pick card ─────────────────────────────────────────────────────────────
function TopPickCard({ rec, product, region }: { rec: Recommendation; product: ProductWithVendor; region: string }) {
  const tco = rec.tco;
  const y = tco.cumulativeByYear;
  const maxC = Math.max(...y.map((m) => m.amount), 1);
  const bars = [
    { label: 'Y1', m: y[0] },
    { label: 'Y3', m: y[2] ?? y[y.length - 1] },
    { label: 'Y5', m: y[4] ?? y[y.length - 1] },
  ];

  return (
    <div className="relative overflow-hidden rounded-xl border-[1.5px] border-accent bg-surface shadow-[0_6px_20px_rgba(23,84,94,.08)]">
      <div className="h-1 w-full bg-accent" />
      <div className="p-[22px]">
        {/* header */}
        <div className="flex items-start gap-4">
          <Monogram letter={monogram(product.name)} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-[19px] font-medium text-ink">{shortName(product.name)}</h3>
              <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white">
                Top pick
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[12px] text-ink-faint">
              {product.vendor.name} · {product.editions.map((e) => e.name).join('/')} · {product.regionsServed.join(' · ')}
            </div>
          </div>
          <FitRing score={rec.fitScore} />
        </div>

        {/* signal chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip tone="positive">⏱ {rec.implementationWeeks}-week go-live</Chip>
          {rec.residencyOk ? (
            <Chip tone="positive">✓ {region} data residency</Chip>
          ) : (
            <Chip tone="danger">✗ residency risk</Chip>
          )}
          {rec.migration && (
            <Chip tone={rec.migration.difficulty === 'low' ? 'positive' : rec.migration.difficulty === 'medium' ? 'warning' : 'danger'}>
              ◐ Migration: {rec.migration.difficulty}
            </Chip>
          )}
          {rec.localPartners.length > 0 && <Chip tone="accent">⊞ {rec.localPartners.length} {region} partners</Chip>}
        </div>

        {/* two-column body */}
        <div className="mt-5 grid grid-cols-1 gap-6 border-t border-line pt-5 sm:grid-cols-[200px_1fr]">
          <div>
            <div className="flex items-center">
              <Figure className="text-[28px]">{formatCompact(tco.total)}</Figure>
              <ProvenanceMark label="5-yr TCO" provenance={tco.lines.flatMap((l) => l.provenance).slice(0, 4)} />
            </div>
            <Eyebrow className="mt-0.5">5-yr TCO</Eyebrow>
            <div className="mt-3 flex flex-col gap-2">
              {bars.map((b) => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="w-5 font-mono text-[10px] text-ink-faint">{b.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(b.m.amount / maxC) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-ink-soft tabular-nums">{formatCompact(b.m)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Eyebrow className="mb-2">Why it wins</Eyebrow>
            <ul className="flex flex-col gap-2">
              {rec.reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink-soft">
                  <span className="text-accent">›</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* actions */}
        <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-4">
          <Link
            href={`/product/${product.slug}`}
            className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-dark"
          >
            View full profile →
          </Link>
          <Link
            href={`/compare?ids=${rec.productId}`}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-[#f7f5f0]"
          >
            Add to comparison
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Alternative card ──────────────────────────────────────────────────────────
function AltCard({ rec, product }: { rec: Recommendation; product: ProductWithVendor }) {
  const over = !rec.residencyOk;
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex items-center gap-4 rounded-[11px] border border-line bg-surface p-4 transition hover:border-line-strong"
    >
      <Monogram letter={monogram(product.name)} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[16px] font-medium text-ink">{shortName(product.name)}</span>
          <span className="font-mono text-[11px] text-ink-faint">{rec.fitScore} fit</span>
        </div>
        <div className="truncate text-[13px] text-ink-muted">{rec.tradeoff}</div>
      </div>
      <div className="text-right">
        <Figure className="text-[15px]" tone={over ? 'danger' : 'ink'}>
          {formatCompact(rec.tco.total)}
        </Figure>
        <Eyebrow>5-yr TCO</Eyebrow>
      </div>
      <span className="text-[18px] text-ink-fainter transition group-hover:text-accent">›</span>
    </Link>
  );
}

// ── Confidence & sources card ─────────────────────────────────────────────────
function ConfidenceCard({ brief }: { brief: { confidence: string; viable: number; sources: { label: string; count: number | string }[] } }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-[18px]">
      <Eyebrow>Confidence</Eyebrow>
      <div className="mt-1 flex items-baseline gap-2">
        <Figure className="text-[30px]">{brief.confidence}</Figure>
        <span className="text-[12px] text-ink-faint">· {brief.viable} candidates modeled</span>
      </div>
      <Eyebrow className="mb-2 mt-4">Sources</Eyebrow>
      <ul className="flex flex-col gap-1.5">
        {brief.sources.map((s, i) => (
          <li key={i} className="flex items-center justify-between border-t border-line-soft pt-1.5 first:border-0 first:pt-0">
            <span className="text-[13px] text-ink-soft">{s.label}</span>
            <span className="font-mono text-[12px] font-medium text-ink tabular-nums">
              {typeof s.count === 'number' ? s.count.toLocaleString() : s.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── mailto body (DESIGN_SPEC §6 send & share) ────────────────────────────────
function buildMail(
  id: string,
  brief: { shortlist: Recommendation[]; region: string },
  products: Map<string, ProductWithVendor>,
) {
  const top = brief.shortlist.find((r) => r.isTopPick) ?? brief.shortlist[0];
  const tp = products.get(top.productId);
  const subject = `Procurement brief ${id} — ${tp ? shortName(tp.name) : 'recommendation'}`;
  const lines = [
    `Procurement brief ${id}`,
    '',
    `TOP PICK: ${tp ? shortName(tp.name) : top.productId} — ${top.fitScore} fit`,
    `  5-yr TCO ${formatCompact(top.tco.total)} · ${top.implementationWeeks}-wk go-live · ${top.residencyOk ? `${brief.region} residency ✓` : 'residency risk'} · ${top.localPartners.length} local partners`,
    '',
    'ALTERNATIVES:',
    ...brief.shortlist
      .filter((r) => r !== top)
      .map((r) => {
        const p = products.get(r.productId);
        return `  • ${p ? shortName(p.name) : r.productId} — ${r.fitScore} fit · ${formatCompact(r.tco.total)} · ${r.tradeoff ?? ''}`;
      }),
  ];
  return { subject, body: lines.join('\n') };
}
