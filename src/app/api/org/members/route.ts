import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import type { Member } from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toMember(r: any): Member {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    lastActiveAt: r.lastActiveAt?.toISOString(),
  };
}

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const rows = await prisma.member.findMany({
      where: { orgId: actor.orgId },
      orderBy: { lastActiveAt: 'desc' },
    });
    return NextResponse.json(rows.map(toMember));
  } catch (e) {
    return handleError(e);
  }
}
