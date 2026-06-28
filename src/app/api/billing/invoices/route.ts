import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import type { Invoice } from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toInvoice(r: any): Invoice {
  return {
    id: r.id,
    period: r.period,
    amount: r.amount,
    status: r.status,
    pdfUrl: r.pdfUrl || `/api/billing/invoices/${r.id}/pdf`,
  };
}

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const rows = await prisma.invoice.findMany({
      where: { orgId: actor.orgId },
      orderBy: { issuedAt: 'desc' },
    });
    return NextResponse.json(rows.map(toInvoice));
  } catch (e) {
    return handleError(e);
  }
}
