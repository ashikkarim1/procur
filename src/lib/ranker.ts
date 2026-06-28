import type {
  BusinessProfile,
  ProcurementBrief,
  ProcurementRequest,
  Recommendation,
  ReasoningStep,
  Confidence,
  Region,
  TCOModel,
  MigrationEstimate,
} from '@/contracts/types';
import type { Product } from '@/contracts/graph';
import type { MigrationFactInput } from '@/contracts/graph';
import { computeTCO } from './tco';
import { computeMigration } from './migration';
import { partnersFor } from './partners';
import { formatCompact } from './money';

// ============================================================================
// Rules-based ranker — the Phase 1 stand-in for the LLM Copilot. It emits a typed
// ProcurementBrief (same shape the LLM will emit in Phase 2). Fit scoring is a
// documented penalty model below.
//
// GUARDRAIL: fitScore takes NO referral/sponsorship input — referral economics can
// never affect ranking. The function signature literally has no such parameter.
// ============================================================================

export const FIT_ASSUMPTIONS = {
  base: 100,
  residencyFailPenalty: 18, // shown but flagged; not a hard exclusion
  migrationOverMediumWeight: 0.4, // per point of migration score above 40
  migrationMediumThreshold: 40,
  lowAiThreshold: 80,
  lowAiWeight: 0.3, // per point below threshold
  priceOverPeerWeight: 20, // × (1 − priceFit)
  stabilityBelowAPenalty: 5,
  goLiveBaselineWeeks: 12,
  goLivePerWeekPenalty: 0.5,
} as const;

const STABILITY_RANK: Record<string, number> = { A: 1, B: 0.7, C: 0.4, D: 0.2 };

export interface Candidate {
  product: Product;
  vendorStability?: string; // 'A'|'B'|'C'|'D'
  migrationFact?: MigrationFactInput;
}

export interface RankedItem {
  product: Product;
  fitScore: number;
  tco: TCOModel;
  migration?: MigrationEstimate;
  residencyOk: boolean;
  priceFit: number;
}

function residencyOkFor(product: Product, profile: BusinessProfile): boolean {
  const required = profile.dataResidencyRequired ?? [];
  if (required.length === 0) return true;
  return required.every((r) => product.technical.dataResidency.includes(r));
}

