import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toVendorAccount } from '@/lib/referral';

// GET a vendor account with its agreements, leads and payouts.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const row = await prisma.vendorAccount.findUnique({
      where: { id },
      include: {
        agreements: true,
        leads: {
          where: { buyerOrgId: actor.orgId },
          orderBy: { createdAt: 'desc' },
        },
        payouts: true,
      },
    });
    if (!row) return problem(404, 'Not Found', `vendor '${id}' not found`);
    return NextResponse.json(toVendorAccount(row));
  } catch (e) {
    return handleError(e);
  }
}
