import { describe, it, expect } from 'vitest';
import { computeTCO, TCO_ASSUMPTIONS } from '@/lib/tco';
import { profile, product } from './fixtures';

const seats = profile.employees; // 200
const opts = (id: string) => ({ product: product(id), seats, region: 'UAE' as const, horizonYears: 5 });

describe('computeTCO — auditable, deterministic', () => {
  it('cumulativeByYear is monotonically non-decreasing (fixes the broken seed blob)', () => {
    const tco = computeTCO(opts('p_buildledger'), profile);
    for (let i = 1; i < tco.cumulativeByYear.length; i++) {
      expect(tco.cumulativeByYear[i].amount).toBeGreaterThanOrEqual(tco.cumulativeByYear[i - 1].amount);
    }
  });

  it('total equals the last cumulative year', () => {
    const tco = computeTCO(opts('p_summit'), profile);
    expect(tco.total.amount).toBe(tco.cumulativeByYear[tco.horizonYears - 1].amount);
  });

  it('cumulative total equals the sum of every line across every year', () => {
    const tco = computeTCO(opts('p_buildledger'), profile);
    const sumOfLines = tco.lines.reduce((acc, l) => acc + l.byYear.reduce((a, m) => a + m.amount, 0), 0);
    expect(tco.total.amount).toBe(sumOfLines);
  });

  it('licenses Y1 = perSeatMid × seats × 12 months', () => {
    const p = product('p_buildledger');
    const line = p.pricing.lines.find((l) => l.dimension === 'per_seat')!;
    const mid = Math.round((line.rangeLow!.amount + line.rangeHigh!.amount) / 2);
    const tco = computeTCO(opts('p_buildledger'), profile);
    const licenses = tco.lines.find((l) => l.category === 'licenses')!;
    expect(licenses.byYear[0].amount).toBe(mid * seats * TCO_ASSUMPTIONS.monthsPerYear);
  });

  it('renewal uplift compounds licenses year over year', () => {
    const p = product('p_buildledger');
    const uplift = (p.pricing.renewalUpliftPctPerYear?.value ?? 0) / 100;
    const tco = computeTCO(opts('p_buildledger'), profile);
    const lic = tco.lines.find((l) => l.category === 'licenses')!;
    expect(lic.byYear[1].amount).toBe(Math.round(lic.byYear[0].amount * (1 + uplift)));
  });

  it('licenseSharePct is the licenses fraction of total, in [0,100]', () => {
    const tco = computeTCO(opts('p_buildledger'), profile);
    const licTotal = tco.lines.find((l) => l.category === 'licenses')!.byYear.reduce((a, m) => a + m.amount, 0);
    expect(tco.licenseSharePct).toBe(Math.round((licTotal / tco.total.amount) * 100));
    expect(tco.licenseSharePct).toBeGreaterThan(0);
    expect(tco.licenseSharePct).toBeLessThanOrEqual(100);
  });

  it('every line spans the full horizon and carries provenance (no naked numbers)', () => {
    const tco = computeTCO(opts('p_summit'), profile);
    for (const line of tco.lines) {
      expect(line.byYear).toHaveLength(5);
      expect(line.provenance.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic — identical inputs yield identical output', () => {
    const a = computeTCO(opts('p_leanerp'), profile);
    const b = computeTCO(opts('p_leanerp'), profile);
    expect(a).toEqual(b);
  });

  it('uses the vendor premium_support line when present (Summit)', () => {
    const tco = computeTCO(opts('p_summit'), profile);
    const support = tco.lines.find((l) => l.category === 'support_renewal')!;
    // Summit has a premium_support pricing line → sourced, not the inferred %-of-license fallback
    expect(support.provenance.some((p) => p.source !== 'inferred')).toBe(true);
  });
});
