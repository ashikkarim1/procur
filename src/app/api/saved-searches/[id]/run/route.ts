import { NextResponse } from 'next/server';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/data';
import { generateBrief } from '@/lib/briefs';
import { recordAudit } from '@/lib/audit';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { actor, profile } = await getOrgContext();
    requireCapability(actor.role, 'brief.create');
    const { id } = await params;
    const ss = await prisma.savedSearch.findFirst({ where: { id, orgId: actor.orgId } });
    if (!ss) return problem(404, 'Not Found', 'saved search not found in this org');
    const brief = await generateBrief(actor, profile, ss.query);
    await prisma.savedSearch.update({
      where: { id },
      data: { lastRunAt: new Date(), lastResultCount: brief.viable, delta: { newSinceLastRun: 0, priceChanges: 0 } },
    });
    await recordAudit(actor, 'saved_search.run', id);
    return NextResponse.json({ briefId: brief.request.id });
  } catch (e) {
    return handleError(e);
  }
}
