import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import type { Plan } from '@/contracts/types';

const TIERS: Plan['tier'][] = ['starter', 'team', 'enterprise'];
const TERMS: Plan['term'][] = ['monthly', 'annual'];

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');
    return NextResponse.json(org.plan);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'members.manage');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');

    const body = await req.json();
    const current = org.plan as unknown as Plan;
    const next: Plan = {
      tier: TIERS.includes(body.tier) ? body.tier : current.tier,
      term: TERMS.includes(body.term) ? body.term : current.term,
      renewsAt: current.renewsAt,
      seatsUsed: current.seatsUsed,
      seatsTotal: typeof body.seats === 'number' && body.seats > 0 ? Math.round(body.seats) : current.seatsTotal,
      price: current.price,
    };
    await prisma.organisation.update({ where: { id: actor.orgId }, data: { plan: next as unknown as object } });
    await recordAudit(actor, 'billing.plan.update', actor.orgId);
    return NextResponse.json(next);
  } catch (e) {
    return handleError(e);
  }
}
