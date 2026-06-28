/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '../src/generated/prisma';
import { buildBrief, type Candidate } from '../src/lib/ranker';
import type { Product, MigrationFactInput } from '../src/contracts/graph';
import type { BusinessProfile, ProcurementRequest } from '../src/contracts/types';

const prisma = new PrismaClient();

const seedPath = join(__dirname, '..', '..', 'design', 'seed.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf-8'));

// ── Org-level settings defaults (DESIGN_SPEC §toggle defaults) ────────────────
const securityDefaults = {
  twofaEnforced: true,
  ssoEnforced: false,
  scimEnabled: true,
  ipAllowlistEnabled: false,
  shortSessionTimeout: true,
  encryptExports: true,
};
const privacyFalcon = {
  residencyLock: true,
  region: 'UAE',
  autoDeleteAfterRetention: false,
  retentionMonths: 24,
  consents: { analytics: true, marketing: false, profiling: false },
};
const planFalcon = {
  tier: 'team',
  term: 'annual',
  renewsAt: '2027-01-31',
  seatsUsed: 5,
  seatsTotal: 10,
  price: { amount: 480000, currency: 'USD' },
};
const notificationsDefaults = {
  types: { priceDrop: true, newVendor: true, renewal: true, weeklyDigest: false },
  channels: { email: true, inApp: true, slack: false },
};

