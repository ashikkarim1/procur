import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { handleError } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';

function csvCell(v: string | null | undefined): string {
  const s = v ?? '';
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request) {
  try {
    const actor = await getActor();
    requireCapability(actor.role, 'security.manage');
    const url = new URL(req.url);
    const format = url.searchParams.get('format') ?? 'csv';

    const rows = await prisma.auditEvent.findMany({
      where: { orgId: actor.orgId },
      orderBy: { at: 'desc' },
    });

    const header = ['at', 'actor', 'action', 'target', 'ip', 'hash', 'prevHash'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [r.at.toISOString(), r.actor, r.action, r.target, r.ip, r.hash, r.prevHash].map(csvCell).join(','),
      );
    }
    await recordAudit(actor, 'audit.export', format);

    return new NextResponse(lines.join('\n'), {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="audit-log-${actor.orgId}.csv"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
