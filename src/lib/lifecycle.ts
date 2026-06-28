import type {
  Negotiation,
  NegotiationGuardrails,
  NegotiationLever,
  NegotiationMessage,
  NegotiationStatus,
  ImplementationPlan,
  ImplementationPhase,
  ImplementationRisk,
  ImplementationKPI,
  ChecklistItem,
  Money,
  PartnerRef,
} from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Prisma row → contract shapes (jsonb columns are typed loosely) ───────────
export function toNegotiation(row: any): Negotiation {
  return {
    id: row.id,
    orgId: row.orgId,
    productId: row.productId,
    briefId: row.briefId ?? undefined,
    status: row.status as NegotiationStatus,
    listPrice: row.listPrice as Money,
    currentOffer: row.currentOffer as Money,
    securedDelta: row.securedDelta as Money,
    levers: (row.levers as NegotiationLever[]) ?? [],
    thread: (row.thread as NegotiationMessage[]) ?? [],
    guardrails: (row.guardrails as NegotiationGuardrails) ?? {},
  };
}

export function toImplementationPlan(row: any): ImplementationPlan {
  return {
    id: row.id,
    orgId: row.orgId,
    productId: row.productId,
    fromSystem: row.fromSystem,
    totalWeeks: row.totalWeeks,
    partner: (row.partner as PartnerRef) ?? undefined,
    milestonesDone: row.milestonesDone,
    milestonesTotal: row.milestonesTotal,
    phases: (row.phases as ImplementationPhase[]) ?? [],
    risks: (row.risks as ImplementationRisk[]) ?? [],
    kpis: (row.kpis as ImplementationKPI[]) ?? [],
    goLiveChecklist: (row.goLiveChecklist as ChecklistItem[]) ?? [],
  };
}
