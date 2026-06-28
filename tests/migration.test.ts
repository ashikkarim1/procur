import { describe, it, expect } from 'vitest';
import { computeMigration } from '@/lib/migration';
import { migrationFact } from './fixtures';

describe('computeMigration — difficulty derived from impacted-system inputs', () => {
  it('classifies BuildLedger as medium', () => {
    const m = computeMigration(migrationFact('p_buildledger'));
    expect(m.difficulty).toBe('medium');
    expect(m.score).toBeGreaterThanOrEqual(40);
    expect(m.score).toBeLessThan(70);
  });

  it('classifies LeanERP as low', () => {
    const m = computeMigration(migrationFact('p_leanerp'));
    expect(m.difficulty).toBe('low');
    expect(m.score).toBeLessThan(40);
  });

  it('classifies Summit as high', () => {
    const m = computeMigration(migrationFact('p_summit'));
    expect(m.difficulty).toBe('high');
    expect(m.score).toBeGreaterThanOrEqual(70);
  });

  it('estWeeks ranks Lean < BuildLedger < Summit', () => {
    const lean = computeMigration(migrationFact('p_leanerp')).estWeeks;
    const build = computeMigration(migrationFact('p_buildledger')).estWeeks;
    const summit = computeMigration(migrationFact('p_summit')).estWeeks;
    expect(lean).toBeLessThan(build);
    expect(build).toBeLessThan(summit);
  });

  it('downtime risk tracks custom-code volume', () => {
    expect(computeMigration(migrationFact('p_leanerp')).downtimeRisk).toBe('low'); // 0 custom code
    expect(computeMigration(migrationFact('p_summit')).downtimeRisk).toBe('medium'); // 6 custom code
  });

  it('preserves the qualitative checklist and is deterministic', () => {
    const a = computeMigration(migrationFact('p_buildledger'));
    const b = computeMigration(migrationFact('p_buildledger'));
    expect(a).toEqual(b);
    expect(a.checklist.length).toBeGreaterThan(0);
    expect(a.consultingHours).toBeGreaterThan(0);
  });
});
