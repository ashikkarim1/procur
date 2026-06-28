// ============================================================================
// Procur — v1 API & Domain Contract  (FROZEN for Phase 1–2 build)
// ----------------------------------------------------------------------------
// This is the single source of truth a Claude Code build implements against.
// It supersedes nothing in DATA_MODEL.md — it *locks* the subset the UI and the
// API exchange, plus the new lifecycle (negotiation, implementation) types.
//
// Conventions:
//   • Money is minor units in a stated currency: { amount: 12800000, currency: 'USD' } = $128,000.00
//   • All ids are opaque strings. All dates are ISO-8601 strings.
//   • `Sourced<T>` / `Provenance` carry data lineage — never strip them from graph responses.
//   • Enums are closed. Adding a value is a breaking change → bump to v2.
// ============================================================================

export type ISODate = string;
export type Money = { amount: number; currency: string };
export type Region = 'UAE' | 'EU' | 'US' | 'UK' | 'APAC' | 'GLOBAL';

export type SourceKind =
  | 'vendor_supplied' | 'public_doc' | 'verified_review'
  | 'community' | 'analyst' | 'buyer_reported' | 'inferred';
export interface Provenance { source: SourceKind; url?: string; asOf: ISODate; confidence: number; }
export type Sourced<T> = { value: T; provenance: Provenance[] };

// ─────────────────────────────── Buyer context ──────────────────────────────
export interface BusinessProfile {
  id: string;
  orgName: string;
  country: string; city?: string;
  industry: string;
  employees: number;
  revenue?: Money;
  currentStack: { erp?: string; crm?: string; accounting?: string; cloud?: string; productivity?: string; other?: string[]; };
  compliance: string[];                 // e.g. ['UAE_residency']
  dataResidencyRequired?: Region[];
  budget?: Money;
  growthPlans?: string;
}

// ───────────────────────── Copilot: the typed brief ─────────────────────────
// The Copilot MUST emit a ProcurementBrief (structured tool-calling), never free text.
// The UI renders directly from this shape.
export type BriefStatus = 'analyzing' | 'ready' | 'in_negotiation' | 'archived';
export type Confidence = 'High' | 'Medium' | 'Low';
export type StepState = 'done' | 'active' | 'pending';
export type Difficulty = 'low' | 'medium' | 'high';

export interface ProcurementRequest {
  id: string;                           // 'PR-2291'
  profileId: string;
  query: string;
  createdAt: ISODate;
  status: BriefStatus;
}

export interface ReasoningStep {        // one per LLM tool-call → renders the trace
  label: string; detail?: string; state: StepState; count?: number;
}

export interface PartnerRef {
  id: string; name: string;
  type: 'implementation' | 'consultant' | 'msp' | 'freelancer' | 'systems_integrator' | 'training' | 'managed_service';
  region: Region;
}

export interface Recommendation {
  productId: string;
  rank: number;
  fitScore: number;                     // 0–100 → the ring
  isTopPick: boolean;
  tco: TCOModel;                        // 5-yr
  implementationWeeks: number;
  migration?: MigrationEstimate;
  localPartners: PartnerRef[];
  residencyOk: boolean;
  reasons: string[];                    // "why it wins" bullets (top pick)
  tradeoff?: string;                    // one-liner (alternatives)
}

export interface ProcurementBrief {
  request: ProcurementRequest;
  summary: string;                      // Newsreader lead paragraph
  scanned: number; viable: number;      // 4210 → 41
  reasoning: ReasoningStep[];
  shortlist: Recommendation[];
  confidence: Confidence;
  sources: { label: string; count: number | string }[];
  region: Region;                       // where this was computed (residency)
}

// ──────────────────── TCO & migration (deterministic) ───────────────────────
export type TCOCategory =
  | 'licenses' | 'implementation' | 'integrations' | 'training'
  | 'internal_labor' | 'support_renewal' | 'hardware' | 'cloud' | 'custom_dev' | 'maintenance';
export interface TCOLine { category: TCOCategory; byYear: Money[]; provenance: Provenance[]; }
export interface TCOModel {
  productId: string; seats: number; region: Region; horizonYears: number;
  lines: TCOLine[];
  cumulativeByYear: Money[];            // Y1..Y5 → bars
  total: Money;                         // 5-yr total
  licenseSharePct: number;             // "32%" callout
}
export interface MigrationEstimate {
  fromSystem: string; toProductId: string;
  difficulty: Difficulty; score: number; estWeeks: number;
  recordsAffected?: number;
  impacted: { integrations: number; workflows: number; dashboards: number; customCode: number };
  retrainingStaff?: number;
  downtimeRisk: Difficulty;
  consultingHours?: number;
  checklist: string[];
}

