import { getActor } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/data';
import { resolveComputeRegion } from '@/lib/residency';
import { recordAudit } from '@/lib/audit';
import { streamBrief, replayBrief, type BriefEvent } from '@/lib/copilot/llm';
import type { ProcurementBrief, ProcurementRequest } from '@/contracts/types';

export const dynamic = 'force-dynamic';

// SSE: reasoning_step | summary_token | recommendation | done (API_CONTRACT).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { actor, profile } = await getOrgContext();
  if (!can(actor.role, 'graph.read')) return new Response('forbidden', { status: 403 });
  const { id } = await params;

  // tenant-scoped: org A cannot stream org B's brief
  const row = await prisma.brief.findFirst({ where: { id, orgId: actor.orgId } });
  if (!row) return new Response('not found', { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: BriefEvent) =>
        controller.enqueue(encoder.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
      try {
        const payload = row.payload as unknown as ProcurementBrief;
        const alreadyDone = row.status === 'ready' && payload && Array.isArray(payload.shortlist) && payload.shortlist.length > 0;

        if (alreadyDone) {
          await replayBrief(payload, send);
        } else {
          const region = resolveComputeRegion(actor); // residency pin
          const request: ProcurementRequest = {
            id: row.id, profileId: profile.id, query: row.query,
            createdAt: row.createdAt.toISOString(), status: 'ready',
          };
          const brief = await streamBrief(
            { actor, profile, query: row.query, region, seats: profile.employees, request },
            send,
          );
          await prisma.brief.update({ where: { id: row.id }, data: { status: 'ready', payload: brief as unknown as object } });
          await recordAudit(actor, 'copilot.generate', row.id);
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'generation failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
