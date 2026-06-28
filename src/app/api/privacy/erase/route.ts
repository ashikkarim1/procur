import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

// DSAR — right to erasure. Owner-only (org.transfer) and requires explicit confirmation.
export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'org.transfer');
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== true) {
      return problem(422, 'Confirmation required', 'erasure must be confirmed with { confirm: true }');
    }
    const requestId = `DSAR-ERA-${Date.now().toString(36).toUpperCase()}`;
    await recordAudit(actor, 'privacy.erase.request', requestId);
    return NextResponse.json({ requestId, status: 'scheduled' }, { status: 202 });
  } catch (e) {
    return handleError(e);
  }
}
