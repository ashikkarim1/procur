import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/data';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { actor, profile } = await getOrgContext();
    requireCapability(actor.role, 'members.manage'); // Only owners/admins can change billing

    const body = await req.json();
    const tier = body.tier as 'starter' | 'team';
    const seats = Number(body.seats);

    if (!['starter', 'team'].includes(tier)) {
      return problem(400, 'Bad Request', 'tier must be "starter" or "team"');
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > 100) {
      return problem(400, 'Bad Request', 'seats must be between 1 and 100');
    }

    const session = await createCheckoutSession(actor.orgId, tier, seats, actor.email);
    return NextResponse.json({ sessionId: session.id, url: session.url }, { status: 200 });
  } catch (e) {
    return handleError(e);
  }
}
