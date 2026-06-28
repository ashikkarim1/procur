import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toReferralAgreement, hasBlockFlag } from '@/lib/referral';
import type { PolicyReview, ReferralAgreement } from '@/contracts/types';

type Party = 'vendor' | 'platform';

// POST {party} → record an e-signature. Both parties signed → status 'active',
// unless a block-severity policy flag is present (block never auto-activates).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const { id } = await params;
    const body = await req.json();
    const party = body.party as Party;
    if (!['vendor', 'platform'].includes(party)) {
      return problem(400, 'Bad Request', `unknown party '${party}'`);
    }

    const row = await prisma.referralAgreement.findUnique({
      where: { id },
      include: { vendor: { include: { leads: { where: { buyerOrgId: actor.orgId, agreementId: id } } } } },
    });
    if (!row) return problem(404, 'Not Found', `agreement '${id}' not found`);
    // Verify that this org has at least one lead on this agreement
    const hasOrgAccess = row.vendor.leads.length > 0;
    if (!hasOrgAccess) return problem(403, 'Forbidden', 'no access to this agreement');

    const existing = (row.signatures as ReferralAgreement['signatures']) ?? [];
    const signatures = existing.some((s) => s.party === party)
      ? existing
      : [...existing, { party, signedAt: new Date().toISOString() }];

    const bothSigned = signatures.some((s) => s.party === 'vendor') && signatures.some((s) => s.party === 'platform');
    const blocked = hasBlockFlag(row.policyReview as PolicyReview | null ?? undefined);

    const status = bothSigned && !blocked ? 'active' : row.status;

    const updated = await prisma.referralAgreement.update({
      where: { id },
      data: { signatures, status },
    });
    await recordAudit(actor, `referral_agreement.sign.${party}`, id);
    return NextResponse.json(toReferralAgreement(updated));
  } catch (e) {
    return handleError(e);
  }
}
