import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

// GET → the day-one referral click-through.
// Finds the product's ACTIVE referral agreement, records a 'click-through' Lead,
// then 302-redirects to the program's tracking link (or a placeholder).
//
// GUARDRAIL: this is attribution only — a click NEVER affects fitScore or TCO
// ranking; sponsored placement is labelled in the UI, not weighted in the graph.
export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const actor = await getActor();
    const { productId } = await params;

    const agreement = await prisma.referralAgreement.findFirst({
      where: { productId, status: 'active' },
    });
    if (!agreement) return problem(404, 'Not Found', `no active referral agreement for product '${productId}'`);

    await prisma.lead.create({
      data: {
        vendorId: agreement.vendorId,
        productId,
        agreementId: agreement.id,
        buyerOrgId: actor.orgId,
        status: 'new',
        qualifyingEvent: 'click-through',
      },
    });
    await recordAudit(actor, 'referral.click_through', `${productId}:${agreement.id}`);

    const destination = agreement.trackingLink ?? `https://example.com/go/${productId}`;
    return NextResponse.redirect(destination, 302);
  } catch (e) {
    return handleError(e);
  }
}
