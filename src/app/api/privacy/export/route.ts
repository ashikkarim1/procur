import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';

// DSAR — right to data portability. Queues an export job (stub) and audits the request.
export async function POST() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const requestId = `DSAR-EXP-${Date.now().toString(36).toUpperCase()}`;
    await recordAudit(actor, 'privacy.export.request', requestId);
    return NextResponse.json({ requestId, status: 'queued' }, { status: 202 });
  } catch (e) {
    return handleError(e);
  }
}
