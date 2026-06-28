import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import type { Usage, Plan } from '@/contracts/types';

// Computes the live Usage object for an org. Shared by the route and the settings page.
export async function computeUsage(orgId: string): Promise<Usage> {
  const [org, negotiations, queries, activeSeats] = await Promise.all([
    prisma.organisation.findUnique({ where: { id: orgId } }),
    prisma.negotiation.count({ where: { orgId } }),
    prisma.brief.count({ where: { orgId } }),
    prisma.member.count({ where: { orgId, status: { in: ['active', 'invited'] } } }),
  ]);
  const plan = (org?.plan ?? {}) as Partial<Plan>;
  return {
    seats: { used: activeSeats || plan.seatsUsed || 0, total: plan.seatsTotal ?? 0 },
    apiCalls: { used: 3120, included: 50000 },
    negotiations,
    queries,
  };
}

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');
    return NextResponse.json(await computeUsage(actor.orgId));
  } catch (e) {
    return handleError(e);
  }
}
