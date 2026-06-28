import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toWatchItem } from '@/lib/serialize';

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const rows = await prisma.watchItem.findMany({ where: { orgId: actor.orgId }, orderBy: { addedAt: 'desc' } });
    return NextResponse.json(rows.map(toWatchItem));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'brief.create');
    const body = await req.json();
    const row = await prisma.watchItem.create({
      data: { orgId: actor.orgId, productId: body.productId, alerts: body.alerts ?? [] },
    });
    await recordAudit(actor, 'watchlist.add', body.productId);
    return NextResponse.json(toWatchItem(row));
  } catch (e) {
    return handleError(e);
  }
}
