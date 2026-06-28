// ============================================================================
// Pluggable text embedder for pgvector retrieval.
//
// Anthropic has no embeddings API, so Phase 2 ships a deterministic LOCAL embedder
// (hashed token + bigram features → L2-normalized 256-d vector). It needs no extra
// API key, so the app runs out of the box. To swap in a real embedding provider
// (Voyage is Anthropic's recommendation, or OpenAI), implement `embed()` to call it
// and keep EMBED_DIM in sync with the column type — that is the only change needed.
// ============================================================================

export const EMBED_DIM = 256;

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;

function hash(str: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 1);
}

/** Deterministic local embedding. Same swap point as a hosted embeddings API. */
export async function embed(text: string): Promise<number[]> {
  const vec = new Array(EMBED_DIM).fill(0);
  const tokens = tokenize(text);
  const features = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) features.push(`${tokens[i]}_${tokens[i + 1]}`);

  for (const f of features) {
    const h = hash(f);
    const bucket = h % EMBED_DIM;
    const sign = (h & 0x100) === 0 ? 1 : -1;
    vec[bucket] += sign;
  }

  // L2 normalize (cosine distance in pgvector expects normalized vectors for stable ranking)
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

// pgvector literal: '[0.1,0.2,...]'
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.map((x) => x.toFixed(6)).join(',')}]`;
}

// Text used to represent a product in the vector space.
export function productEmbedText(p: {
  name: string;
  shortDescription: string;
  category: string;
  modules?: string[];
  regionsServed?: string[];
}): string {
  return [p.name, p.category, p.shortDescription, (p.modules ?? []).join(' '), (p.regionsServed ?? []).join(' ')]
    .filter(Boolean)
    .join('. ');
}
