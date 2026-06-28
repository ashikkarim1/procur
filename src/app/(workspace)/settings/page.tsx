import { getOrgContext } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { toMember } from '@/app/api/org/members/route';
import { toInvoice } from '@/app/api/billing/invoices/route';
import { toApiKey } from '@/app/api/api-keys/route';
import { listConnectors } from '@/app/api/connectors/route';
import { toAuditEvent } from '@/app/api/audit/route';
import { computeUsage } from '@/app/api/billing/usage/route';
import { SettingsClient } from '@/components/settings/SettingsClient';
import type {
  Member, SecuritySettings, PrivacySettings, Plan, NotificationSettings, Invoice, ApiKey, Connector, AuditEvent, Usage,
} from '@/contracts/types';

export default async function SettingsPage() {
  const { actor, profile } = await getOrgContext();

  const [org, memberRows, invoiceRows, apiKeyRows, connectors, auditRows, usage] = await Promise.all([
    prisma.organisation.findUnique({ where: { id: actor.orgId } }),
    prisma.member.findMany({ where: { orgId: actor.orgId }, orderBy: { lastActiveAt: 'desc' } }),
    prisma.invoice.findMany({ where: { orgId: actor.orgId }, orderBy: { issuedAt: 'desc' } }),
    prisma.apiKey.findMany({ where: { orgId: actor.orgId }, orderBy: { createdAt: 'desc' } }),
    listConnectors(actor.orgId),
    prisma.auditEvent.findMany({ where: { orgId: actor.orgId }, orderBy: { at: 'desc' }, take: 50 }),
    computeUsage(actor.orgId),
  ]);

  if (!org) throw new Error(`no org ${actor.orgId}`);

  const members: Member[] = memberRows.map(toMember);
  const security = org.security as unknown as SecuritySettings;
  const privacy = org.privacy as unknown as PrivacySettings;
  const plan = org.plan as unknown as Plan;
  const notifications = (org.notifications as unknown as NotificationSettings) ?? {
    types: { priceDrop: true, newVendor: true, renewal: true, weeklyDigest: false },
    channels: { email: true, inApp: true, slack: false },
  };
  const invoices: Invoice[] = invoiceRows.map(toInvoice);
  const apiKeys: ApiKey[] = apiKeyRows.map(toApiKey);
  const auditEvents: AuditEvent[] = auditRows.map(toAuditEvent);

  return (
    <div>
      <h1 className="font-serif text-[24px] font-medium text-ink">Settings</h1>
      <p className="mb-5 mt-1 text-[14px] text-ink-muted">
        Account, team, security, privacy, billing, API, notifications, audit.
      </p>

      <SettingsClient
        actor={{ name: actor.name, email: actor.email, role: actor.role, orgName: org.name }}
        profile={profile}
        members={members}
        security={security}
        privacy={privacy}
        plan={plan}
        usage={usage as Usage}
        invoices={invoices}
        apiKeys={apiKeys}
        connectors={connectors as Connector[]}
        notifications={notifications}
        auditEvents={auditEvents}
      />
    </div>
  );
}
