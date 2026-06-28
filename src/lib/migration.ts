import type { MigrationEstimate, Difficulty } from '@/contracts/types';
import type { MigrationFactInput } from '@/contracts/graph';

// ============================================================================
// Deterministic migration calculator.
// GUARDRAIL: difficulty / score / estWeeks / downtimeRisk / consultingHours are
// COMPUTED from the impacted-system inputs (integrations, workflows, dashboards,
// custom code, records, retraining) — not read from a precomputed blob. Weights
// are documented constants so the model is inspectable and testable.
// ============================================================================

export const MIGRATION_ASSUMPTIONS = {
  // score (0–100) weights
  wIntegrations: 4,
  wWorkflows: 1.5,
  wDashboards: 1.5,
  wCustomCode: 5,
  recordsDivisor: 20_000, // each 20k records ≈ 1 point
  recordsCap: 15,
  retrainDivisor: 40, // each 40 staff ≈ 1 point
  retrainCap: 10,
  // difficulty buckets
  mediumAt: 40,
  highAt: 70,
  // estWeeks (records intentionally excluded — they drive risk, not calendar)
  weekBase: 4,
  weekPerIntegration: 0.7,
  weekPerWorkflow: 0.45,
  weekPerDashboard: 0.3,
  weekPerCustomCode: 1.0,
  // consulting hours
  hoursPerImpactedItem: 14,
  hoursPerCustomCodeExtra: 20,
  // downtime risk thresholds (on custom code)
  downtimeMediumCustomCode: 5,
  downtimeHighCustomCode: 10,
} as const;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function difficultyFromScore(score: number): Difficulty {
  const A = MIGRATION_ASSUMPTIONS;
  if (score >= A.highAt) return 'high';
  if (score >= A.mediumAt) return 'medium';
  return 'low';
}

function downtimeRisk(customCode: number): Difficulty {
  const A = MIGRATION_ASSUMPTIONS;
  if (customCode >= A.downtimeHighCustomCode) return 'high';
  if (customCode >= A.downtimeMediumCustomCode) return 'medium';
  return 'low';
}

export function computeMigration(fact: MigrationFactInput): MigrationEstimate {
  const A = MIGRATION_ASSUMPTIONS;
  const { integrations, workflows, dashboards, customCode } = fact.impacted;
  const records = fact.recordsAffected ?? 0;
  const retrain = fact.retrainingStaff ?? 0;

  const recordsTerm = Math.min(A.recordsCap, records / A.recordsDivisor);
  const retrainTerm = Math.min(A.retrainCap, retrain / A.retrainDivisor);

  const score = Math.round(
    clamp(
      integrations * A.wIntegrations +
        workflows * A.wWorkflows +
        dashboards * A.wDashboards +
        customCode * A.wCustomCode +
        recordsTerm +
        retrainTerm,
      0,
      100,
    ),
  );

  const estWeeks = Math.max(
    A.weekBase,
    Math.round(
      A.weekBase +
        integrations * A.weekPerIntegration +
        workflows * A.weekPerWorkflow +
        dashboards * A.weekPerDashboard +
        customCode * A.weekPerCustomCode,
    ),
  );

  const consultingHours = Math.round(
    (integrations + workflows + dashboards + customCode) * A.hoursPerImpactedItem +
      customCode * A.hoursPerCustomCodeExtra,
  );

  return {
    fromSystem: fact.fromSystem,
    toProductId: fact.toProductId,
    difficulty: difficultyFromScore(score),
    score,
    estWeeks,
    recordsAffected: fact.recordsAffected,
    impacted: fact.impacted,
    retrainingStaff: fact.retrainingStaff,
    downtimeRisk: downtimeRisk(customCode),
    consultingHours,
    checklist: fact.checklist,
  };
}
