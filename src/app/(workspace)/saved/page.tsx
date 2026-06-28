import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/data';
import { toSavedSearch, toWatchItem } from '@/lib/serialize';
import { getProductById } from '@/lib/graph';
import { computeTCO } from '@/lib/tco';
import { resolveComputeRegion } from '@/lib/residency';
import { Card, Eyebrow, Chip, Figure } from '@/components/primitives';
import { SavedSearchRow } from '@/components/saved/SavedSearchRow';
import { gradeOf, shortName } from '@/lib/score';
import { formatCompact } from '@/lib/money';
import { clsx } from '@/components/clsx';

export default async function SavedPage() {
  const { actor, profile } = await getOrgContext();
  const region = resolveComputeRegion(actor);

  const [searchRows, watchRows] = await Promise.all([
    prisma.savedSearch.findMany({ where: { orgId: actor.orgId }, orderBy: { lastRunAt: 'desc' } }),
    prisma.watchItem.findMany({ where: { orgId: actor.orgId }, orderBy: { addedAt: 'desc' } }),
  ]);
  const searches = searchRows.map(toSavedSearch);
  const watch = watchRows.map(toWatchItem);

  const watchRowsData = [];
  for (const w of watch) {
    const p = await getProductById(w.productId);
    if (!p) continue;
    const tco = computeTCO({ product: p, seats: profile.employees, region, horizonYears: 5 }, profile);
    watchRowsData.push({ item: w, name: shortName(p.name), grade: gradeOf(p.aiScore.overall), tco: tco.total });
  }

  const toneCls: Record<string, string> = { positive: 'text-positive', warning: 'text-warning', danger: 'text-danger' };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[24px] font-medium text-ink">Saved searches &amp; watchlist</h1>
          <p className="mt-1 text-[14px] text-ink-muted">Re-run a procurement query any time, or get alerted when the market moves.</p>
        </div>
        <Link href="/copilot/PR-2291" className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-dark">
          ＋ New search
        </Link>
      </div>

      <Eyebrow className="mb-3">Saved searches</Eyebrow>
      <div className="mb-8 flex flex-col gap-3">
        {searches.map((s) => (
          <SavedSearchRow key={s.id} search={s} />
        ))}
      </div>

      <Eyebrow className="mb-3">Watchlist</Eyebrow>
      <Card className="overflow-hidden p-0">
        <div className="grid border-b border-line bg-surface-2 px-4 py-2.5" style={{ gridTemplateColumns: '1fr 120px 130px 150px' }}>
          {['Product', 'AI score', '5-yr TCO', 'Signal'].map((h) => (
            <Eyebrow key={h}>{h}</Eyebrow>
          ))}
        </div>
        {watchRowsData.map((r) => (
          <div key={r.item.id} className="grid items-center border-b border-line-soft px-4 py-3 last:border-0" style={{ gridTemplateColumns: '1fr 120px 130px 150px' }}>
            <span className="font-serif text-[15px] font-medium text-ink">{r.name}</span>
            <Chip tone="positive" className="w-fit">{r.grade}</Chip>
            <Figure className="text-[14px]">{formatCompact(r.tco)}</Figure>
            <span className={clsx('font-mono text-[12px] font-medium', toneCls[r.item.signal?.tone ?? 'warning'])}>
              {r.item.signal?.display}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