async function main() {
  // Clean (idempotent reseed)
  await prisma.$transaction([
    prisma.brief.deleteMany(),
    prisma.auditEvent.deleteMany(),
    prisma.savedSearch.deleteMany(),
    prisma.watchItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.connector.deleteMany(),
    prisma.negotiation.deleteMany(),
    prisma.implementationPlan.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.referralAgreement.deleteMany(),
    prisma.vendorAccount.deleteMany(),
    prisma.marketplacePartner.deleteMany(),
    prisma.migrationFact.deleteMany(),
    prisma.product.deleteMany(),
    prisma.vendor.deleteMany(),
    prisma.businessProfile.deleteMany(),
    prisma.member.deleteMany(),
    prisma.organisation.deleteMany(),
  ]);

  const bp = seed.businessProfiles[0];

  // ── Org A: Falcon Builders (the demo tenant) ───────────────────────────────
  await prisma.organisation.create({
    data: {
      id: 'org_falcon',
      name: bp.orgName,
      region: 'UAE',
      plan: planFalcon,
      security: securityDefaults,
      privacy: privacyFalcon,
      notifications: notificationsDefaults,
      profile: {
        create: {
          id: bp.id,
          orgName: bp.orgName,
          country: bp.country,
          city: bp.city ?? null,
          industry: bp.industry,
          employees: bp.employees,
          revenue: bp.revenue ?? null,
          currentStack: bp.currentStack,
          compliance: bp.compliance ?? [],
          dataResidencyRequired: bp.dataResidencyRequired ?? [],
          budget: bp.budget ?? null,
          growthPlans: bp.growthPlans ?? null,
        },
      },
      members: {
        create: [
          { id: 'm_falcon_owner', name: 'Fatima Z.', email: 'fatima@falconbuilders.ae', role: 'owner', status: 'active', lastActiveAt: new Date() },
          { id: 'm_falcon_cfo', name: 'Omar R. (CFO)', email: 'omar@falconbuilders.ae', role: 'approver', status: 'active' },
          { id: 'm_falcon_analyst', name: 'Priya N.', email: 'priya@falconbuilders.ae', role: 'member', status: 'active' },
          { id: 'm_falcon_auditor', name: 'External Auditor', email: 'auditor@advisory.example', role: 'viewer', status: 'invited' },
        ],
      },
    },
  });

  // ── Org B: Northwind Trading (exists ONLY to prove tenant isolation) ────────
  await prisma.organisation.create({
    data: {
      id: 'org_northwind',
      name: 'Northwind Trading',
      region: 'EU',
      plan: { ...planFalcon, seatsUsed: 2 },
      security: securityDefaults,
      privacy: { ...privacyFalcon, region: 'EU' },
      notifications: notificationsDefaults,
      profile: {
        create: {
          id: 'bp_northwind',
          orgName: 'Northwind Trading',
          country: 'Germany',
          city: 'Berlin',
          industry: 'Wholesale',
          employees: 90,
          currentStack: { accounting: 'Xero', productivity: 'Google Workspace' },
          compliance: ['EU_residency'],
          dataResidencyRequired: ['EU'],
          budget: { amount: 8000000, currency: 'EUR' },
        },
      },
      members: {
        create: [{ id: 'm_northwind_admin', name: 'Klaus M.', email: 'klaus@northwind.example', role: 'admin', status: 'active' }],
      },
    },
  });

  // ── Vendors ────────────────────────────────────────────────────────────────
  for (const v of seed.vendors) {
    await prisma.vendor.create({
      data: {
        id: v.id,
        name: v.name,
        headquarters: v.headquarters,
        ownership: v.ownership,
        ticker: v.ticker ?? null,
        foundedYear: v.foundedYear,
        employees: v.employees ?? null,
        revenue: v.revenue ?? null,
        financialStability: v.financialStability ?? null,
        acquisitionHistory: v.acquisitionHistory ?? null,
      },
    });
  }

  // ── Products (long-tail attributes + provenance stored as jsonb) ────────────
  for (const p of seed.products) {
    await prisma.product.create({
      data: {
        id: p.id,
        vendorId: p.vendorId,
        name: p.name,
        slug: p.slug,
        category: p.category,
        shortDescription: p.shortDescription,
        editions: p.editions,
        modules: p.modules ?? [],
        deployment: p.deployment ?? [],
        apps: p.apps,
        browsers: p.browsers ?? [],
        languages: p.languages ?? [],
        regionsServed: p.regionsServed ?? [],
        releaseCadencePerYear: p.releaseCadencePerYear ?? null,
        sla: p.sla ?? null,
        technical: p.technical,
        pricing: p.pricing,
        aiScore: p.aiScore,
        integrations: p.integrations,
        reviewSummary: p.reviewSummary ?? null,
        ratingAvg: p.ratingAvg ?? null,
        ratingCount: p.ratingCount ?? null,
      },
    });
  }

  // ── Migration facts (raw inputs only — calculator derives difficulty/score/weeks) ──
  for (const m of seed.migrationEstimates) {
    await prisma.migrationFact.create({
      data: {
        fromSystem: m.fromSystem,
        toProductId: m.toProductId,
        recordsAffected: m.recordsAffected ?? null,
        impacted: m.impacted,
        retrainingStaff: m.retrainingStaff ?? null,
        consultingHours: m.consultingHours ?? null,
        checklist: m.checklist ?? [],
      },
    });
  }

  // ── Saved searches (Falcon) — three rows per DESIGN_SPEC §9 ─────────────────
  await prisma.savedSearch.createMany({
    data: [
      {
        id: 'ss_erp', orgId: 'org_falcon', createdBy: 'm_falcon_owner',
        title: 'Best ERP under $150k — Dubai construction',
        query: seed.procurementBriefs[0].request.query,
        filters: { category: 'erp', budgetMax: { amount: 15000000, currency: 'USD' }, residency: ['UAE'], tags: ['QuickBooks migration'] },
        lastRunAt: new Date(Date.now() - 2 * 864e5), lastResultCount: 41,
        delta: { newSinceLastRun: 2, priceChanges: 0 }, alertsEnabled: true,
      },
      {
        id: 'ss_crm', orgId: 'org_falcon', createdBy: 'm_falcon_owner',
        title: 'CRM for field sales — Salesforce alternatives',
        query: 'CRM for field sales teams, Salesforce alternatives, M365 native',
        filters: { category: 'crm', budgetMax: { amount: 6000000, currency: 'USD' }, tags: ['M365 native'] },
        lastRunAt: new Date(Date.now() - 7 * 864e5), lastResultCount: 28,
        delta: { newSinceLastRun: 0, priceChanges: 0 }, alertsEnabled: false,
      },
      {
        id: 'ss_cc', orgId: 'org_falcon', createdBy: 'm_falcon_analyst',
        title: 'AI call center — UAE data residency',
        query: 'AI call center with Arabic NLU and UAE data residency',
        filters: { category: 'call_center', residency: ['UAE'], tags: ['Arabic NLU'] },
        lastRunAt: new Date(Date.now() - 21 * 864e5), lastResultCount: 17,
        delta: { newSinceLastRun: 0, priceChanges: 1 }, alertsEnabled: true,
      },
    ],
  });

  // ── Watchlist (Falcon) ──────────────────────────────────────────────────────
  await prisma.watchItem.createMany({
    data: [
      { id: 'w_build', orgId: 'org_falcon', productId: 'p_buildledger', alerts: ['price', 'ai_update'], signal: { kind: 'price', display: '▼ price −4%', tone: 'positive' } },
      { id: 'w_summit', orgId: 'org_falcon', productId: 'p_summit', alerts: ['ai_update'], signal: { kind: 'ai_update', display: '◆ new AI module', tone: 'warning' } },
      { id: 'w_lean', orgId: 'org_falcon', productId: 'p_leanerp', alerts: ['renewal'], signal: { kind: 'renewal', display: '▲ renewal +4%', tone: 'danger' } },
    ],
  });

  const usd = (amount: number) => ({ amount, currency: 'USD' });

  // ── Billing: invoice history (Falcon) ──────────────────────────────────────
  await prisma.invoice.createMany({
    data: [
      { id: 'inv_2026_06', orgId: 'org_falcon', period: 'Jun 2026', amount: usd(480000), status: 'due', pdfUrl: '/api/billing/invoices/inv_2026_06/pdf', issuedAt: new Date('2026-06-01') },
      { id: 'inv_2026_05', orgId: 'org_falcon', period: 'May 2026', amount: usd(480000), status: 'paid', pdfUrl: '/api/billing/invoices/inv_2026_05/pdf', issuedAt: new Date('2026-05-01') },
      { id: 'inv_2026_04', orgId: 'org_falcon', period: 'Apr 2026', amount: usd(480000), status: 'paid', pdfUrl: '/api/billing/invoices/inv_2026_04/pdf', issuedAt: new Date('2026-04-01') },
      { id: 'inv_2026_03', orgId: 'org_falcon', period: 'Mar 2026', amount: usd(480000), status: 'paid', pdfUrl: '/api/billing/invoices/inv_2026_03/pdf', issuedAt: new Date('2026-03-01') },
      { id: 'inv_2026_02', orgId: 'org_falcon', period: 'Feb 2026', amount: usd(480000), status: 'failed', pdfUrl: '/api/billing/invoices/inv_2026_02/pdf', issuedAt: new Date('2026-02-01') },
    ],
  });

  // ── API keys & connectors (Falcon) ─────────────────────────────────────────
  await prisma.apiKey.createMany({
    data: [
      { id: 'key_live_1', orgId: 'org_falcon', name: 'Production server', env: 'live', maskedSecret: 'sk_live_••••••••4f2a', scopes: ['graph.read', 'tco.read', 'brief.read'], lastUsedAt: new Date(Date.now() - 36e5) },
      { id: 'key_test_1', orgId: 'org_falcon', name: 'CI sandbox', env: 'test', maskedSecret: 'sk_test_••••••••9b1c', scopes: ['graph.read'], lastUsedAt: new Date(Date.now() - 5 * 864e5) },
    ],
  });
  await prisma.connector.createMany({
    data: [
      { id: 'con_m365', orgId: 'org_falcon', type: 'microsoft365', name: 'Microsoft 365', status: 'connected', purpose: 'SSO · directory' },
      { id: 'con_gw', orgId: 'org_falcon', type: 'google_workspace', name: 'Google Workspace', status: 'disconnected' },
      { id: 'con_slack', orgId: 'org_falcon', type: 'slack', name: 'Slack', status: 'connected', purpose: 'Notifications' },
      { id: 'con_partnerstack', orgId: 'org_falcon', type: 'partnerstack', name: 'PartnerStack', status: 'disconnected', purpose: 'Referral reconciliation' },
      { id: 'con_impact', orgId: 'org_falcon', type: 'impact', name: 'Impact', status: 'error', purpose: 'Referral reconciliation' },
    ],
  });

  // ── Negotiation agent (NG-4471) ─────────────────────────────────────────────
  await prisma.negotiation.create({
    data: {
      id: 'NG-4471', orgId: 'org_falcon', productId: 'p_buildledger', briefId: 'PR-2291',
      status: 'negotiating',
      listPrice: usd(14000000), currentOffer: usd(11900000), securedDelta: usd(-2100000),
      levers: [
        { label: 'Volume discount (200 seats)', state: 'secured', result: '−15% secured' },
        { label: 'Renewal cap 5%/yr', state: 'secured', result: 'capped' },
        { label: 'Waive implementation fee', state: 'in_play' },
        { label: '20 extra seats free Y1', state: 'queued' },
        { label: '3-yr price lock', state: 'lost', result: 'vendor declined' },
      ],
      thread: [
        { author: 'agent', action: 'opened', body: 'Opened on Falcon Builders’ guardrails: ≤$150k, ≤36mo, UAE residency. Requesting volume pricing for 200 seats + renewal cap.', at: '2026-02-25T09:00:00Z' },
        { author: 'vendor', action: 'countered', body: 'Can offer 10% at 200 seats; renewal uplift held at 5%/yr for the initial term.', at: '2026-02-25T13:20:00Z' },
        { author: 'agent', action: 'countered', body: 'Pushing to 15% given multi-module commitment and a public reference. Asking to waive the $18k implementation fee.', at: '2026-02-26T10:05:00Z' },
        { author: 'vendor', body: '15% approved. Implementation fee waiver under review with our deal desk.', at: '2026-02-26T15:40:00Z' },
        { author: 'agent', body: 'Reviewing the vendor’s latest terms against your guardrails…', at: '2026-02-26T15:42:00Z' },
      ],
      guardrails: { maxBudget: usd(15000000), maxTermMonths: 36, residency: 'UAE', approver: 'Omar R. (CFO)' },
    },
  });

  // ── Implementation plan (IMP-3301) ──────────────────────────────────────────
  await prisma.implementationPlan.create({
    data: {
      id: 'IMP-3301', orgId: 'org_falcon', productId: 'p_buildledger', fromSystem: 'QuickBooks', totalWeeks: 14,
      partner: { id: 'pt_dubai1', name: 'Gulf Implementation Partners', type: 'implementation', region: 'UAE' },
      milestonesDone: 2, milestonesTotal: 5,
      phases: [
        { name: 'Discovery & chart-of-accounts mapping', weekRange: 'Wk 1–2', state: 'done', detail: 'Mapped QuickBooks GL to BuildLedger schema; signed off by finance.' },
        { name: 'Environment & SSO/SCIM setup', weekRange: 'Wk 3–4', state: 'done', detail: 'UAE region provisioned; Microsoft 365 SSO + SCIM provisioning live.' },
        { name: 'Data migration & parallel run', weekRange: 'Wk 5–9', state: 'active', detail: 'Migrating 6 yrs of GL history; one parallel close cycle in progress.', progressPct: 45 },
        { name: 'Workflow & dashboard rebuild', weekRange: 'Wk 10–12', state: 'pending', detail: 'Rebuild 12 workflows + 6 dashboards; UAT with project controllers.' },
        { name: 'Cutover & go-live', weekRange: 'Wk 13–14', state: 'pending', detail: 'Final cutover, hypercare, decommission QuickBooks.' },
      ],
      risks: [
        { title: 'QuickBooks history fidelity', detail: 'Two custom journals need manual remap before cutover.', tone: 'warning', owner: 'Priya N.' },
        { title: 'Project-controller availability', detail: 'UAT overlaps with quarter-end close — schedule buffer added.', tone: 'warning', owner: 'Gulf Implementation Partners' },
        { title: 'Residency verified', detail: 'All data confirmed hosted in UAE region.', tone: 'positive' },
      ],
      kpis: [
        { label: 'Close cycle time', target: '−30% by Q4' },
        { label: 'Manual journal entries', target: '−50%' },
        { label: 'Project cost-variance visibility', target: 'Real-time' },
      ],
      goLiveChecklist: [
        { label: 'Chart of accounts signed off', done: true },
        { label: 'SSO + SCIM provisioning', done: true },
        { label: 'One parallel close cycle complete', done: false },
        { label: '12 workflows rebuilt', done: false },
        { label: '6 dashboards rebuilt', done: false },
        { label: 'Cutover runbook approved', done: false },
      ],
    },
  });

  // ── Marketplace partners ────────────────────────────────────────────────────
  await prisma.marketplacePartner.createMany({
    data: [
      { id: 'pt_dubai1', name: 'Gulf Implementation Partners', type: 'implementation', regions: ['UAE'], specialisations: ['ERP', 'Construction'], verified: true, rating: 4.7 },
      { id: 'pt_dubai2', name: 'Emirates ERP Consulting', type: 'systems_integrator', regions: ['UAE'], specialisations: ['ERP', 'Migration'], verified: true, rating: 4.5 },
      { id: 'pt_eu1', name: 'Rhein Systems Group', type: 'systems_integrator', regions: ['EU'], specialisations: ['ERP', 'Compliance'], verified: true, rating: 4.4 },
      { id: 'pt_us1', name: 'Lone Star Integrators', type: 'implementation', regions: ['US'], specialisations: ['ERP', 'Field service'], verified: false, rating: 4.1 },
      { id: 'pt_tr1', name: 'Falcon Training Co', type: 'training', regions: ['UAE'], specialisations: ['Change management'], verified: true, rating: 4.6 },
      { id: 'pt_msp1', name: 'Apex Managed Services', type: 'managed_service', regions: ['APAC'], specialisations: ['Hosting', 'Support'], verified: false, rating: 4.0 },
    ],
  });

  // ── Vendor account + referral agreements (AI policy review) + leads + payouts ─
  const policyReview = (id: string, recommendation: string, flags: object[]) => ({
    agreementId: id, flags, recommendation, reviewedAt: '2026-02-24T12:00:00Z', policyVersion: 'commercial-policy-v3',
  });
  await prisma.vendorAccount.create({
    data: {
      id: 'va_vendorco', name: 'VendorCo', productIds: ['p_buildledger'], verified: true,
      agreements: {
        create: [
          {
            id: 'RA-0912', productId: 'p_buildledger', feeType: 'percentage', feeValue: 12, recurring: false,
            qualifiedLeadDef: 'Demo booked', cookieDays: 90, territories: ['UAE', 'EU'], exclusions: ['Existing pipeline'],
            minContractValue: usd(2500000), paymentTiming: 'Net 30', connector: 'impact', trackingLink: 'https://go.procur.tech/v/vendorco', status: 'in_review',
            policyReview: policyReview('RA-0912', 'counter', [
              { field: 'cookieDays', severity: 'ok', title: '90-day cookie window', detail: 'Within the 30–120 day policy band.', clauseRef: '§2.1' },
              { field: 'feeValue', severity: 'warn', title: 'Fee above category band', detail: '12% exceeds the 8–10% ERP band.', suggestion: 'Counter at 10% recurring, or 12% one-time only.', clauseRef: '§3.2' },
              { field: 'exclusions', severity: 'block', title: 'Broad exclusion clause', detail: '“Existing pipeline” is undefined and could void most attributed leads.', suggestion: 'Require a named-account exclusion list, not a blanket clause.', clauseRef: '§4.4' },
            ]),
          },
          {
            id: 'RA-0913', productId: 'p_buildledger', feeType: 'percentage', feeValue: 8, recurring: true,
            qualifiedLeadDef: 'Closed won', cookieDays: 60, territories: ['UAE'], exclusions: [],
            minContractValue: usd(5000000), paymentTiming: 'Net 30', connector: 'partnerstack', trackingLink: 'https://go.procur.tech/v/vendorco-active', status: 'active',
            documentUrl: '/api/referral/agreements/RA-0913/document',
            signatures: [{ party: 'vendor', signedAt: '2026-01-20T10:00:00Z' }, { party: 'platform', signedAt: '2026-01-21T09:00:00Z' }],
            policyReview: policyReview('RA-0913', 'approve', [
              { field: 'feeValue', severity: 'ok', title: '8% recurring', detail: 'In band; recurring aligns incentives.', clauseRef: '§3.2' },
              { field: 'paymentTiming', severity: 'ok', title: 'Net 30', detail: 'Standard payment timing.', clauseRef: '§5.1' },
            ]),
          },
          {
            id: 'RA-0914', feeType: 'flat', feeValue: 50000, recurring: false,
            qualifiedLeadDef: 'Trial started', cookieDays: 45, territories: ['EU', 'US'], exclusions: [],
            paymentTiming: 'Net 45', connector: 'cj', status: 'countered',
            policyReview: policyReview('RA-0914', 'counter', [
              { field: 'qualifiedLeadDef', severity: 'warn', title: 'Weak qualification', detail: '“Trial started” is low-intent vs. demo/closed-won.', suggestion: 'Tighten to “demo completed”.', clauseRef: '§2.3' },
              { field: 'paymentTiming', severity: 'ok', title: 'Net 45', detail: 'Acceptable.', clauseRef: '§5.1' },
            ]),
          },
          {
            id: 'RA-0915', feeType: 'percentage', feeValue: 22, recurring: false,
            qualifiedLeadDef: 'Demo booked', cookieDays: 180, territories: ['GLOBAL'], exclusions: ['Government', 'Education'],
            paymentTiming: 'Net 60', status: 'submitted',
            policyReview: policyReview('RA-0915', 'reject', [
              { field: 'feeValue', severity: 'block', title: 'Fee far above band', detail: '22% is more than double the ERP ceiling.', suggestion: 'Reject; invite resubmission ≤10%.', clauseRef: '§3.2' },
              { field: 'cookieDays', severity: 'warn', title: '180-day cookie', detail: 'Exceeds the 120-day cap.', suggestion: 'Cap at 120 days.', clauseRef: '§2.1' },
            ]),
          },
        ],
      },
      leads: {
        create: [
          { id: 'ld_1', productId: 'p_buildledger', agreementId: 'RA-0913', buyerOrgId: 'org_falcon', status: 'won', qualifyingEvent: 'Closed won', value: usd(11900000), createdAt: new Date('2026-02-26') },
          { id: 'ld_2', productId: 'p_buildledger', agreementId: 'RA-0913', status: 'demo', qualifyingEvent: 'Demo booked', value: usd(8000000), createdAt: new Date('2026-02-20') },
          { id: 'ld_3', productId: 'p_buildledger', agreementId: 'RA-0913', status: 'contacted', qualifyingEvent: 'Inbound', createdAt: new Date('2026-02-18') },
          { id: 'ld_4', productId: 'p_buildledger', status: 'new', qualifyingEvent: 'Comparison view', createdAt: new Date('2026-02-27') },
          { id: 'ld_5', productId: 'p_buildledger', agreementId: 'RA-0913', status: 'lost', qualifyingEvent: 'Budget', createdAt: new Date('2026-01-30') },
        ],
      },
      payouts: {
        create: [
          { id: 'po_1', agreementId: 'RA-0913', amount: usd(952000), status: 'paid', period: 'Jan 2026', connector: 'partnerstack' },
          { id: 'po_2', agreementId: 'RA-0913', amount: usd(640000), status: 'reconciled', period: 'Feb 2026', connector: 'partnerstack' },
          { id: 'po_3', agreementId: 'RA-0913', amount: usd(312000), status: 'pending', period: 'Mar 2026', connector: 'partnerstack' },
        ],
      },
    },
  });

  // ── Pre-generate the PR-2291 brief from the REAL ranker (computed, not seeded numbers) ──
  const candidates: Candidate[] = seed.products.map((p: any) => {
    const vendor = seed.vendors.find((v: any) => v.id === p.vendorId);
    const mig = seed.migrationEstimates.find((m: any) => m.toProductId === p.id);
    const fact: MigrationFactInput | undefined = mig
      ? {
          fromSystem: mig.fromSystem,
          toProductId: mig.toProductId,
          recordsAffected: mig.recordsAffected,
          impacted: mig.impacted,
          retrainingStaff: mig.retrainingStaff,
          checklist: mig.checklist ?? [],
        }
      : undefined;
    return { product: p as Product, vendorStability: vendor?.financialStability?.value, migrationFact: fact };
  });

  const profile = { ...bp } as BusinessProfile;
  const req: ProcurementRequest = {
    id: 'PR-2291',
    profileId: bp.id,
    query: seed.procurementBriefs[0].request.query,
    createdAt: seed.procurementBriefs[0].request.createdAt,
    status: 'ready',
  };
  const brief = buildBrief({
    request: req,
    profile,
    candidates,
    region: 'UAE',
    seats: bp.employees,
    scannedTotal: seed.products.length,
  });

  await prisma.brief.create({
    data: {
      id: 'PR-2291', orgId: 'org_falcon', profileId: bp.id,
      query: req.query, status: 'ready', createdAt: new Date(req.createdAt),
      payload: brief as any,
    },
  });

  console.log('✓ Seeded: 2 orgs, %d vendors, %d products, %d migration facts, 3 saved searches, 3 watch items, brief PR-2291',
    seed.vendors.length, seed.products.length, seed.migrationEstimates.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
