import { createHash } from 'crypto';
import { prisma } from './prisma';
import type { Actor } from './auth';

// Tamper-evident hash chain (SECURITY.md §6): each event's hash binds its content
// to the previous event's hash, so any retroactive edit breaks the chain.
export async function recordAudit(
  actor: Actor,
  action: string,
  target?: string,
  ip?: string,
): Promise<void> {
  const prev = await prisma.auditEvent.findFirst({
    where: { orgId: actor.orgId },
    orderBy: { at: 'desc' },
  });
  const prevHash = prev?.hash ?? 'GENESIS';
  const at = new Date();
  const payload = JSON.stringify({
    orgId: actor.orgId,
    actor: actor.memberId,
    action,
    target: target ?? null,
    ip: ip ?? null,
    at: at.toISOString(),
    prevHash,
  });
  const hash = createHash('sha256').update(payload).digest('hex');

  await prisma.auditEvent.create({
    data: { orgId: actor.orgId, actor: actor.memberId, action, target, ip, at, hash, prevHash },
  });
}
