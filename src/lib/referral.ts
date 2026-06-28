import type {
  ReferralAgreement, PolicyReview, Lead, Payout, MarketplacePartner,
  VendorAccount, CommercialPolicy, FeeType, ReferralStatus, ReferralConnector,
  Money, Region, PartnerRef, PolicyFlag,
} from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Prisma row → contract serialisers ────────────────────────────────────────
// jsonb fields (policyReview / minContractValue / value / amount / signatures)
// are stored loosely; dates become ISO strings on the wire.

export function toReferralAgreement(r: any): ReferralAgreement {
  return {
    id: r.id,
    vendorId: r.vendorId,
    productId: r.productId ?? undefined,
    feeType: r.feeType as FeeType,
    feeValue: r.feeValue,
    recurring: r.recurring,
    qualifiedLeadDef: r.qualifiedLeadDef,
    cookieDays: r.cookieDays ?? undefined,
    territories: (r.territories as Region[]) ?? undefined,
    exclusions: r.exclusions ?? undefined,
    minContractValue: (r.minContractValue as Money) ?? undefined,
    paymentTiming: r.paymentTiming,
    cancellationTerms: r.cancellationTerms ?? undefined,
    connector: (r.connector as ReferralConnector) ?? undefined,
    trackingLink: r.trackingLink ?? undefined,
    status: r.status as ReferralStatus,
    policyReview: (r.policyReview as PolicyReview) ?? undefined,
    documentUrl: r.documentUrl ?? undefined,
    signatures: (r.signatures as ReferralAgreement['signatures']) ?? undefined,
  };
}

