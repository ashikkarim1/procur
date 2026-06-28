import { prisma } from './prisma';
import type { Product, ProductWithVendor, Vendor, MigrationFactInput } from '@/contracts/graph';
import type { Candidate } from './ranker';

/* eslint-disable @typescript-eslint/no-explicit-any */

function rowToProduct(p: any): Product {
  return {
    id: p.id,
    vendorId: p.vendorId,
    name: p.name,
    slug: p.slug,
    category: p.category,
    shortDescription: p.shortDescription,
    editions: p.editions,
    modules: p.modules,
    deployment: p.deployment,
    apps: p.apps,
    browsers: p.browsers,
    languages: p.languages,
    regionsServed: p.regionsServed,
    releaseCadencePerYear: p.releaseCadencePerYear ?? undefined,
    sla: p.sla ?? undefined,
    technical: p.technical,
    pricing: p.pricing,
    aiScore: p.aiScore,
    integrations: p.integrations,
    reviewSummary: p.reviewSummary ?? undefined,
    ratingAvg: p.ratingAvg ?? undefined,
    ratingCount: p.ratingCount ?? undefined,
  };
}

function rowToVendor(v: any): Vendor {
  return {
    id: v.id,
    name: v.name,
    headquarters: v.headquarters,
    ownership: v.ownership,
    ticker: v.ticker ?? undefined,
    foundedYear: v.foundedYear,
    employees: v.employees ?? undefined,
    revenue: v.revenue ?? undefined,
    financialStability: v.financialStability ?? undefined,
    acquisitionHistory: v.acquisitionHistory ?? undefined,
  };
}

export async function listProducts(filter?: { category?: string }): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: filter?.category ? { category: filter.category } : undefined,
    orderBy: { name: 'asc' },
  });
  return rows.map(rowToProduct);
}

export async function getProductById(id: string): Promise<ProductWithVendor | null> {
  const p = await prisma.product.findUnique({ where: { id }, include: { vendor: true } });
  if (!p) return null;
  return { ...rowToProduct(p), vendor: rowToVendor(p.vendor) };
}

export async function getProductBySlug(slug: string): Promise<ProductWithVendor | null> {
  const p = await prisma.product.findUnique({ where: { slug }, include: { vendor: true } });
  if (!p) return null;
  return { ...rowToProduct(p), vendor: rowToVendor(p.vendor) };
}

export async function getMigrationFact(fromSystem: string, toProductId: string): Promise<MigrationFactInput | null> {
  const m = await prisma.migrationFact.findUnique({
    where: { fromSystem_toProductId: { fromSystem, toProductId } },
  });
  if (!m) return null;
  return {
    fromSystem: m.fromSystem,
    toProductId: m.toProductId,
    recordsAffected: m.recordsAffected ?? undefined,
    impacted: m.impacted as MigrationFactInput['impacted'],
    retrainingStaff: m.retrainingStaff ?? undefined,
    checklist: m.checklist,
  };
}

// Assemble ranking candidates (product + vendor stability + migration-from-system fact).
export async function getCandidates(category: string, fromSystem?: string): Promise<Candidate[]> {
  const rows = await prisma.product.findMany({ where: { category }, include: { vendor: true } });
  return candidatesFromRows(rows, fromSystem);
}

export async function getCandidatesByIds(ids: string[], fromSystem?: string): Promise<Candidate[]> {
  const rows = await prisma.product.findMany({ where: { id: { in: ids } }, include: { vendor: true } });
  // preserve caller order
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
  return candidatesFromRows(ordered, fromSystem);
}

async function candidatesFromRows(rows: any[], fromSystem?: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const p of rows) {
    const product = rowToProduct(p);
    const stability = (p.vendor.financialStability as { value?: string } | null)?.value;
    let migrationFact: MigrationFactInput | undefined;
    if (fromSystem) {
      const mf = await getMigrationFact(fromSystem, p.id);
      migrationFact = mf ?? undefined;
    }
    out.push({ product, vendorStability: stability, migrationFact });
  }
  return out;
}
