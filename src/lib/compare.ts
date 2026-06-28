import type { ComparisonMatrix, ComparisonColumn, ComparisonRow, BusinessProfile } from '@/contracts/types';
import type { RankedItem } from './ranker';
import { formatCompact } from './money';
import { partnersFor } from './partners';

type Tone = 'positive' | 'warning' | 'danger' | 'neutral';

function aiDots(overall: number): string {
  const filled = Math.round(overall / 20); // 0..5
  return '●'.repeat(filled) + '○'.repeat(Math.max(0, 5 - filled));
}

function exitDifficulty(item: RankedItem): { label: string; tone: Tone } {
  // Heuristic, deterministic: longer minimum term + on-prem + heavy custom code = harder exit.
  const term = item.product.pricing.minimumCommitment?.termMonths ?? 12;
  const onPrem = item.product.deployment.includes('on_prem');
  const custom = item.migration?.impacted.customCode ?? 0;
  const score = term / 12 + (onPrem ? 1.5 : 0) + custom * 0.3;
  if (score >= 4) return { label: 'High', tone: 'danger' };
  if (score >= 2.2) return { label: 'Medium', tone: 'warning' };
  return { label: 'Low', tone: 'positive' };
}

export function buildComparison(ranked: RankedItem[], profile: BusinessProfile): ComparisonMatrix {
  const columns: ComparisonColumn[] = ranked.map((r, i) => ({
    productId: r.product.id,
    name: r.product.name.split(' — ')[0],
    tag: i === 0 ? 'top pick' : r.residencyOk ? 'in-region' : 'value',
    isTopPick: i === 0,
  }));

  const minTotal = Math.min(...ranked.map((r) => r.tco.total.amount));
  const maxTotal = Math.max(...ranked.map((r) => r.tco.total.amount));

  const costRow: ComparisonRow = {
    dimension: '5-yr total cost',
    cells: ranked.map((r) => ({
      productId: r.product.id,
      display: formatCompact(r.tco.total),
      tone: r.tco.total.amount === minTotal ? 'positive' : r.tco.total.amount === maxTotal ? 'danger' : 'neutral',
    })),
  };

  const implRow: ComparisonRow = {
    dimension: 'Implementation',
    cells: ranked.map((r) => {
      const w = r.migration?.estWeeks ?? 0;
      const tone: Tone = w <= 12 ? 'positive' : w <= 18 ? 'warning' : 'danger';
      return { productId: r.product.id, display: `${w} wk`, tone };
    }),
  };

  const aiRow: ComparisonRow = {
    dimension: 'AI readiness',
    cells: ranked.map((r) => ({
      productId: r.product.id,
      display: aiDots(r.product.aiScore.overall),
      tone: 'neutral' as Tone,
    })),
  };

  const migRow: ComparisonRow = {
    dimension: 'Migration difficulty',
    cells: ranked.map((r) => {
      const d = r.migration?.difficulty ?? 'low';
      const tone: Tone = d === 'low' ? 'positive' : d === 'medium' ? 'warning' : 'danger';
      const label = d.charAt(0).toUpperCase() + d.slice(1);
      return { productId: r.product.id, display: label, tone };
    }),
  };

  const residencyLabel = (profile.dataResidencyRequired ?? ['UAE'])[0] ?? 'UAE';
  const resRow: ComparisonRow = {
    dimension: `${residencyLabel} residency`,
    cells: ranked.map((r) => ({
      productId: r.product.id,
      display: r.residencyOk ? '✓' : '✗',
      tone: r.residencyOk ? 'positive' : 'danger',
    })),
  };

  const partnerRow: ComparisonRow = {
    dimension: 'Local partners',
    cells: ranked.map((r) => {
      const n = r.residencyOk ? partnersFor(residencyLabel as never).length : 0;
      return { productId: r.product.id, display: String(n), tone: n > 0 ? 'positive' : 'warning' };
    }),
  };

  const exitRow: ComparisonRow = {
    dimension: 'Exit difficulty',
    cells: ranked.map((r) => {
      const e = exitDifficulty(r);
      return { productId: r.product.id, display: e.label, tone: e.tone };
    }),
  };

  return {
    profileId: profile.id,
    columns,
    rows: [costRow, implRow, aiRow, migRow, resRow, partnerRow, exitRow],
  };
}