// ─────────────────────── Comparison matrix (UI shape) ───────────────────────
export interface ComparisonColumn { productId: string; name: string; tag?: string; isTopPick: boolean; }
export interface ComparisonRow {
  dimension: string;                    // '5-yr total cost', 'Migration difficulty', …
  cells: { productId: string; display: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' }[];
}
export interface ComparisonMatrix { profileId: string; columns: ComparisonColumn[]; rows: ComparisonRow[]; }

// ───────────────────────── Saved searches & watchlist ───────────────────────
export interface SavedSearch {
  id: string; orgId: string; createdBy: string;
  title: string; query: string;
  filters: { category?: string; budgetMax?: Money; residency?: Region[]; tags?: string[] };
  lastRunAt?: ISODate; lastResultCount?: number;
  delta?: { newSinceLastRun: number; priceChanges: number };
  alertsEnabled: boolean;
}
export interface WatchItem {
  id: string; orgId: string; productId: string; addedAt: ISODate;
  alerts: ('price' | 'renewal' | 'ai_update' | 'security')[];
  signal?: { kind: 'price' | 'ai_update' | 'renewal'; display: string; tone: 'positive' | 'warning' | 'danger' };
}

// ─────────────────── Negotiation agent (lifecycle screen) ───────────────────
export type NegotiationStatus = 'drafting' | 'negotiating' | 'awaiting_approval' | 'agreed' | 'declined';
export type LeverState = 'secured' | 'in_play' | 'queued' | 'lost';
export interface NegotiationLever { label: string; state: LeverState; result?: string; }      // '−15% secured'
export interface NegotiationMessage { author: 'agent' | 'vendor' | 'user'; action?: string; body: string; at: ISODate; }
export interface NegotiationGuardrails { maxBudget?: Money; maxTermMonths?: number; residency?: Region; approver?: string; }
export interface Negotiation {
  id: string;                           // 'NG-4471'
  orgId: string; productId: string; briefId?: string;
  status: NegotiationStatus;
  listPrice: Money; currentOffer: Money; securedDelta: Money;   // savings so far (negative = savings)
  levers: NegotiationLever[];
  thread: NegotiationMessage[];
  guardrails: NegotiationGuardrails;
}

// ───────────────── Implementation planner (lifecycle screen) ─────────────────
export type PhaseState = 'done' | 'active' | 'pending';
export interface ImplementationPhase {
  name: string; weekRange: string;      // 'Wk 5–9'
  state: PhaseState; detail: string;
  progressPct?: number;                 // active phase bar
}
export interface ImplementationRisk { title: string; detail: string; tone: 'warning' | 'positive' | 'danger'; owner?: string; }
export interface ImplementationKPI { label: string; target: string; }
export interface ChecklistItem { label: string; done: boolean; }
export interface ImplementationPlan {
  id: string; orgId: string; productId: string;
  fromSystem: string; totalWeeks: number;
  partner?: PartnerRef;
  milestonesDone: number; milestonesTotal: number;
  phases: ImplementationPhase[];
  risks: ImplementationRisk[];
  kpis: ImplementationKPI[];
  goLiveChecklist: ChecklistItem[];
}

// ──────────────────────── Org, members & settings ───────────────────────────
export type Role = 'owner' | 'admin' | 'approver' | 'member' | 'viewer';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export interface Member { id: string; name: string; email: string; role: Role; status: MemberStatus; lastActiveAt?: ISODate; }

export interface SecuritySettings {     // Settings → Security toggles
  twofaEnforced: boolean;
  ssoEnforced: boolean;
  scimEnabled: boolean;
  ipAllowlistEnabled: boolean;
  ipAllowlist?: string[];               // CIDRs
  shortSessionTimeout: boolean;
  encryptExports: boolean;
}
export interface Session { id: string; device: string; location: string; browser: string; lastSeenAt: ISODate; current: boolean; }

export type ConsentBasis = 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
export interface ConsentRecord { purpose: string; granted: boolean; basis: ConsentBasis; version: string; at: ISODate; }
export interface PrivacySettings {      // Settings → Data & privacy
  residencyLock: boolean; region: Region;
  autoDeleteAfterRetention: boolean; retentionMonths: number;
  consents: { analytics: boolean; marketing: boolean; profiling: boolean };
}

export interface ApiKey { id: string; name: string; env: 'live' | 'test'; maskedSecret: string; scopes: string[]; lastUsedAt?: ISODate; }
export interface Connector { type: string; name: string; status: 'connected' | 'disconnected' | 'error'; purpose?: string; }

export interface NotificationSettings {
  types: { priceDrop: boolean; newVendor: boolean; renewal: boolean; weeklyDigest: boolean };
  channels: { email: boolean; inApp: boolean; slack: boolean };
}

export interface AuditEvent { id: string; actor: string; action: string; target?: string; ip?: string; at: ISODate; hash: string; prevHash: string; }

export interface Plan { tier: 'starter' | 'team' | 'enterprise'; term: 'monthly' | 'annual'; renewsAt: ISODate; seatsUsed: number; seatsTotal: number; price: Money; }
export interface Usage { seats: { used: number; total: number }; apiCalls: { used: number; included: number }; negotiations: number; queries: number; }
export interface Invoice { id: string; period: string; amount: Money; status: 'paid' | 'due' | 'failed'; pdfUrl: string; }

// ──────────────────────────────── Org root ──────────────────────────────────
export interface Organisation {
  id: string; name: string; region: Region;
  profile: BusinessProfile;
  members: Member[];
  security: SecuritySettings;
  privacy: PrivacySettings;
  plan: Plan;
}

// ─────────────── Vendor portal & referral marketplace (seller side) ──────────
export type ReferralStatus = 'submitted' | 'in_review' | 'countered' | 'approved' | 'active' | 'rejected' | 'paused';
export type FeeType = 'percentage' | 'flat';
export type ReferralConnector = 'impact' | 'partnerstack' | 'cj' | 'shareasale' | 'custom';

export interface ReferralAgreement {
  id: string;                           // 'RA-0912'
  vendorId: string; productId?: string;
  feeType: FeeType;
  feeValue: number;                     // % or Money minor units (flat)
  recurring: boolean;
  qualifiedLeadDef: string;             // 'Demo booked'
  cookieDays?: number;
  territories?: Region[];
  exclusions?: string[];
  minContractValue?: Money;
  paymentTiming: string;                // 'Net 30'
  cancellationTerms?: string;
  connector?: ReferralConnector;
  trackingLink?: string;                // unique link/partner-ID the program issues to procur.tech (operational secret per program; see REFERRAL_REGISTRY.md)
  status: ReferralStatus;
  policyReview?: PolicyReview;
  documentUrl?: string;
  signatures?: { party: 'vendor' | 'platform'; signedAt: ISODate }[];
}

export type FlagSeverity = 'ok' | 'warn' | 'block';
export interface PolicyFlag {
  field: string; severity: FlagSeverity;
  title: string; detail: string;
  suggestion?: string; clauseRef?: string;
}
export interface PolicyReview {
  agreementId: string;
  flags: PolicyFlag[];
  recommendation: 'approve' | 'counter' | 'reject';
  redlineUrl?: string;
  reviewedAt: ISODate; policyVersion: string;
}

export interface CommercialPolicy {     // operator-configured, per category
  category?: string;
  feeBand: { min: number; max: number };
  defaultCookieDays: number;
  allowedPaymentTerms: string[];
  requiredClauses: string[];
  blockedExclusions: string[];
  version: string;
}

export interface Lead {
  id: string; vendorId: string; productId: string; agreementId?: string;
  buyerOrgId?: string;
  status: 'new' | 'contacted' | 'demo' | 'won' | 'lost';
  qualifyingEvent?: string; value?: Money; createdAt: ISODate;
}
export interface Payout {
  id: string; vendorId: string; agreementId: string;
  amount: Money; status: 'pending' | 'reconciled' | 'paid';
  period: string; connector?: ReferralConnector;
}
export interface MarketplacePartner {
  id: string; name: string;
  type: PartnerRef['type'];
  regions: Region[]; specialisations: string[]; verified: boolean; rating?: number;
}

export interface VendorAccount {        // the seller-side org
  id: string; name: string;
  productIds: string[];
  agreements: ReferralAgreement[];
  leads: Lead[];
  payouts: Payout[];
  verified: boolean;
}
