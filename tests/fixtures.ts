import { readFileSync } from 'fs';
import { join } from 'path';
import type { Product, MigrationFactInput } from '@/contracts/graph';
import type { BusinessProfile } from '@/contracts/types';

const seed = JSON.parse(readFileSync(join(__dirname, '..', '..', 'design', 'seed.json'), 'utf-8'));

export const profile: BusinessProfile = seed.businessProfiles[0];

export function product(id: string): Product {
  return seed.products.find((p: { id: string }) => p.id === id);
}

export function migrationFact(toProductId: string): MigrationFactInput {
  const m = seed.migrationEstimates.find((x: { toProductId: string }) => x.toProductId === toProductId);
  return {
    fromSystem: m.fromSystem,
    toProductId: m.toProductId,
    recordsAffected: m.recordsAffected,
    impacted: m.impacted,
    retrainingStaff: m.retrainingStaff,
    checklist: m.checklist ?? [],
  };
}
