import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { listProducts } from '@/lib/graph';

export async function GET(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? undefined;
    const data = await listProducts({ category });
    return NextResponse.json({ data });
  } catch (e) {
    return handleError(e);
  }
}
