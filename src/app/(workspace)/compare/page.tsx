import Link from 'next/link';
import { getOrgContext } from '@/lib/data';
import { getCandidatesByIds, listProducts } from '@/lib/graph';
import { rankCandidates } from '@/lib/ranker';
import { buildComparison } from '@/lib/compare';
import { resolveComputeRegion } from '@/lib/residency';
import { computeTCO } from '@/lib/tco';
import { Card, Eyebrow, Monogram } from '@/components/primitives';
import { ProvenanceMark } from '@/components/Provenance';
import { formatCompact } from '@/lib/money';
import { monogram } from '@/lib/score';
import type { TCOCategory, Money } from '@/contracts/types';
import { clsx } from '@/components/clsx';

const CAT_LABEL: Record<TCOCategory, string> = {
  licenses: 'Licenses', implementation: 'Implementation', integrations: 'Integrations',
  training: 'Training', internal_labor: 'Internal labor', support_renewal: 'Support & renewal',
  hardware: 'Hardware', cloud: 'Cloud', custom_dev: 'Custom dev', maintenance: 'Maintenance',
};
const TONE: Record<string, string> = {
  positive: 'text-positive', warning: 'text-warning', danger: 'text-danger', neutral: 'text-ink-soft',
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const { actor, profile } = await getOrgContext();

  let requested = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (requested.length < 2) {
    const all = await listProducts({ category: 'erp' });
    requested = all.map((p) => p.id); // a meaningful committee comparison needs the field
  }

  const fromSystem = profile.currentStack.accounting ?? profile.currentStack.erp;
  const candidates = await getCandidatesByIds(requested, fromSystem);
  const region = resolveComputeRegion(actor);
  const ranked = rankCandidates(candidates, profile, region, profile.employees);
  const matrix = buildComparison(ranked, profile);

  const top = ranked[0];
  const tco = computeTCO({ product: top.product, seats: profile.employees, region, horizonYears: 5 }, profile);
  const cum = tco.cumulativeByYear;
  const y5 = cum[cum.length - 1]?.amount ?? 1;

  const cols = matrix.columns;
  const gridCols = `160px repeat(${cols.length}, 1fr)`;

  return (
    <div>
      <Link href="/copilot/PR-2291" className="mb-3 inline-block text-[13px] font-semibold text-accent hover:underline">
        ← Back to copilot answer
      </Link>
      <h1 className="font-serif text-[24px] font-medium text-ink">Comparison &amp; 5-year true cost of ownership</h1>
      <p className="mb-5 mt-1 text-[14px] text-ink-muted">Not just features — the dimensions a procurement committee actually weighs.</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.55fr_1fr]">
        {/* Comparison matrix */}
        <Card className="overflow-hidden p-0">
          {/* header */}
          <div className="grid border-b border-line bg-surface-2" style={{ gridTemplateColumns: gridCols }}>
            <div className="flex items-end p-3">
              <Eyebrow>Dimension</Eyebrow>
            </div>
            {cols.map((c) => (
              <div key={c.productId} className={clsx('flex flex-col items-center gap-1 border-l border-line p-3 text-center', c.isTopPick && 'bg-accent-tint2')}>
                <Monogram letter={monogram(c.name)} size={30} />
                <div className="font-serif text-[15px] font-medium text-ink">{c.name}</div>
                <div className={clsx('font-mono text-[9px] font-semibold uppercase tracking-wide', c.isTopPick ? 'text-accent' : 'text-ink-faint')}>
                  {c.tag}
                </div>
              </div>
            ))}
          </div>
          {/* rows */}
          {matrix.rows.map((row, ri) => (
            <div key={row.dimension} className={clsx('grid items-center', ri % 2 === 1 && 'bg-surface-2')} style={{ gridTemplateColumns: gridCols }}>
              <div className="p-3 text-[13px] text-ink-muted">{row.dimension}</div>
              {row.cells.map((cell) => {
                const col = cols.find((c) => c.productId === cell.productId);
                return (
                  <div key={cell.productId} className={clsx('border-l border-line-soft p-3 text-center font-mono text-[13px] font-semibold tabular-nums', TONE[cell.tone], col?.isTopPick && 'bg-accent-faint')}>
                    {cell.display}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line p-3 text-[12px]">
            <span className="text-ink-fainter">+ Add a 4th product</span>
            <span className="font-semibold text-accent">See full 5-yr TCO →</span>
          </div>
        </Card>

        {/* TCO panel */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-line p-[18px]">
            <h2 className="font-serif text-[18px] font-medium text-ink">{matrix.columns[0]?.name} · 5-yr TCO</h2>
            <div className="font-mono text-[12px] text-ink-faint">{profile.employees} seats · {profile.city ?? region}</div>
          </div>

          {/* line items */}
          <div className="p-[18px]">
            <div className="grid border-b border-line-soft pb-1.5" style={{ gridTemplateColumns: '1fr 52px 52px 52px' }}>
              <Eyebrow>Line item</Eyebrow>
              {['Y1', 'Y3', 'Y5'].map((y) => (
                <div key={y} className="text-right font-mono text-[10px] uppercase tracking-wide text-ink-faint">{y}</div>
              ))}
            </div>
            {tco.lines.map((line) => (
              <div key={line.category} className="grid items-center border-b border-line-soft py-2 last:border-0" style={{ gridTemplateColumns: '1fr 52px 52px 52px' }}>
                <span className={clsx('flex items-center text-[13px]', line.category === 'support_renewal' ? 'text-warning' : 'text-ink-soft')}>
                  {CAT_LABEL[line.category]}
                  <ProvenanceMark label={CAT_LABEL[line.category]} provenance={line.provenance} />
                </span>
                {[0, 2, 4].map((yi) => (
                  <Cell key={yi} m={line.byYear[yi]} />
                ))}
              </div>
            ))}
          </div>

          {/* cumulative bars + callout */}
          <div className="bg-surface-2 p-[18px]">
            <Eyebrow className="mb-3">Cumulative spend</Eyebrow>
            <div className="flex flex-col gap-2.5">
              {[{ y: 'Year 1', i: 0 }, { y: 'Year 3', i: 2 }, { y: 'Year 5', i: 4 }].map(({ y, i }) => {
                const m = cum[i] ?? cum[cum.length - 1];
                const pct = Math.round((m.amount / y5) * 100);
                return (
                  <div key={y} className="flex items-center gap-2">
                    <span className="w-12 font-mono text-[10px] text-ink-faint">{y}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right font-mono text-[12px] font-semibold text-ink-soft tabular-nums">{formatCompact(m)}</span>
                    <span className="w-9 text-right font-mono text-[11px] text-ink-faint">{pct}%</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-line border-l-[3px] border-l-warning-bar bg-surface p-3.5">
              <div className="font-serif text-[15px] font-medium text-ink">
                Licenses are only {tco.licenseSharePct}% of true cost.
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                The other {100 - tco.licenseSharePct}% is implementation, integrations, training, internal labor and
                support/renewal — the line items a sticker price hides. Every figure here is computed from the product&apos;s
                sourced pricing and your profile; hover the ⓘ on any line to see where it came from.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Cell({ m }: { m?: Money }) {
  if (!m || m.amount === 0) return <span className="text-right font-mono text-[12px] text-[#c9c3b7]">—</span>;
  return <span className="text-right font-mono text-[12px] text-ink-soft tabular-nums">{formatCompact(m)}</span>;
}
