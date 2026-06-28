import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { getBriefById } from '@/lib/briefs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const brief = await getBriefById(actor, id); // tenant-scoped: org A cannot read org B
    if (!brief) return problem(404, 'Not Found', `brief '${id}' not found in this org`);
    return NextResponse.json(brief);
  } catch (e) {
    return handleError(e);
  }
}
