import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { toBusinessProfile } from '@/lib/data';

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const org = await prisma.organisation.findUnique({
      where: { id: actor.orgId },
      include: { profile: true, members: true },
    });
    if (!org || !org.profile) return problem(404, 'Not Found', 'org not found');
    return NextResponse.json({
      id: org.id,
      name: org.name,
      region: org.region,
      profile: toBusinessProfile(org.profile),
      members: org.members.map((m) => ({
        id: m.id, name: m.name, email: m.email, role: m.role, status: m.status,
        lastActiveAt: m.lastActiveAt?.toISOString(),
      })),
      security: org.security,
      privacy: org.privacy,
      plan: org.plan,
    });
  } catch (e) {
    return handleError(e);
  }
}
