import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { getMigrationFact } from '@/lib/graph';
import { computeMigration } from '@/lib/migration';

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const body = await req.json();
    const fact = await getMigrationFact(body.fromSystem, body.toProductId);
    if (!fact) return problem(404, 'Not Found', `no migration model for ${body.fromSystem} → ${body.toProductId}`);
    return NextResponse.json(computeMigration(fact));
  } catch (e) {
    return handleError(e);
  }
}
