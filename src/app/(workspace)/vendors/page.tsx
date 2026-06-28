import { getActor } from '@/lib/auth';
import { requireCapability } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { toVendorAccount, toMarketplacePartner } from '@/lib/referral';
import { Card, Eyebrow, Chip, Figure } from '@/components/primitives';
import { AgreementWorkspace } from '@/components/vendors/AgreementWorkspace';
import { InviteVendorButton } from '@/components/vendors/InviteVendorButton';
import { formatCompact, formatMoney, sumMoney } from '@/lib/money';
import { clsx } from '@/components/clsx';
import type { Lead, Payout, Money } from '@/contracts/types';

const LEAD_CHIP: Record<Lead['status'], 'neutral' | 'accent' | 'positive' | 'danger'> = {
  new: 'neutral', contacted: 'neutral', demo: 'accent', won: 'positive', lost: 'danger',
};
const PAYOUT_CHIP: Record<Payout['status'], 'neutral' | 'warning' | 'positive'> = {
  pending: 'warning', reconciled: 'neutral', paid: 'positive',
};

export default async function VendorsPage() {
  const actor = await getActor();
  requireCapability(actor.role, 'graph.read');

  const [vendorRow, partnerRows] = await Promise.all([
    prisma.vendorAccount.findUnique({
      where: { id: 'va_vendorco' },
      include: { agreements: { orderBy: { id: 'asc' } }, leads: { orderBy: { createdAt: 'desc' } }, payouts: true },
    }),
    prisma.marketplacePartner.findMany({ orderBy: { rating: 'desc' } }),
  ]);

  if (!vendorRow) return <div className="text-[14px] text-ink-muted">Vendor account not found.</div>;

  const vendor = toVendorAccount(vendorRow);
  const partners = partnerRows.map(toMarketplacePartner);

  const activeCount = vendor.agreements.filter((a) => a.status === 'active').length;
  const awaitingCount = vendor.agreements.filter((a) => a.status === 'submitted' || a.status === 'in_review').length;
  const leads30d = vendor.leads.length;
  const payoutTotal: Money = vendor.payouts.length
    ? sumMoney(vendor.payouts.map((p) => p.amount), vendor.payouts[0].amount.currency)
    : { amount: 0, currency: 'USD' };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[24px] font-medium text-ink">Vendor &amp; partner marketplace</h1>
          <p className="mt-1 text-[14px] text-ink-muted">
            Operate the seller side — referral agreements, AI policy review, leads and payouts.
          </p>
        </div>
        <InviteVendorButton />
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Active agreements" value={String(activeCount)} />
        <Kpi label="Awaiting review" value={String(awaitingCount)} tone={awaitingCount > 0 ? 'warning' : 'ink'} />
        <Kpi label="Leads (30d)" value={String(leads30d)} />
        <Kpi label="Payouts (30d)" value={formatCompact(payoutTotal)} tone="positive" />
      </div>

      {/* Agreement queue + detail (interactive) */}
      <AgreementWorkspace agreements={vendor.agreements} vendorName={vendor.name} />

      {/* Guardrail note */}
      <p className="mt-4 rounded-lg border border-line border-l-[3px] border-l-warning-bar bg-surface p-3 text-[12.5px] leading-relaxed text-ink-muted">
        Referral economics never affect a product&apos;s fit score or TCO ranking — sponsored placements are labelled, a
        block-flagged agreement never auto-activates, and every operator decision and payout is written to the audit log.
      </p>

      {/* Leads */}
      <Eyebrow className="mb-3 mt-8">Leads</Eyebrow>
      <Card className="mb-8 overflow-hidden p-0">
        <div className="grid border-b border-line bg-surface-2 px-4 py-2.5" style={{ gridTemplateColumns: '1fr 110px 1fr 120px' }}>
          {['Product', 'Status', 'Qualifying event', 'Value'].map((h) => <Eyebrow key={h}>{h}</Eyebrow>)}
        </div>
        {vendor.leads.map((l) => (
          <div key={l.id} className="grid items-center border-b border-line-soft px-4 py-3 last:border-0" style={{ gridTemplateColumns: '1fr 110px 1fr 120px' }}>
            <span className="font-mono text-[12px] text-ink-soft">{l.productId}</span>
            <Chip tone={LEAD_CHIP[l.status]} mono className="w-fit">{l.status.toUpperCase()}</Chip>
            <span className="text-[13px] text-ink-muted">{l.qualifyingEvent ?? '—'}</span>
            <Figure className="text-[13px]">{l.value ? formatCompact(l.value) : '—'}</Figure>
          </div>
        ))}
      </Card>

      {/* Payouts */}
      <Eyebrow className="mb-3">Payouts</Eyebrow>
      <Card className="mb-8 overflow-hidden p-0">
        <div className="grid border-b border-line bg-surface-2 px-4 py-2.5" style={{ gridTemplateColumns: '1fr 130px 110px 1fr' }}>
          {['Period', 'Amount', 'Status', 'Connector'].map((h) => <Eyebrow key={h}>{h}</Eyebrow>)}
        </div>
        {vendor.payouts.map((p) => (
          <div key={p.id} className="grid items-center border-b border-line-soft px-4 py-3 last:border-0" style={{ gridTemplateColumns: '1fr 130px 110px 1fr' }}>
            <span className="text-[13px] text-ink-soft">{p.period}</span>
            <Figure className="text-[14px]">{formatMoney(p.amount)}</Figure>
            <Chip tone={PAYOUT_CHIP[p.status]} mono className="w-fit">{p.status.toUpperCase()}</Chip>
            <span className="font-mono text-[12px] text-ink-faint">{p.connector ?? '—'}</span>
          </div>
        ))}
      </Card>

      {/* Marketplace partners */}
      <Eyebrow className="mb-3">Marketplace partners</Eyebrow>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {partners.map((pt) => (
          <Card key={pt.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif text-[16px] font-medium text-ink">{pt.name}</h3>
              {pt.verified && <Chip tone="accent" mono>VERIFIED</Chip>}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-faint">{pt.type.replace(/_/g, ' ')}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pt.regions.map((r) => <Chip key={r} mono>{r}</Chip>)}
            </div>
            <div className="mt-2 text-[12.5px] text-ink-muted">{pt.specialisations.join(' · ')}</div>
            {pt.rating != null && (
              <div className="mt-2 font-mono text-[12px] text-ink-soft">★ {pt.rating.toFixed(1)}</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone = 'ink' }: { label: string; value: string; tone?: 'ink' | 'warning' | 'positive' }) {
  return (
    <Card className="p-4">
      <Eyebrow>{label}</Eyebrow>
      <Figure
        tone={tone === 'positive' ? 'positive' : 'ink'}
        className={clsx('mt-1 text-[26px]', tone === 'warning' && 'text-warning')}
      >
        {value}
      </Figure>
    </Card>
  );
}
