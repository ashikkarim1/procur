import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toNegotiation } from '@/lib/lifecycle';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    // tenant-scoped: org A cannot read org B's negotiation
    const row = await prisma.negotiation.findFirst({ where: { id, orgId: actor.orgId } });
    if (!row) return problem(404, 'Not Found', `negotiation '${id}' not found in this org`);
    return NextResponse.json(toNegotiation(row));
  } catch (e) {
    return handleError(e);
  }
}
