import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import type { PrivacySettings, Region } from '@/contracts/types';

const REGIONS: Region[] = ['UAE', 'EU', 'US', 'UK', 'APAC', 'GLOBAL'];

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');
    return NextResponse.json(org.privacy);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');

    const body = await req.json();
    const current = (org.privacy ?? {}) as unknown as PrivacySettings;
    const next: PrivacySettings = {
      residencyLock: typeof body.residencyLock === 'boolean' ? body.residencyLock : current.residencyLock,
      region: REGIONS.includes(body.region) ? body.region : current.region,
      autoDeleteAfterRetention:
        typeof body.autoDeleteAfterRetention === 'boolean' ? body.autoDeleteAfterRetention : current.autoDeleteAfterRetention,
      retentionMonths:
        typeof body.retentionMonths === 'number' && body.retentionMonths > 0
          ? Math.round(body.retentionMonths)
          : current.retentionMonths,
      consents: {
        analytics:
          typeof body?.consents?.analytics === 'boolean' ? body.consents.analytics : current.consents?.analytics ?? false,
        marketing:
          typeof body?.consents?.marketing === 'boolean' ? body.consents.marketing : current.consents?.marketing ?? false,
        profiling:
          typeof body?.consents?.profiling === 'boolean' ? body.consents.profiling : current.consents?.profiling ?? false,
      },
    };
    await prisma.organisation.update({ where: { id: actor.orgId }, data: { privacy: next as unknown as object } });
    await recordAudit(actor, 'privacy.update', actor.orgId);
    return NextResponse.json(next);
  } catch (e) {
    return handleError(e);
  }
}
