import Link from 'next/link';
import { getActor } from '@/lib/auth';
import { listProducts } from '@/lib/graph';
import { Card, Eyebrow, Monogram, Chip } from '@/components/primitives';
import { gradeOf, shortName, monogram } from '@/lib/score';

export default async function ProductIndex() {
  await getActor();
  const products = await listProducts();

  return (
    <div>
      <h1 className="font-serif text-[24px] font-medium text-ink">Software profiles</h1>
      <p className="mb-6 mt-1 text-[14px] text-ink-muted">Knowledge-graph object pages — one per product.</p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {products.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`}>
            <Card className="flex items-start gap-4 p-[18px] transition hover:border-line-strong">
              <Monogram letter={monogram(p.name)} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-[17px] font-medium text-ink">{shortName(p.name)}</span>
                  <Chip tone="positive">{gradeOf(p.aiScore.overall)}</Chip>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{p.shortDescription}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip mono>{p.category.toUpperCase()}</Chip>
                  {p.technical.dataResidency.includes('UAE') && <Chip mono tone="accent">UAE residency</Chip>}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <Eyebrow className="mt-6 text-ink-fainter">Seed catalog · Phase 1</Eyebrow>
    </div>
  );
}
