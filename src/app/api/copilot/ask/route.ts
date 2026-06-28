import { NextResponse } from 'next/server';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { getOrgContext } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

// Phase 2: ask creates a PENDING brief and returns its id. The client then opens
// GET /copilot/briefs/:id/stream, which generates (LLM or fallback) and streams.
export async function POST(req: Request) {
  try {
    const { actor, profile } = await getOrgContext();
    requireCapability(actor.role, 'brief.create');
    const body = await req.json();
    const query = (body.query ?? '').trim();
    if (!query) return problem(400, 'Bad Request', 'query is required');

    let id = newId();
    // avoid the (rare) collision with an existing id
    for (let i = 0; i < 5 && (await prisma.brief.findUnique({ where: { id } })); i++) id = newId();

    await prisma.brief.create({
      data: { id, orgId: actor.orgId, profileId: profile.id, query, status: 'analyzing', payload: {} },
    });
    await recordAudit(actor, 'copilot.ask', id);
    return NextResponse.json({ briefId: id }, { status: 202 });
  } catch (e) {
    return handleError(e);
  }
}

function newId(): string {
  return `PR-${2000 + Math.floor(Math.random() * 8000)}`;
}
