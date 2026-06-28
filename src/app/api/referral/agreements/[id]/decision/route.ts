import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toReferralAgreement, hasBlockFlag } from '@/lib/referral';
import type { PolicyReview, ReferralStatus } from '@/contracts/types';

type Decision = 'approve' | 'counter' | 'reject';

// POST {decision, note?} → operator decision on a referral agreement.
// GUARDRAIL: a block-flagged agreement must NEVER auto-activate on approve.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const { id } = await params;
    const body = await req.json();
    const decision = body.decision as Decision;
    if (!['approve', 'counter', 'reject'].includes(decision)) {
      return problem(400, 'Bad Request', `unknown decision '${decision}'`);
    }

    const row = await prisma.referralAgreement.findUnique({
      where: { id },
      include: { vendor: { include: { leads: { where: { buyerOrgId: actor.orgId, agreementId: id } } } } },
    });
    if (!row) return problem(404, 'Not Found', `agreement '${id}' not found`);
    // Verify that this org has at least one lead on this agreement
    const hasOrgAccess = row.vendor.leads.length > 0;
    if (!hasOrgAccess) return problem(403, 'Forbidden', 'no access to this agreement');

    const blocked = hasBlockFlag(row.policyReview as PolicyReview | null ?? undefined);
    if (decision === 'approve' && blocked) {
      return problem(
        409,
        'Conflict',
        'agreement has a block-severity policy flag and cannot be approved — resolve the blocking clause and re-review first',
      );
    }

    // approve → 'approved' (e-sign then activates; never straight to active).
    const nextStatus: ReferralStatus =
      decision === 'approve' ? 'approved' : decision === 'counter' ? 'countered' : 'rejected';

    const updated = await prisma.referralAgreement.update({
      where: { id },
      data: { status: nextStatus },
    });
    await recordAudit(actor, `referral_agreement.${decision}`, id);
    return NextResponse.json(toReferralAgreement(updated));
  } catch (e) {
    return handleError(e);
  }
}
