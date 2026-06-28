import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'brief.create');
    const { id } = await params;
    const existing = await prisma.watchItem.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', 'watch item not found in this org');
    await prisma.watchItem.delete({ where: { id } });
    await recordAudit(actor, 'watchlist.remove', id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
