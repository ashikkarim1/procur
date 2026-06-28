import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toMarketplacePartner } from '@/lib/referral';

// GET marketplace partners, optionally filtered by ?type and ?region.
export async function GET(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? undefined;
    const region = url.searchParams.get('region') ?? undefined;
    const rows = await prisma.marketplacePartner.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(region ? { regions: { has: region } } : {}),
      },
      orderBy: { rating: 'desc' },
    });
    return NextResponse.json(rows.map(toMarketplacePartner));
  } catch (e) {
    return handleError(e);
  }
}
