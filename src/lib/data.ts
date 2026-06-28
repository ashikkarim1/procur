import { prisma } from './prisma';
import { getActor, type Actor } from './auth';
import type { BusinessProfile } from '@/contracts/types';

// All org-scoped reads go through here so the tenant filter (orgId) is never forgotten.
export interface OrgContext {
  actor: Actor;
  profile: BusinessProfile;
}

function toBusinessProfile(row: {
  id: string; orgName: string; country: string; city: string | null; industry: string;
  employees: number; revenue: unknown; currentStack: unknown; compliance: string[];
  dataResidencyRequired: string[]; budget: unknown; growthPlans: string | null;
}): BusinessProfile {
  return {
    id: row.id,
    orgName: row.orgName,
    country: row.country,
    city: row.city ?? undefined,
    industry: row.industry,
    employees: row.employees,
    revenue: (row.revenue as BusinessProfile['revenue']) ?? undefined,
    currentStack: row.currentStack as BusinessProfile['currentStack'],
    compliance: row.compliance,
    dataResidencyRequired: row.dataResidencyRequired as BusinessProfile['dataResidencyRequired'],
    budget: (row.budget as BusinessProfile['budget']) ?? undefined,
    growthPlans: row.growthPlans ?? undefined,
  };
}

export async function getOrgContext(): Promise<OrgContext> {
  const actor = await getActor();
  const row = await prisma.businessProfile.findUnique({ where: { orgId: actor.orgId } });
  if (!row) throw new Error(`no profile for org ${actor.orgId}`);
  return { actor, profile: toBusinessProfile(row) };
}

export { toBusinessProfile };
