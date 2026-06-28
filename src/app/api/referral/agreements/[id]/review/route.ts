import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toReferralAgreement, runPolicyReview, getCommercialPolicy } from '@/lib/referral';

// POST → re-run the deterministic AI policy review and persist it on the row.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const { id } = await params;
    const row = await prisma.referralAgreement.findUnique({
      where: { id },
      include: { vendor: { include: { leads: { where: { buyerOrgId: actor.orgId, agreementId: id } } } } },
    });
    if (!row) return problem(404, 'Not Found', `agreement '${id}' not found`);
    // Verify that this org has at least one lead on this agreement
    const hasOrgAccess = row.vendor.leads.length > 0;
    if (!hasOrgAccess) return problem(403, 'Forbidden', 'no access to this agreement');

    const agreement = toReferralAgreement(row);
    const review = runPolicyReview(agreement, getCommercialPolicy());

    const updated = await prisma.referralAgreement.update({
      where: { id },
      data: {
        policyReview: review as unknown as object,
        // re-reviewing a submitted agreement moves it into the review queue
        status: row.status === 'submitted' ? 'in_review' : row.status,
      },
    });
    await recordAudit(actor, 'referral_agreement.review', id);
    return NextResponse.json(toReferralAgreement(updated));
  } catch (e) {
    return handleError(e);
  }
}
