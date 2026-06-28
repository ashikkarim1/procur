import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toImplementationPlan } from '@/lib/lifecycle';

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'brief.create');
    const body = await req.json();
    // If a plan already exists for this org+product, return it (idempotent).
    const existing = await prisma.implementationPlan.findFirst({
      where: { orgId: actor.orgId, productId: body.productId },
    });
    if (existing) return NextResponse.json(toImplementationPlan(existing));
    // No generator wired yet — signal not-implemented per spec.
    return problem(
      501,
      'Not Implemented',
      'plan generation is not available yet; no existing plan for this org + product',
    );
  } catch (e) {
    return handleError(e);
  }
}
