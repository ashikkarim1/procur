import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { getProductById } from '@/lib/graph';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) return problem(404, 'Not Found', `product '${id}' not found`);
    return NextResponse.json(product);
  } catch (e) {
    return handleError(e);
  }
}
