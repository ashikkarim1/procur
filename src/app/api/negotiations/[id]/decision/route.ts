import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toNegotiation } from '@/lib/lifecycle';
import type { NegotiationStatus } from '@/contracts/types';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    // Only approvers/owners can make the purchase decision.
    requireCapability(actor.role, 'purchase.approve');
    const { id } = await params;
    const existing = await prisma.negotiation.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', `negotiation '${id}' not found in this org`);
    const body = await req.json();
    const decision = body.decision as 'approve' | 'decline';
    if (decision !== 'approve' && decision !== 'decline') {
      return problem(400, 'Bad Request', "decision must be 'approve' or 'decline'");
    }
    const status: NegotiationStatus = decision === 'approve' ? 'agreed' : 'declined';
    const row = await prisma.negotiation.update({ where: { id }, data: { status } });
    await recordAudit(actor, `negotiation.${decision}`, id);
    return NextResponse.json(toNegotiation(row));
  } catch (e) {
    return handleError(e);
  }
}
