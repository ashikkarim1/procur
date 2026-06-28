import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import type { Connector } from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toConnector(r: any): Connector {
  return { type: r.type, name: r.name, status: r.status, purpose: r.purpose ?? undefined };
}

// The catalogue of connectors the platform offers; merged with persisted state.
export const CONNECTOR_CATALOGUE: { type: string; name: string; purpose: string }[] = [
  { type: 'microsoft365', name: 'Microsoft 365', purpose: 'Identity, calendar & file context' },
  { type: 'google_workspace', name: 'Google Workspace', purpose: 'Identity, calendar & file context' },
  { type: 'slack', name: 'Slack', purpose: 'Alerts & approval routing' },
  { type: 'partnerstack', name: 'PartnerStack', purpose: 'Referral tracking & payouts' },
  { type: 'impact', name: 'Impact', purpose: 'Referral tracking & payouts' },
];

export async function listConnectors(orgId: string): Promise<Connector[]> {
  const rows = await prisma.connector.findMany({ where: { orgId } });
  const byType = new Map(rows.map((r) => [r.type, r]));
  return CONNECTOR_CATALOGUE.map((c) => {
    const row = byType.get(c.type);
    return row
      ? toConnector(row)
      : { type: c.type, name: c.name, status: 'disconnected' as const, purpose: c.purpose };
  });
}

export async function GET() {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'graph.read');
    return NextResponse.json(await listConnectors(actor.orgId));
  } catch (e) {
    return handleError(e);
  }
}
