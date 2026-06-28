import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { getCommercialPolicy, setCommercialPolicy } from '@/lib/referral';

// GET the operator-configured commercial policy (ERP default, in-memory stub).
export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    return NextResponse.json([getCommercialPolicy()]);
  } catch (e) {
    return handleError(e);
  }
}

// PUT updates the policy (in-memory stub; no table migrated yet).
export async function PUT(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'members.manage');
    const body = await req.json();
    const next = setCommercialPolicy(body);
    await recordAudit(actor, 'commercial_policy.update', next.version);
    return NextResponse.json(next);
  } catch (e) {
    return handleError(e);
  }
}
