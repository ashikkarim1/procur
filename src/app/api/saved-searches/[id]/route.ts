import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toSavedSearch } from '@/lib/serialize';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'brief.create');
    const { id } = await params;
    // tenant-scoped update: only rows in the actor's org
    const existing = await prisma.savedSearch.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', 'saved search not found in this org');
    const body = await req.json();
    const row = await prisma.savedSearch.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        query: body.query ?? undefined,
        filters: body.filters ?? undefined,
        alertsEnabled: body.alertsEnabled ?? undefined,
      },
    });
    await recordAudit(actor, 'saved_search.update', id);
    return NextResponse.json(toSavedSearch(row));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'brief.create');
    const { id } = await params;
    const existing = await prisma.savedSearch.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', 'saved search not found in this org');
    await prisma.savedSearch.delete({ where: { id } });
    await recordAudit(actor, 'saved_search.delete', id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
