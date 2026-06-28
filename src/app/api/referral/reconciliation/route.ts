import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toPayout } from '@/lib/referral';

// GET payouts for reconciliation, optionally filtered by ?connector.
export async function GET(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const connector = new URL(req.url).searchParams.get('connector') ?? undefined;
    const rows = await prisma.payout.findMany({
      where: connector ? { connector } : undefined,
      orderBy: { period: 'asc' },
    });
    return NextResponse.json(rows.map(toPayout));
  } catch (e) {
    return handleError(e);
  }
}
