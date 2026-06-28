// Knowledge-graph types from spec/DATA_MODEL.md that the frozen contracts/types.ts
// references but does not itself export (Product, Vendor, etc.). These COMPLEMENT the
// frozen contract — they do not redefine anything in types.ts. Shared primitives
// (Money, Region, Sourced, Provenance) are imported from the frozen contract.
import type { Money, Region, Sourced, Provenance } from './types';

export type CategoryId =
  | 'erp' | 'crm' | 'accounting' | 'hr_payroll' | 'project_management'
  | 'field_service' | 'call_center' | 'bi_analytics' | string;

export interface Edition { name: string; tier: 'starter' | 'pro' | 'enterprise' | string }

export type Certification = 'SOC2' | 'ISO27001' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | string;

export interface TechnicalProfile {
  apis: ('REST' | 'GraphQL' | 'SOAP' | 'webhook')[];
  auth: ('OAuth2' | 'SSO_SAML' | 'SCIM' | 'API_key')[];
  certifications: Sourced<Certification>[];
  dataResidency: Region[];
  encryption: { atRest: boolean; inTransit: boolean; cmek?: boolean };
  backup: boolean;
  disasterRecovery: boolean;
}

export type PricingDimension =
  | 'per_seat' | 'consumption' | 'api_calls' | 'storage'
  | 'premium_support' | 'implementation' | 'flat';

export interface PricingLine {
  dimension: PricingDimension;
  unit?: string;
  amount?: Money;
  rangeLow?: Money;
  rangeHigh?: Money;
  notes?: string;
  provenance: Provenance[];
}

export interface PricingProfile {
  lines: PricingLine[];
  minimumCommitment?: { seats?: number; termMonths?: number };
  renewalUpliftPctPerYear?: Sourced<number>;
  hiddenFees?: { label: string; estimate?: Money }[];
  taxesNote?: string;
  currencyDefault: string;
}

export interface AIScore {
  overall: number;
  agentsAndAutomation: number;
  predictiveAnalytics: number;
  workflowPromptUX: number;
  maturity: number;
  methodologyVersion: string;
}

export interface IntegrationRef {
  targetId: string;
  name: string;
  kind: 'native' | 'marketplace' | 'api' | 'ipaas';
  certified?: boolean;
}

export interface ReviewSummary {
  strengths: { theme: string; weight: number; evidence: Provenance[] }[];
  weaknesses: { theme: string; weight: number; evidence: Provenance[] }[];
  idealCustomerProfile: string;
  notRecommendedWhen: string;
  sampleSize: number;
}

export interface Vendor {
  id: string;
  name: string;
  headquarters: { country: string; city?: string };
  ownership: 'public' | 'private' | 'pe_backed' | 'nonprofit';
  ticker?: string;
  foundedYear: number;
  employees?: Sourced<number>;
  revenue?: Sourced<Money>;
  totalFunding?: Sourced<Money>;
  customerCount?: Sourced<number>;
  financialStability?: Sourced<'A' | 'B' | 'C' | 'D'>;
  acquisitionHistory?: { name: string; year: number }[];
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  category: CategoryId;
  shortDescription: string;
  editions: Edition[];
  modules: string[];
  deployment: ('cloud' | 'hybrid' | 'on_prem')[];
  apps: { ios: boolean; android: boolean; desktop: boolean; offline: boolean };
  browsers: string[];
  languages: string[];
  regionsServed: Region[];
  releaseCadencePerYear?: number;
  sla?: Sourced<number>;
  technical: TechnicalProfile;
  pricing: PricingProfile;
  aiScore: AIScore;
  integrations: IntegrationRef[];
  reviewSummary?: ReviewSummary;
  ratingAvg?: number;
  ratingCount?: number;
}

// Product joined with its vendor — the shape the Profile screen renders.
export interface ProductWithVendor extends Product { vendor: Vendor }

// Raw, sourced inputs the deterministic migration calculator consumes.
export interface MigrationFactInput {
  fromSystem: string;
  toProductId: string;
  recordsAffected?: number;
  impacted: { integrations: number; workflows: number; dashboards: number; customCode: number };
  retrainingStaff?: number;
  consultingHours?: number;
  checklist: string[];
}
