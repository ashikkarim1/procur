import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toNegotiation } from '@/lib/lifecycle';
import type { NegotiationGuardrails } from '@/contracts/types';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'negotiation.start');
    const { id } = await params;
    const existing = await prisma.negotiation.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', `negotiation '${id}' not found in this org`);
    const body = await req.json().catch(() => ({}));
    const guardrails = (existing.guardrails as NegotiationGuardrails) ?? {};
    const nextGuardrails = body.approverId ? { ...guardrails, approver: body.approverId } : guardrails;
    const row = await prisma.negotiation.update({
      where: { id },
      data: { status: 'awaiting_approval', guardrails: nextGuardrails as unknown as object },
    });
    await recordAudit(actor, 'negotiation.submit_for_approval', id);
    return NextResponse.json(toNegotiation(row));
  } catch (e) {
    return handleError(e);
  }
}
