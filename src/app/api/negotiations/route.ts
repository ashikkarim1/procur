import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toNegotiation } from '@/lib/lifecycle';

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const rows = await prisma.negotiation.findMany({ where: { orgId: actor.orgId } });
    return NextResponse.json(rows.map(toNegotiation));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'negotiation.start');
    const body = await req.json();
    const id = `NG-${Math.floor(1000 + Math.random() * 9000)}`;
    const zero = { amount: 0, currency: 'USD' };
    const row = await prisma.negotiation.create({
      data: {
        id,
        orgId: actor.orgId,
        productId: body.productId,
        briefId: body.briefId ?? null,
        status: 'drafting',
        listPrice: zero,
        currentOffer: zero,
        securedDelta: zero,
        levers: [],
        thread: [],
        guardrails: body.guardrails ?? {},
      },
    });
    await recordAudit(actor, 'negotiation.start', row.id);
    return NextResponse.json(toNegotiation(row));
  } catch (e) {
    return handleError(e);
  }
}
