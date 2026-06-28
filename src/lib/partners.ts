import type { PartnerRef, Region } from '@/contracts/types';

// Local-partner registry (Phase 1 seed). In production this is the partner marketplace
// (MARKETPLACE.md). Keyed by region so recommendations surface in-region implementers.
export const PARTNER_REGISTRY: Record<string, PartnerRef[]> = {
  UAE: [
    { id: 'pt_dubai1', name: 'Gulf Implementation Partners', type: 'implementation', region: 'UAE' },
    { id: 'pt_dubai2', name: 'Emirates ERP Consulting', type: 'systems_integrator', region: 'UAE' },
  ],
  EU: [{ id: 'pt_eu1', name: 'Rhein Systems Group', type: 'systems_integrator', region: 'EU' }],
  US: [{ id: 'pt_us1', name: 'Lone Star Integrators', type: 'implementation', region: 'US' }],
};

export function partnersFor(region: Region): PartnerRef[] {
  return PARTNER_REGISTRY[region] ?? [];
}
