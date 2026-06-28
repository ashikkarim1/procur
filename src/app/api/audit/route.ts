import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import type { AuditEvent } from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toAuditEvent(r: any): AuditEvent {
  return {
    id: r.id,
    actor: r.actor,
    action: r.action,
    target: r.target ?? undefined,
    ip: r.ip ?? undefined,
    at: r.at.toISOString(),
    hash: r.hash,
    prevHash: r.prevHash,
  };
}

export async function GET(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const url = new URL(req.url);
    const actorFilter = url.searchParams.get('actor') ?? undefined;
    const actionFilter = url.searchParams.get('action') ?? undefined;
    const cursor = url.searchParams.get('cursor') ?? undefined;
    const take = 50;

    const rows = await prisma.auditEvent.findMany({
      where: {
        orgId: actor.orgId,
        ...(actorFilter ? { actor: actorFilter } : {}),
        ...(actionFilter ? { action: { contains: actionFilter } } : {}),
      },
      orderBy: { at: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    return NextResponse.json({
      data: page.map(toAuditEvent),
      nextCursor: hasMore ? page[page.length - 1].id : undefined,
    });
  } catch (e) {
    return handleError(e);
  }
}
