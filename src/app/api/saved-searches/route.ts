import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toSavedSearch } from '@/lib/serialize';

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const rows = await prisma.savedSearch.findMany({ where: { orgId: actor.orgId }, orderBy: { lastRunAt: 'desc' } });
    return NextResponse.json(rows.map(toSavedSearch));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'brief.create');
    const body = await req.json();
    const row = await prisma.savedSearch.create({
      data: {
        orgId: actor.orgId,
        createdBy: actor.memberId,
        title: body.title,
        query: body.query,
        filters: body.filters ?? {},
        alertsEnabled: body.alertsEnabled ?? false,
      },
    });
    await recordAudit(actor, 'saved_search.create', row.id);
    return NextResponse.json(toSavedSearch(row));
  } catch (e) {
    return handleError(e);
  }
}
