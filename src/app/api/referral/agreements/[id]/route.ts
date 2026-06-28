import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toReferralAgreement } from '@/lib/referral';

// GET a single referral agreement (including its policyReview).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const row = await prisma.referralAgreement.findUnique({
      where: { id },
      include: { vendor: { include: { leads: { where: { buyerOrgId: actor.orgId, agreementId: id } } } } },
    });
    if (!row) return problem(404, 'Not Found', `agreement '${id}' not found`);
    // Verify that this org has at least one lead on this agreement
    const hasOrgAccess = row.vendor.leads.length > 0;
    if (!hasOrgAccess) return problem(403, 'Forbidden', 'no access to this agreement');
    return NextResponse.json(toReferralAgreement(row));
  } catch (e) {
    return handleError(e);
  }
}
