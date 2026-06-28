import type { Money, Region, Provenance, TCOModel, TCOLine, TCOCategory } from '@/contracts/types';
import type { Product } from '@/contracts/graph';
import type { BusinessProfile } from '@/contracts/types';
import { money, scaleMoney } from './money';

// ============================================================================
// Deterministic, auditable TCO calculator.
// GUARDRAIL: numbers are COMPUTED from product pricing + profile inputs — never
// invented, never read from a precomputed blob. Every line carries provenance so
// "where did this number come from?" is answerable line by line. Model assumptions
// live in TCO_ASSUMPTIONS (one place, inspectable, testable).
// ============================================================================

export const TCO_ASSUMPTIONS = {
  monthsPerYear: 12,
  // Inferred lines (no vendor price) are derived from these documented rates.
  integrationSetupPerSystem: 1_200_00, // one-time Y1, per integrated current-stack system (minor units)
  integrationMaintPerSystemPerYear: 240_00, // recurring per system per year
  trainingPerStaffOneTime: 350_00, // Y1 onboarding per retrained staff member
  trainingRefreshPctOfOnboarding: 0.2, // annual refresher as a fraction of Y1 onboarding
  // Internal labour expressed as fraction of an FTE-year, scaled by seats/100.
  internalFteCostPerYear: 90_000_00,
  internalFteImplYear: 0.5, // heavier during the implementation year (Y1)
  internalFteSteadyYear: 0.25, // steady-state thereafter
  // Support/renewal when the vendor has no explicit premium_support line.
  supportPctOfLicense: 0.18,
  defaultRenewalUpliftPct: 0,
} as const;

export interface TCOInput {
  product: Product;
  seats: number;
  region: Region;
  horizonYears: number;
}

const today = () => new Date().toISOString().slice(0, 10);
const inferred = (anchor: string, confidence: number): Provenance => ({
  source: 'inferred',
  url: `assumption:${anchor}`,
  asOf: today(),
  confidence,
});

function perSeatMonthly(product: Product): { amount: Money; prov: Provenance[] } | null {
  const line = product.pricing.lines.find((l) => l.dimension === 'per_seat');
  if (!line) return null;
  const lo = line.rangeLow?.amount;
  const hi = line.rangeHigh?.amount;
  const amt = lo != null && hi != null ? Math.round((lo + hi) / 2) : line.amount?.amount;
  if (amt == null) return null;
  return {
    amount: money(amt, line.rangeLow?.currency ?? line.amount?.currency ?? product.pricing.currencyDefault),
    prov: line.provenance,
  };
}

function countIntegratedSystems(profile: BusinessProfile): number {
  const s = profile.currentStack;
  const named = [s.erp, s.crm, s.accounting, s.cloud, s.productivity].filter(Boolean).length;
  const other = s.other?.length ?? 0;
  return Math.max(1, named + other);
}

/** Compute a fully auditable 5-yr TCOModel from product pricing + buyer profile. */
export function computeTCO(input: TCOInput, profile: BusinessProfile): TCOModel {
  const { product, seats, region, horizonYears: H } = input;
  const ccy = product.pricing.currencyDefault;
  const A = TCO_ASSUMPTIONS;
  const lines: TCOLine[] = [];

  const zeros = (): number[] => Array(H).fill(0);
  const toLine = (category: TCOCategory, amounts: number[], provenance: Provenance[]): TCOLine => ({
    category,
    byYear: amounts.map((a) => money(Math.round(a), ccy)),
    provenance,
  });

  // ── Licenses: seats × per-seat monthly × 12, compounding renewal uplift from Y2 ──
  const ps = perSeatMonthly(product);
  const uplift = (product.pricing.renewalUpliftPctPerYear?.value ?? A.defaultRenewalUpliftPct) / 100;
  const licenseByYear = zeros();
  if (ps) {
    const baseYear = ps.amount.amount * seats * A.monthsPerYear;
    for (let y = 0; y < H; y++) licenseByYear[y] = baseYear * Math.pow(1 + uplift, y);
    lines.push(toLine('licenses', licenseByYear, ps.prov));
  }

  // ── Implementation: vendor implementation line, Y1 only ──
  const impl = product.pricing.lines.find((l) => l.dimension === 'implementation');
  if (impl?.amount) {
    const implByYear = zeros();
    implByYear[0] = impl.amount.amount;
    lines.push(toLine('implementation', implByYear, impl.provenance));
  }

  // ── Integrations: per current-stack system, setup Y1 + annual maintenance (inferred) ──
  const systems = countIntegratedSystems(profile);
  const integ = zeros();
  for (let y = 0; y < H; y++) {
    integ[y] = systems * A.integrationMaintPerSystemPerYear + (y === 0 ? systems * A.integrationSetupPerSystem : 0);
  }
  lines.push(toLine('integrations', integ, [inferred('integration_setup', 0.6)]));

  // ── Training: onboarding Y1 + annual refresher (inferred from staff count) ──
  const staff = profile.employees;
  const train = zeros();
  for (let y = 0; y < H; y++) {
    train[y] = y === 0 ? staff * A.trainingPerStaffOneTime : staff * A.trainingPerStaffOneTime * A.trainingRefreshPctOfOnboarding;
  }
  lines.push(toLine('training', train, [inferred('training_per_staff', 0.6)]));

  // ── Internal labour: fraction of FTE-year, scaled by seats/100 (inferred) ──
  const fteScale = seats / 100;
  const labor = zeros();
  for (let y = 0; y < H; y++) {
    const frac = y === 0 ? A.internalFteImplYear : A.internalFteSteadyYear;
    labor[y] = A.internalFteCostPerYear * frac * fteScale;
  }
  lines.push(toLine('internal_labor', labor, [inferred('internal_labor_fte', 0.55)]));

  // ── Support & renewal: vendor premium_support line, else % of licenses (risk-flagged in UI) ──
  const premium = product.pricing.lines.find((l) => l.dimension === 'premium_support');
  const support = zeros();
  if (premium?.amount) {
    for (let y = 0; y < H; y++) support[y] = premium.amount.amount * Math.pow(1 + uplift, y);
    lines.push(toLine('support_renewal', support, premium.provenance));
  } else if (ps) {
    for (let y = 0; y < H; y++) support[y] = licenseByYear[y] * A.supportPctOfLicense;
    lines.push(toLine('support_renewal', support, [inferred('support_pct_of_license', 0.5)]));
  }

  // ── Roll-ups (computed, not stored) ──
  const cumulativeByYear: Money[] = [];
  let running = 0;
  for (let y = 0; y < H; y++) {
    const yearTotal = lines.reduce((acc, l) => acc + l.byYear[y].amount, 0);
    running += yearTotal;
    cumulativeByYear.push(money(Math.round(running), ccy));
  }
  const total = cumulativeByYear[H - 1] ?? money(0, ccy);
  const licenseTotal = licenseByYear.reduce((a, b) => a + b, 0);
  const licenseSharePct = total.amount > 0 ? Math.round((licenseTotal / total.amount) * 100) : 0;

  return {
    productId: product.id,
    seats,
    region,
    horizonYears: H,
    lines,
    cumulativeByYear,
    total,
    licenseSharePct,
  };
}

// Convenience for tests/debug: re-export a scaler so callers verify line math.
export const _scaleMoney = scaleMoney;
