import { prisma } from '../prisma';
import { embed, productEmbedText, toVectorLiteral } from './embedding';

// Embed every product and persist into the pgvector column. Idempotent; run after seed.
export async function embedAllProducts(): Promise<number> {
  const rows = await prisma.product.findMany();
  for (const p of rows) {
    const text = productEmbedText({
      name: p.name,
      shortDescription: p.shortDescription,
      category: p.category,
      modules: p.modules,
      regionsServed: p.regionsServed,
    });
    const vec = await embed(text);
    // numeric-only literal — safe to inline; Prisma can't bind a vector param directly
    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET embedding = '${toVectorLiteral(vec)}'::vector WHERE id = $1`,
      p.id,
    );
  }
  return rows.length;
}

export interface VectorHit {
  id: string;
  name: string;
  slug: string;
  category: string;
  distance: number;
}

// Semantic retrieval over the graph: cosine distance, optionally filtered by category.
export async function vectorSearch(queryText: string, opts?: { category?: string; limit?: number }): Promise<VectorHit[]> {
  const vec = await embed(queryText);
  const lit = toVectorLiteral(vec);
  const limit = Math.min(opts?.limit ?? 10, 100);
  const where = opts?.category ? `WHERE category = $1 AND embedding IS NOT NULL` : `WHERE embedding IS NOT NULL`;
  const args = opts?.category ? [opts.category] : [];
  const sql = `
    SELECT id, name, slug, category, (embedding <=> '${lit}'::vector) AS distance
    FROM "Product"
    ${where}
    ORDER BY embedding <=> '${lit}'::vector
    LIMIT ${limit}`;
  return prisma.$queryRawUnsafe<VectorHit[]>(sql, ...args);
}
