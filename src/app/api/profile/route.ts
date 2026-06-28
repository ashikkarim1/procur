import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/data';

export async function GET() {
  try {
    const { actor } = await getOrgContext();
    requireCapability(actor.role, 'graph.read');
    const { profile } = await getOrgContext();
    return NextResponse.json(profile);
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage'); // editing business context is an admin action
    const body = await req.json();
    const updated = await prisma.businessProfile.update({
      where: { orgId: actor.orgId },
      data: {
        country: body.country,
        city: body.city ?? null,
        industry: body.industry,
        employees: body.employees,
        revenue: body.revenue ?? null,
        currentStack: body.currentStack,
        compliance: body.compliance ?? [],
        dataResidencyRequired: body.dataResidencyRequired ?? [],
        budget: body.budget ?? null,
        growthPlans: body.growthPlans ?? null,
      },
    });
    // editing the profile invalidates cached briefs (ACCOUNT_AND_SETTINGS.md §1)
    await prisma.brief.deleteMany({ where: { orgId: actor.orgId } });
    await recordAudit(actor, 'profile.update', actor.orgId);
    return NextResponse.json(updated);
  } catch (e) {
    return handleError(e);
  }
}
