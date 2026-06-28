import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toImplementationPlan } from '@/lib/lifecycle';
import type { ChecklistItem } from '@/contracts/types';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'brief.create');
    const { id } = await params;
    const existing = await prisma.implementationPlan.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', `implementation plan '${id}' not found in this org`);

    const body = await req.json();
    const itemIndex = Number(body.itemIndex);
    const done = Boolean(body.done);
    const checklist = ((existing.goLiveChecklist as unknown as ChecklistItem[]) ?? []).slice();
    if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= checklist.length) {
      return problem(400, 'Bad Request', 'itemIndex out of range');
    }
    checklist[itemIndex] = { ...checklist[itemIndex], done };
    // Recompute milestones from the checklist completion.
    const milestonesDone = checklist.filter((c) => c.done).length;

    const row = await prisma.implementationPlan.update({
      where: { id },
      data: {
        goLiveChecklist: checklist as unknown as object[],
        milestonesDone,
        milestonesTotal: checklist.length,
      },
    });
    await recordAudit(actor, 'implementation.checklist', id);
    return NextResponse.json(toImplementationPlan(row));
  } catch (e) {
    return handleError(e);
  }
}
