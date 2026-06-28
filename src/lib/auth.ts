import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';
import type { Role, Region } from '@/contracts/types';

// ── Phase 1 dev auth ─────────────────────────────────────────────────────────
// No real IdP yet. The actor is resolved from the `x-actor-id` header or the
// `procur_actor` cookie → a Member, which yields the org (tenant) and role.
// Every org-scoped query MUST filter by actor.orgId — this is the tenant boundary.
// Defaults to the Falcon Builders owner so the app is usable out of the box.

export const DEFAULT_ACTOR_ID = 'm_falcon_owner';
export const ACTOR_HEADER = 'x-actor-id';
export const ACTOR_COOKIE = 'procur_actor';

export interface Actor {
  memberId: string;
  orgId: string;
  role: Role;
  name: string;
  email: string;
  region: Region;        // org region pin (residency)
  residencyLock: boolean;
}

export async function getActor(): Promise<Actor> {
  const hdrs = await headers();
  const cookieStore = await cookies();
  const actorId =
    hdrs.get(ACTOR_HEADER) ?? cookieStore.get(ACTOR_COOKIE)?.value ?? DEFAULT_ACTOR_ID;

  const member = await prisma.member.findUnique({
    where: { id: actorId },
    include: { org: true },
  });
  if (!member) throw new UnauthenticatedError(actorId);

  const privacy = member.org.privacy as { residencyLock?: boolean };
  return {
    memberId: member.id,
    orgId: member.orgId,
    role: member.role as Role,
    name: member.name,
    email: member.email,
    region: member.org.region as Region,
    residencyLock: Boolean(privacy?.residencyLock),
  };
}

export class UnauthenticatedError extends Error {
  constructor(public actorId: string) {
    super(`unknown actor '${actorId}'`);
    this.name = 'UnauthenticatedError';
  }
}