/** Deterministic fit: start at 100, subtract documented penalties. Clamp [0,100]. */
function computeFit(item: {
  product: Product;
  residencyOk: boolean;
  migration?: MigrationEstimate;
  priceFit: number;
  stability?: string;
}): number {
  const A = FIT_ASSUMPTIONS;
  let score = A.base;

  if (!item.residencyOk) score -= A.residencyFailPenalty;

  if (item.migration && item.migration.score > A.migrationMediumThreshold) {
    score -= (item.migration.score - A.migrationMediumThreshold) * A.migrationOverMediumWeight;
  }

  const ai = item.product.aiScore.overall;
  if (ai < A.lowAiThreshold) score -= (A.lowAiThreshold - ai) * A.lowAiWeight;

  score -= (1 - item.priceFit) * A.priceOverPeerWeight;

  const stab = STABILITY_RANK[item.stability ?? 'A'] ?? 1;
  if (stab < 1) score -= A.stabilityBelowAPenalty;

  if (item.migration && item.migration.estWeeks > A.goLiveBaselineWeeks) {
    score -= (item.migration.estWeeks - A.goLiveBaselineWeeks) * A.goLivePerWeekPenalty;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function whyItWins(product: Product, profile: BusinessProfile, mig?: MigrationEstimate): string[] {
  const reasons: string[] = [];
  const stack = profile.currentStack;
  const acct = stack.accounting;
  if (acct) {
    const native = product.integrations.find(
      (i) => i.name.toLowerCase() === acct.toLowerCase() && i.kind === 'native',
    );
    if (native) reasons.push(`Native ${acct} migration path — keeps your accounting history intact.`);
  }
  if (residencyOkFor(product, profile) && (profile.dataResidencyRequired?.length ?? 0) > 0) {
    reasons.push(`Hosts in your required region (${profile.dataResidencyRequired!.join(', ')}) — clears the residency gate.`);
  }
  const uplift = product.pricing.renewalUpliftPctPerYear?.value;
  if (uplift != null && uplift <= 5) reasons.push(`Renewal capped at ${uplift}%/yr — stays predictable through Y5.`);
  if (mig && mig.difficulty !== 'high') reasons.push(`${mig.difficulty === 'low' ? 'Low' : 'Manageable'} migration effort (~${mig.estWeeks} wks).`);
  if (product.aiScore.overall >= 80) reasons.push(`Strong AI readiness (${product.aiScore.overall}/100) for automation & analytics.`);
  return reasons.slice(0, 3);
}

function tradeoff(item: RankedItem, profile: BusinessProfile): string {
  if (!item.residencyOk) return 'Cheaper, but no in-region hosting yet — residency risk for your data pin.';
  if (item.migration && item.migration.difficulty === 'high')
    return `Strongest on capability — but a ${item.migration.estWeeks}-wk migration and the highest 5-yr cost.`;
  if (item.priceFit < 0.6) return 'Capable, but the most expensive option on a 5-yr view.';
  return 'A solid alternative on a few dimensions, but edged out on the balance of cost and fit.';
}

export function rankCandidates(
  candidates: Candidate[],
  profile: BusinessProfile,
  region: Region,
  seats: number,
  horizonYears = 5,
): RankedItem[] {
  // 1) compute TCO + migration for each candidate (deterministic)
  const withCost = candidates.map((c) => {
    const tco = computeTCO({ product: c.product, seats, region, horizonYears }, profile);
    const migration = c.migrationFact ? computeMigration(c.migrationFact) : undefined;
    return { c, tco, migration };
  });

  // 2) price fit is relative: cheapest 5-yr total = 1.0
  const minTotal = Math.min(...withCost.map((w) => w.tco.total.amount));

  // 3) fit score
  const ranked: RankedItem[] = withCost.map((w) => {
    const residencyOk = residencyOkFor(w.c.product, profile);
    const priceFit = w.tco.total.amount > 0 ? minTotal / w.tco.total.amount : 1;
    const fitScore = computeFit({
      product: w.c.product,
      residencyOk,
      migration: w.migration,
      priceFit,
      stability: w.c.vendorStability,
    });
    return { product: w.c.product, fitScore, tco: w.tco, migration: w.migration, residencyOk, priceFit };
  });

  ranked.sort((a, b) => b.fitScore - a.fitScore);
  return ranked;
}

function confidenceFrom(candidates: Candidate[]): Confidence {
  // Confidence rises with how much sourced evidence backs the candidates.
  const provCounts = candidates.flatMap((c) =>
    c.product.technical.certifications.flatMap((x) => x.provenance),
  );
  const avgConf =
    provCounts.length > 0 ? provCounts.reduce((a, p) => a + p.confidence, 0) / provCounts.length : 0.5;
  if (candidates.length >= 3 && avgConf >= 0.85) return 'High';
  if (avgConf >= 0.7) return 'Medium';
  return 'Low';
}

// Optional narrative overrides — the LLM (Phase 2) supplies prose; the deterministic
// ranker still owns every NUMBER (fitScore, tco, migration). Absent → ranker generates prose.
export interface BriefNarrative {
  summary?: string;
  reasons?: Record<string, string[]>;  // productId → why-it-wins bullets
  tradeoffs?: Record<string, string>;  // productId → one-liner
}

export interface BuildBriefArgs {
  request: ProcurementRequest;
  profile: BusinessProfile;
  candidates: Candidate[];
  region: Region;
  seats: number;
  scannedTotal: number; // real count of products considered in the graph
  narrative?: BriefNarrative;
  reasoning?: ReasoningStep[]; // override the trace (e.g. real LLM tool-call steps)
}

export function buildBrief(args: BuildBriefArgs): ProcurementBrief {
  const { request, profile, candidates, region, seats, scannedTotal, narrative } = args;
  const ranked = rankCandidates(candidates, profile, region, seats);
  const viable = ranked.length;

  const shortlist: Recommendation[] = ranked.map((r, i) => {
    const isTop = i === 0;
    const nReasons = narrative?.reasons?.[r.product.id];
    const nTradeoff = narrative?.tradeoffs?.[r.product.id];
    return {
      productId: r.product.id,
      rank: i + 1,
      fitScore: r.fitScore,
      isTopPick: isTop,
      tco: r.tco,
      implementationWeeks: r.migration?.estWeeks ?? 0,
      migration: r.migration,
      localPartners: r.residencyOk ? partnersFor(region) : [],
      residencyOk: r.residencyOk,
      reasons: nReasons && nReasons.length ? nReasons : isTop ? whyItWins(r.product, profile, r.migration) : [],
      tradeoff: isTop ? undefined : nTradeoff ?? tradeoff(r, profile),
    };
  });

  const top = ranked[0];
  const summary =
    narrative?.summary ??
    `Of ${viable} ERP${viable === 1 ? '' : 's'} that match your category, residency and stack, ` +
      `${top.product.name.split(' — ')[0]} gives the strongest balance of cost, in-region hosting and migration effort. ` +
      `It scores ${top.fitScore}/100 on fit with a five-year true cost of ${formatCompact(top.tco.total)} ` +
      `and keeps your ${profile.currentStack.accounting ?? 'current'} history intact.`;

  const reasoning: ReasoningStep[] = args.reasoning ?? [
    {
      label: 'Read your profile',
      detail: [profile.industry, ...(profile.dataResidencyRequired ?? []).map((r) => `${r} residency`), profile.currentStack.accounting, profile.currentStack.productivity, budgetLabel(profile)]
        .filter(Boolean)
        .join(' · '),
      state: 'done',
    },
    { label: 'Scanned the knowledge graph', detail: 'pricing · compliance · integrations', state: 'done', count: scannedTotal },
    { label: 'Filtered to viable', detail: 'category + residency + budget', state: 'done', count: viable },
    { label: 'Modeled 5-yr TCO & migration', detail: 'deterministic, auditable calculators', state: 'done' },
    { label: 'Ranked & found local partners', detail: `${region} implementation partners`, state: 'done' },
  ];

  const sources: { label: string; count: number | string }[] = [
    { label: 'Knowledge graph', count: scannedTotal },
    { label: 'Sourced facts', count: countProvenance(candidates) },
    { label: 'Migration models', count: candidates.filter((c) => c.migrationFact).length },
    { label: 'Local partner registry', count: region },
  ];

  return {
    request,
    summary,
    scanned: scannedTotal,
    viable,
    reasoning,
    shortlist,
    confidence: confidenceFrom(candidates),
    sources,
    region,
  };
}

function budgetLabel(profile: BusinessProfile): string | undefined {
  if (!profile.budget) return undefined;
  return `<${formatCompact(profile.budget)}`;
}

function countProvenance(candidates: Candidate[]): number {
  return candidates.reduce((acc, c) => {
    const p = c.product;
    const counts =
      p.technical.certifications.length +
      p.pricing.lines.length +
      (p.sla ? 1 : 0) +
      (p.reviewSummary ? p.reviewSummary.strengths.length + p.reviewSummary.weaknesses.length : 0);
    return acc + counts;
  }, 0);
}
