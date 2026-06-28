import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { getBriefById } from '@/lib/briefs';
import { recordAudit } from '@/lib/audit';

// Tracked, expiring share link (Phase 1: token-in-URL; production: signed + stored).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const brief = await getBriefById(actor, id);
    if (!brief) return problem(404, 'Not Found', `brief '${id}' not found in this org`);

    const token = randomBytes(9).toString('base64url');
    const origin = new URL(req.url).origin;
    const url = `${origin}/copilot/${id}?share=${token}`;
    const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
    await recordAudit(actor, 'brief.share', id);
    return NextResponse.json({ url, expiresAt });
  } catch (e) {
    return handleError(e);
  }
}
