import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const existing = await prisma.implementationPlan.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', `implementation plan '${id}' not found in this org`);
    await recordAudit(actor, 'implementation.export', id);
    // Stub export URL — a real renderer would produce a signed PDF link.
    return NextResponse.json({ url: `/exports/implementation/${id}.pdf` });
  } catch (e) {
    return handleError(e);
  }
}
