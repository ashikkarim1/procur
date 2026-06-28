import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { getBriefById } from '@/lib/briefs';
import { recordAudit } from '@/lib/audit';

// Server-side send is stubbed in Phase 1 (no SMTP). The prototype's mailto is the
// client-side stub; this endpoint records the intent + audit and returns 202.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const brief = await getBriefById(actor, id);
    if (!brief) return problem(404, 'Not Found', `brief '${id}' not found in this org`);
    const body = await req.json().catch(() => ({}));
    const to: string[] = body.to ?? [];
    if (to.length === 0) return problem(400, 'Bad Request', 'at least one recipient required');
    await recordAudit(actor, 'brief.email', `${id} → ${to.join(',')}`);
    return NextResponse.json({ queued: true, to }, { status: 202 });
  } catch (e) {
    return handleError(e);
  }
}
