import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import type { ApiKey } from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
// NEVER return a stored secret — only the masked form is ever exposed after creation.
export function toApiKey(r: any): ApiKey {
  return {
    id: r.id,
    name: r.name,
    env: r.env,
    maskedSecret: r.maskedSecret,
    scopes: r.scopes,
    lastUsedAt: r.lastUsedAt?.toISOString(),
  };
}

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const rows = await prisma.apiKey.findMany({
      where: { orgId: actor.orgId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(rows.map(toApiKey));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const env = body.env === 'test' ? 'test' : 'live';
    const scopes: string[] = Array.isArray(body.scopes) ? body.scopes.map(String) : [];
    if (!name) return problem(422, 'Invalid name', 'a key name is required');

    // Generate the secret once. We persist only a masked form — the full secret is
    // returned exactly once in this response (secretOnce) and never stored in clear.
    const raw = randomBytes(24).toString('hex');
    const secretOnce = `sk_${env}_${raw}`;
    const maskedSecret = `sk_${env}_••••${raw.slice(-4)}`;

    const row = await prisma.apiKey.create({
      data: { orgId: actor.orgId, name, env, maskedSecret, scopes },
    });
    await recordAudit(actor, 'api_key.create', row.id);
    return NextResponse.json({ key: toApiKey(row), secretOnce }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
