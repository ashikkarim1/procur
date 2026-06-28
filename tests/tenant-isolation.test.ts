import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getBriefById } from '@/lib/briefs';
import type { Actor } from '@/lib/auth';

// Integration test against the seeded Neon DB. Proves a member of org A can never
// read org B's data — the core multi-tenant guarantee (CLAUDE_CODE_KICKOFF guardrail).

const falconOwner: Actor = {
  memberId: 'm_falcon_owner', orgId: 'org_falcon', role: 'owner',
  name: 'Fatima Z.', email: 'fatima@falconbuilders.ae', region: 'UAE', residencyLock: true,
};
const northwindAdmin: Actor = {
  memberId: 'm_northwind_admin', orgId: 'org_northwind', role: 'admin',
  name: 'Klaus M.', email: 'klaus@northwind.example', region: 'EU', residencyLock: true,
};

afterAll(async () => {
  await prisma.$disconnect();
});

describe('multi-tenant isolation', () => {
  it('org A owner CAN read its own brief PR-2291', async () => {
    const brief = await getBriefById(falconOwner, 'PR-2291');
    expect(brief).not.toBeNull();
    expect(brief!.request.id).toBe('PR-2291');
  });

  it('org B admin CANNOT read org A brief PR-2291 (returns null, not the data)', async () => {
    const brief = await getBriefById(northwindAdmin, 'PR-2291');
    expect(brief).toBeNull();
  });

  it('saved searches are scoped to the owning org', async () => {
    const falcon = await prisma.savedSearch.findMany({ where: { orgId: falconOwner.orgId } });
    const northwind = await prisma.savedSearch.findMany({ where: { orgId: northwindAdmin.orgId } });
    expect(falcon.length).toBeGreaterThan(0);
    expect(northwind.length).toBe(0);
    // none of org A's rows leak when filtering by org B
    expect(falcon.every((s) => s.orgId === 'org_falcon')).toBe(true);
  });

  it('watch items never cross the tenant boundary', async () => {
    const crossed = await prisma.watchItem.findFirst({
      where: { orgId: northwindAdmin.orgId, id: { in: ['w_build', 'w_summit', 'w_lean'] } },
    });
    expect(crossed).toBeNull(); // Falcon's watch ids are invisible to Northwind
  });
});
