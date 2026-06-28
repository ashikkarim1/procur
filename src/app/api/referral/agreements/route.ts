import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toReferralAgreement } from '@/lib/referral';

// GET referral agreements, optionally filtered by ?status.
export async function GET(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const status = new URL(req.url).searchParams.get('status') ?? undefined;
    const rows = await prisma.referralAgreement.findMany({
      where: status ? { status } : undefined,
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(rows.map(toReferralAgreement));
  } catch (e) {
    return handleError(e);
  }
}

// POST a vendor-submitted agreement → lands in 'submitted'.
export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'members.manage');
    const body = await req.json();
    const id = body.id ?? `RA-${Math.floor(1000 + Math.random() * 9000)}`;
    const row = await prisma.referralAgreement.create({
      data: {
        id,
        vendorId: body.vendorId,
        productId: body.productId ?? null,
        feeType: body.feeType,
        feeValue: body.feeValue,
        recurring: body.recurring ?? false,
        qualifiedLeadDef: body.qualifiedLeadDef ?? 'Demo booked',
        cookieDays: body.cookieDays ?? null,
        territories: body.territories ?? [],
        exclusions: body.exclusions ?? [],
        minContractValue: body.minContractValue ?? undefined,
        paymentTiming: body.paymentTiming ?? 'Net 30',
        cancellationTerms: body.cancellationTerms ?? null,
        connector: body.connector ?? null,
        trackingLink: body.trackingLink ?? null,
        status: 'submitted',
      },
    });
    await recordAudit(actor, 'referral_agreement.submit', id);
    return NextResponse.json(toReferralAgreement(row), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
