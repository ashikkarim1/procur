import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toLead } from '@/lib/referral';

// GET leads for a vendor.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const rows = await prisma.lead.findMany({
      where: { vendorId: id, buyerOrgId: actor.orgId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(rows.map(toLead));
  } catch (e) {
    return handleError(e);
  }
}
