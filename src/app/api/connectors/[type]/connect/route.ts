import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError, problem } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { CONNECTOR_CATALOGUE, toConnector } from '../../route';

export async function POST(_req: Request, { params }: { params: Promise<{ type: string }> }) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const { type } = await params;
    const cat = CONNECTOR_CATALOGUE.find((c) => c.type === type);
    if (!cat) return problem(404, 'Not Found', `unknown connector '${type}'`);

    const existing = await prisma.connector.findFirst({ where: { orgId: actor.orgId, type } });
    const nextStatus = existing?.status === 'connected' ? 'disconnected' : 'connected';

    const row = existing
      ? await prisma.connector.update({ where: { id: existing.id }, data: { status: nextStatus } })
      : await prisma.connector.create({
          data: { orgId: actor.orgId, type, name: cat.name, status: nextStatus, purpose: cat.purpose },
        });

    await recordAudit(actor, `connector.${nextStatus === 'connected' ? 'connect' : 'disconnect'}`, type);
    return NextResponse.json(toConnector(row));
  } catch (e) {
    return handleError(e);
  }
}
