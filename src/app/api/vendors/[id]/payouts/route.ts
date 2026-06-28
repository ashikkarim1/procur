import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toPayout } from '@/lib/referral';

// GET payouts for a vendor.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    // Filter payouts through leads that belong to this org
    const orgLeads = await prisma.lead.findMany({
      where: { vendorId: id, buyerOrgId: actor.orgId },
      select: { agreementId: true },
    });
    const orgAgreementIds = orgLeads.map((l) => l.agreementId).filter(Boolean) as string[];
    const rows = await prisma.payout.findMany({
      where: {
        vendorId: id,
        agreementId: { in: orgAgreementIds.length > 0 ? orgAgreementIds : undefined },
      },
    });
    return NextResponse.json(rows.map(toPayout));
  } catch (e) {
    return handleError(e);
  }
}
