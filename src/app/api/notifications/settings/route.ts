import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import type { NotificationSettings } from '@/contracts/types';

const DEFAULTS: NotificationSettings = {
  types: { priceDrop: true, newVendor: true, renewal: true, weeklyDigest: false },
  channels: { email: true, inApp: true, slack: false },
};

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');
    return NextResponse.json((org.notifications as unknown as NotificationSettings) ?? DEFAULTS);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');

    const body = await req.json();
    const current = ((org.notifications as unknown as NotificationSettings) ?? DEFAULTS);
    const next: NotificationSettings = {
      types: {
        priceDrop: bool(body?.types?.priceDrop, current.types.priceDrop),
        newVendor: bool(body?.types?.newVendor, current.types.newVendor),
        renewal: bool(body?.types?.renewal, current.types.renewal),
        weeklyDigest: bool(body?.types?.weeklyDigest, current.types.weeklyDigest),
      },
      channels: {
        email: bool(body?.channels?.email, current.channels.email),
        inApp: bool(body?.channels?.inApp, current.channels.inApp),
        slack: bool(body?.channels?.slack, current.channels.slack),
      },
    };
    await prisma.organisation.update({ where: { id: actor.orgId }, data: { notifications: next as unknown as object } });
    await recordAudit(actor, 'notifications.update', actor.orgId);
    return NextResponse.json(next);
  } catch (e) {
    return handleError(e);
  }
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
