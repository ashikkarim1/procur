import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { sendEmail, inviteMemberEmail } from '@/lib/email';
import { toMember } from '../route';
import type { Role } from '@/contracts/types';

const ROLES: Role[] = ['owner', 'admin', 'approver', 'member', 'viewer'];

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'members.manage');
    const body = await req.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const role = (body.role ?? 'member') as Role;

    if (!email || !/.+@.+\..+/.test(email)) {
      return problem(422, 'Invalid email', 'a valid email address is required');
    }
    if (!ROLES.includes(role)) {
      return problem(422, 'Invalid role', `role must be one of ${ROLES.join(', ')}`);
    }

    // Seat check: invited members count against the plan seat allowance.
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');
    const plan = org.plan as { seatsTotal?: number };
    const occupied = await prisma.member.count({
      where: { orgId: actor.orgId, status: { in: ['active', 'invited'] } },
    });
    if (plan.seatsTotal != null && occupied >= plan.seatsTotal) {
      return problem(409, 'Seats full', `all ${plan.seatsTotal} seats are taken — upgrade the plan to invite more members`);
    }

    // Reject duplicate email within the same org.
    const dupe = await prisma.member.findFirst({ where: { orgId: actor.orgId, email } });
    if (dupe) return problem(409, 'Already a member', `${email} is already on this team`);

    const id = `m_${actor.orgId.replace(/^org_/, '')}_${Math.random().toString(36).slice(2, 8)}`;
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const row = await prisma.member.create({
      data: { id, orgId: actor.orgId, name, email, role, status: 'invited' },
    });
    await recordAudit(actor, 'member.invite', row.id);

    // Send invitation email (fire-and-forget; don't block response on email failure)
    const inviteLink = `https://procur.tech/invite/${actor.orgId}/${id}`;
    sendEmail(inviteMemberEmail(email, org.name, actor.name, inviteLink)).catch((err) => {
      console.error(`Failed to send invite email to ${email}:`, err);
      // Don't throw — member was created, just email failed
    });

    return NextResponse.json(toMember(row), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