export function toLead(r: any): Lead {
  return {
    id: r.id,
    vendorId: r.vendorId,
    productId: r.productId,
    agreementId: r.agreementId ?? undefined,
    buyerOrgId: r.buyerOrgId ?? undefined,
    status: r.status as Lead['status'],
    qualifyingEvent: r.qualifyingEvent ?? undefined,
    value: (r.value as Money) ?? undefined,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

export function toPayout(r: any): Payout {
  return {
    id: r.id,
    vendorId: r.vendorId,
    agreementId: r.agreementId,
    amount: r.amount as Money,
    status: r.status as Payout['status'],
    period: r.period,
    connector: (r.connector as ReferralConnector) ?? undefined,
  };
}

export function toMarketplacePartner(r: any): MarketplacePartner {
  return {
    id: r.id,
    name: r.name,
    type: r.type as PartnerRef['type'],
    regions: r.regions as Region[],
    specialisations: r.specialisations,
    verified: r.verified,
    rating: r.rating ?? undefined,
  };
}

export function toVendorAccount(r: any): VendorAccount {
  return {
    id: r.id,
    name: r.name,
    productIds: r.productIds,
    agreements: (r.agreements ?? []).map(toReferralAgreement),
    leads: (r.leads ?? []).map(toLead),
    payouts: (r.payouts ?? []).map(toPayout),
    verified: r.verified,
  };
}

// ── Commercial policy (operator-configured; stub default for ERP) ─────────────
// No table is migrated for this yet, so it lives in module memory and seeds in code.
export const DEFAULT_COMMERCIAL_POLICY: CommercialPolicy = {
  category: 'erp',
  feeBand: { min: 8, max: 10 },
  defaultCookieDays: 90,
  allowedPaymentTerms: ['Net 30', 'Net 45'],
  requiredClauses: ['Named-account exclusion list', 'Audit & clawback rights', 'Data-residency clause'],
  blockedExclusions: ['Existing pipeline', 'Blanket exclusion'],
  version: 'commercial-policy-v3',
};

let commercialPolicy: CommercialPolicy = { ...DEFAULT_COMMERCIAL_POLICY };
export const getCommercialPolicy = (): CommercialPolicy => commercialPolicy;
export const setCommercialPolicy = (next: Partial<CommercialPolicy>): CommercialPolicy => {
  commercialPolicy = { ...commercialPolicy, ...next };
  return commercialPolicy;
};

// ── Deterministic policy review (re-runnable) ─────────────────────────────────
// Flags fee above the category band, cookie windows beyond the cap, and broad /
// blocked exclusions. Recommendation is the worst severity present.
export function runPolicyReview(agreement: ReferralAgreement, policy: CommercialPolicy): PolicyReview {
  const flags: PolicyFlag[] = [];

  // Fee band (only meaningful for percentage fees)
  if (agreement.feeType === 'percentage') {
    if (agreement.feeValue > policy.feeBand.max) {
      const severity = agreement.feeValue > policy.feeBand.max * 2 ? 'block' : 'warn';
      flags.push({
        field: 'feeValue', severity,
        title: severity === 'block' ? 'Fee far above band' : 'Fee above category band',
        detail: `${agreement.feeValue}% exceeds the ${policy.feeBand.min}–${policy.feeBand.max}% band.`,
        suggestion: severity === 'block'
          ? `Reject; invite resubmission ≤${policy.feeBand.max}%.`
          : `Counter at ${policy.feeBand.max}% recurring.`,
        clauseRef: '§3.2',
      });
    } else if (agreement.feeValue < policy.feeBand.min) {
      flags.push({
        field: 'feeValue', severity: 'ok',
        title: `${agreement.feeValue}% — below band`,
        detail: 'Below the category band; favourable to the platform.',
        clauseRef: '§3.2',
      });
    } else {
      flags.push({
        field: 'feeValue', severity: 'ok',
        title: `${agreement.feeValue}%${agreement.recurring ? ' recurring' : ''}`,
        detail: 'In band; terms align incentives.',
        clauseRef: '§3.2',
      });
    }
  } else {
    flags.push({
      field: 'feeValue', severity: 'ok',
      title: 'Flat fee', detail: 'Flat fees are reviewed against minimum contract value, not the % band.',
      clauseRef: '§3.2',
    });
  }

  // Cookie window
  const cap = 120;
  if (agreement.cookieDays != null) {
    if (agreement.cookieDays > cap) {
      flags.push({
        field: 'cookieDays', severity: 'warn',
        title: `${agreement.cookieDays}-day cookie`,
        detail: `Exceeds the ${cap}-day cap.`,
        suggestion: `Cap at ${cap} days.`, clauseRef: '§2.1',
      });
    } else {
      flags.push({
        field: 'cookieDays', severity: 'ok',
        title: `${agreement.cookieDays}-day cookie window`,
        detail: `Within the 30–${cap} day policy band.`, clauseRef: '§2.1',
      });
    }
  }

  // Exclusions
  const broad = (agreement.exclusions ?? []).filter((e) =>
    policy.blockedExclusions.some((b) => e.toLowerCase().includes(b.toLowerCase())),
  );
  if (broad.length > 0) {
    flags.push({
      field: 'exclusions', severity: 'block',
      title: 'Broad exclusion clause',
      detail: `${broad.join(', ')} ${broad.length === 1 ? 'is' : 'are'} undefined and could void most attributed leads.`,
      suggestion: 'Require a named-account exclusion list, not a blanket clause.',
      clauseRef: '§4.4',
    });
  } else if ((agreement.exclusions ?? []).length === 0) {
    flags.push({
      field: 'exclusions', severity: 'ok',
      title: 'No blanket exclusions', detail: 'Attribution is unencumbered.', clauseRef: '§4.4',
    });
  }

  // Payment timing
  if (!policy.allowedPaymentTerms.includes(agreement.paymentTiming)) {
    flags.push({
      field: 'paymentTiming', severity: 'warn',
      title: `${agreement.paymentTiming} not standard`,
      detail: `Allowed terms: ${policy.allowedPaymentTerms.join(', ')}.`,
      suggestion: `Move to ${policy.allowedPaymentTerms[0]}.`, clauseRef: '§5.1',
    });
  }

  const hasBlock = flags.some((f) => f.severity === 'block');
  const hasWarn = flags.some((f) => f.severity === 'warn');
  const recommendation: PolicyReview['recommendation'] = hasBlock ? 'reject' : hasWarn ? 'counter' : 'approve';

  return {
    agreementId: agreement.id,
    flags,
    recommendation,
    reviewedAt: new Date().toISOString(),
    policyVersion: policy.version,
  };
}

// Status derived from an operator decision. A block-flagged agreement must NEVER
// auto-activate on approve — it parks at 'approved' pending re-review.
export function hasBlockFlag(review?: PolicyReview): boolean {
  return Boolean(review?.flags.some((f) => f.severity === 'block'));
}
