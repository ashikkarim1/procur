import type { Region } from '@/contracts/types';
import type { Actor } from './auth';

// Residency guardrail: if the org pins residency, org data (and later LLM calls) must
// be computed in org.region. A requested region that differs is pinned back, not honoured.
// Every computed payload stamps the region it was produced in.
export function resolveComputeRegion(actor: Actor, requested?: Region): Region {
  if (actor.residencyLock) return actor.region;
  return requested ?? actor.region;
}

// True when a product can legally host this org's data given the residency pin.
export function residencyOk(actor: Actor, productResidency: Region[]): boolean {
  if (!actor.residencyLock) return true;
  return productResidency.includes(actor.region);
}
