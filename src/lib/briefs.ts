import { prisma } from './prisma';
import type { Actor } from './auth';
import type { BusinessProfile, ProcurementBrief, ProcurementRequest } from '@/contracts/types';
import { buildBrief } from './ranker';
import { getCandidates } from './graph';
import { resolveComputeRegion } from './residency';

// Naive category resolver (Phase 2 replaces this with LLM query understanding).
const CATEGORY_KEYWORDS: Record<string, string> = {
  erp: 'erp', 'enterprise resource': 'erp',
  crm: 'crm', sales: 'crm',
  accounting: 'accounting',
  'call center': 'call_center', 'call centre': 'call_center',
  payroll: 'hr_payroll', hr: 'hr_payroll',
};

export function resolveCategory(query: string): string {
  const q = query.toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) if (q.includes(kw)) return cat;
  return 'erp';
}

function newRequestId(): string {
  // Deterministic-ish id without Date.now in tests: random 4-digit suffix.
  const n = 2000 + Math.floor(Math.random() * 8000);
  return `PR-${n}`;
}

export async function generateBrief(
  actor: Actor,
  profile: BusinessProfile,
  query: string,
): Promise<ProcurementBrief> {
  const category = resolveCategory(query);
  const fromSystem = profile.currentStack.accounting ?? profile.currentStack.erp;
  const candidates = await getCandidates(category, fromSystem);
  const scannedTotal = await prisma.product.count();
  const region = resolveComputeRegion(actor); // residency pin — compute stays in org region

  const request: ProcurementRequest = {
    id: newRequestId(),
    profileId: profile.id,
    query,
    createdAt: new Date().toISOString(),
    status: 'ready',
  };

  const brief = buildBrief({
    request,
    profile,
    candidates,
    region,
    seats: profile.employees,
    scannedTotal,
  });

  await prisma.brief.create({
    data: {
      id: request.id,
      orgId: actor.orgId,
      profileId: profile.id,
      query,
      status: 'ready',
      payload: brief as unknown as object,
    },
  });

  return brief;
}

// Tenant-scoped fetch: a brief is ONLY visible to its owning org.
export async function getBriefById(actor: Actor, id: string): Promise<ProcurementBrief | null> {
  const row = await prisma.brief.findFirst({ where: { id, orgId: actor.orgId } });
  if (!row) return null;
  return row.payload as unknown as ProcurementBrief;
}
