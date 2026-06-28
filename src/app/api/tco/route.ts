import { NextResponse } from 'next/server';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { getOrgContext } from '@/lib/data';
import { getProductById } from '@/lib/graph';
import { computeTCO } from '@/lib/tco';
import { resolveComputeRegion } from '@/lib/residency';

export async function POST(req: Request) {
  try {
    const { actor, profile } = await getOrgContext();
    requireCapability(actor.role, 'graph.read');
    const body = await req.json();
    const product = await getProductById(body.productId);
    if (!product) return problem(404, 'Not Found', `product '${body.productId}' not found`);
    const region = resolveComputeRegion(actor, body.region); // residency pin
    const tco = computeTCO(
      { product, seats: body.seats ?? profile.employees, region, horizonYears: body.horizonYears ?? 5 },
      profile,
    );
    return NextResponse.json(tco);
  } catch (e) {
    return handleError(e);
  }
}
