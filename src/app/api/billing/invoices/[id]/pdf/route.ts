import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { formatMoney } from '@/lib/money';
import type { Money } from '@/contracts/types';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const inv = await prisma.invoice.findFirst({ where: { id, orgId: actor.orgId } });
    if (!inv) return problem(404, 'Not Found', 'invoice not found in this org');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });

    const body = [
      'PROCUR — INVOICE',
      '================',
      '',
      `Invoice ID:  ${inv.id}`,
      `Billed to:   ${org?.name ?? actor.orgId}`,
      `Period:      ${inv.period}`,
      `Amount:      ${formatMoney(inv.amount as Money)}`,
      `Status:      ${String(inv.status).toUpperCase()}`,
      `Issued:      ${inv.issuedAt.toISOString().slice(0, 10)}`,
      '',
      'This is a stub PDF placeholder (text/plain) for the Phase 1 build.',
    ].join('\n');

    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'content-disposition': `attachment; filename="invoice-${inv.id}.txt"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
