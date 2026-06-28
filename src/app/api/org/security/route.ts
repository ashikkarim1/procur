import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import type { SecuritySettings } from '@/contracts/types';

const KEYS: (keyof SecuritySettings)[] = [
  'twofaEnforced', 'ssoEnforced', 'scimEnabled', 'ipAllowlistEnabled', 'shortSessionTimeout', 'encryptExports',
];

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');
    return NextResponse.json(org.security);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const org = await prisma.organisation.findUnique({ where: { id: actor.orgId } });
    if (!org) return problem(404, 'Not Found', 'org not found');

    const body = await req.json();
    const current = (org.security ?? {}) as unknown as Partial<SecuritySettings>;
    const patch: Partial<SecuritySettings> = {};
    for (const k of KEYS) {
      if (typeof body[k] === 'boolean') (patch as Record<string, unknown>)[k] = body[k];
    }
    if (Array.isArray(body.ipAllowlist)) patch.ipAllowlist = body.ipAllowlist.map(String);

    const next = { ...current, ...patch } as SecuritySettings;
    await prisma.organisation.update({ where: { id: actor.orgId }, data: { security: next as unknown as object } });
    await recordAudit(actor, 'security.update', actor.orgId);
    return NextResponse.json(next);
  } catch (e) {
    return handleError(e);
  }
}
