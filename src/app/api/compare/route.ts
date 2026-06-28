import { NextResponse } from 'next/server';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { getOrgContext } from '@/lib/data';
import { getCandidatesByIds } from '@/lib/graph';
import { rankCandidates } from '@/lib/ranker';
import { buildComparison } from '@/lib/compare';
import { resolveComputeRegion } from '@/lib/residency';

export async function POST(req: Request) {
  try {
    const { actor, profile } = await getOrgContext();
    requireCapability(actor.role, 'graph.read');
    const body = await req.json();
    const fromSystem = profile.currentStack.accounting ?? profile.currentStack.erp;
    const candidates = await getCandidatesByIds(body.productIds ?? [], fromSystem);
    const region = resolveComputeRegion(actor);
    const ranked = rankCandidates(candidates, profile, region, profile.employees);
    return NextResponse.json(buildComparison(ranked, profile));
  } catch (e) {
    return handleError(e);
  }
}
