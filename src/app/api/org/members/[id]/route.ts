import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { toMember } from '../route';
import type { Role, MemberStatus } from '@/contracts/types';

const ROLES: Role[] = ['owner', 'admin', 'approver', 'member', 'viewer'];
const STATUSES: MemberStatus[] = ['active', 'invited', 'suspended'];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'members.manage');
    const { id } = await params;
    const existing = await prisma.member.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', 'member not found in this org');

    const body = await req.json();
    const role = body.role as Role | undefined;
    const status = body.status as MemberStatus | undefined;
    if (role && !ROLES.includes(role)) return problem(422, 'Invalid role', `unknown role '${role}'`);
    if (status && !STATUSES.includes(status)) return problem(422, 'Invalid status', `unknown status '${status}'`);

    // Guard: never demote the last remaining owner (would orphan the org).
    if (existing.role === 'owner' && role && role !== 'owner') {
      const owners = await prisma.member.count({ where: { orgId: actor.orgId, role: 'owner' } });
      if (owners <= 1) return problem(409, 'Last owner', 'cannot change the role of the only owner — transfer ownership first');
    }

    const row = await prisma.member.update({
      where: { id },
      data: { role: role ?? undefined, status: status ?? undefined },
    });
    await recordAudit(actor, 'member.update', id);
    return NextResponse.json(toMember(row));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'members.manage');
    const { id } = await params;
    const existing = await prisma.member.findFirst({ where: { id, orgId: actor.orgId } });
    if (!existing) return problem(404, 'Not Found', 'member not found in this org');
    if (existing.role === 'owner') {
      const owners = await prisma.member.count({ where: { orgId: actor.orgId, role: 'owner' } });
      if (owners <= 1) return problem(409, 'Last owner', 'cannot remove the only owner — transfer ownership first');
    }
    await prisma.member.delete({ where: { id } });
    await recordAudit(actor, 'member.remove', id);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleError(e);
  }
}
