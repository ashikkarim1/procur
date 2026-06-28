/* eslint-disable @typescript-eslint/no-explicit-any */
import Anthropic from '@anthropic-ai/sdk';
import type {
  BusinessProfile, ProcurementBrief, ProcurementRequest, ReasoningStep, Region, Recommendation,
} from '@/contracts/types';
import type { Actor } from '../auth';
import { prisma } from '../prisma';
import { getProductById, getCandidatesByIds, getMigrationFact } from '../graph';
import { computeTCO } from '../tco';
import { computeMigration } from '../migration';
import { buildBrief, type BriefNarrative, type Candidate } from '../ranker';
import { resolveCategory } from '../briefs';
import { vectorSearch } from './retrieval';
import { formatCompact } from '../money';
import { shortName } from '../score';

export const MODEL = process.env.PROCUR_LLM_MODEL ?? 'claude-opus-4-8';
export const hasLLM = () => Boolean(process.env.ANTHROPIC_API_KEY);

// SSE event union (mirrors API_CONTRACT: reasoning_step | summary_token | recommendation | done)
export type BriefEvent =
  | { type: 'reasoning_step'; step: ReasoningStep }
  | { type: 'summary_token'; token: string }
  | { type: 'recommendation'; rec: Recommendation; meta: { name: string; vendor: string; slug: string } }
  | { type: 'done'; brief: ProcurementBrief }
  | { type: 'error'; message: string };

export type Emit = (e: BriefEvent) => void;

export interface StreamArgs {
  actor: Actor;
  profile: BusinessProfile;
  query: string;
  region: Region;
  seats: number;
  request: ProcurementRequest;
}

// ── Public entry: stream a brief via LLM if a key is present, else the rules ranker ──
export async function streamBrief(args: StreamArgs, emit: Emit): Promise<ProcurementBrief> {
  if (hasLLM()) {
    try {
      return await runLLM(args, emit);
    } catch (e) {
      // Never fail the user: degrade to the deterministic ranker.
      emit({ type: 'reasoning_step', step: { label: 'LLM unavailable — using deterministic ranker', state: 'done' } });
      console.error('[copilot] LLM path failed, falling back', e);
      return runFallback(args, emit);
    }
  }
  return runFallback(args, emit);
}

// Replay an already-generated brief over the same event protocol (for re-opened streams).
export async function replayBrief(brief: ProcurementBrief, emit: Emit) {
  for (const step of brief.reasoning) emit({ type: 'reasoning_step', step });
  await emitBriefTail(brief, emit);
}

// ── Shared tail: emit summary tokens + recommendation events + done ───────────
async function emitBriefTail(brief: ProcurementBrief, emit: Emit) {
  for (const tok of brief.summary.match(/\S+\s*/g) ?? [brief.summary]) {
    emit({ type: 'summary_token', token: tok });
  }
  for (const rec of brief.shortlist) {
    const p = await getProductById(rec.productId);
    emit({
      type: 'recommendation',
      rec,
      meta: { name: p ? shortName(p.name) : rec.productId, vendor: p?.vendor.name ?? '', slug: p?.slug ?? '' },
    });
  }
  emit({ type: 'done', brief });
}

// ── Fallback (no API key): deterministic ranker, streamed for a consistent UX ──
async function runFallback(args: StreamArgs, emit: Emit): Promise<ProcurementBrief> {
  const { profile, request, region, seats, query } = args;
  const category = resolveCategory(query);
  const fromSystem = profile.currentStack.accounting ?? profile.currentStack.erp;
  // semantic retrieval still runs in the fallback path
  const hits = await vectorSearch(query, { category, limit: 8 });
  const ids = hits.map((h) => h.id);
  const candidates = await getCandidatesByIds(ids.length ? ids : [], fromSystem);
  const scannedTotal = await prisma.product.count();
  const brief = buildBrief({ request, profile, candidates, region, seats, scannedTotal });
  for (const step of brief.reasoning) emit({ type: 'reasoning_step', step });
  await emitBriefTail(brief, emit);
  return brief;
}

// ── LLM orchestration: manual tool-use loop, each tool-call → a ReasoningStep ──
async function runLLM(args: StreamArgs, emit: Emit): Promise<ProcurementBrief> {
  const { actor, profile, request, region, seats, query } = args;
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const fromSystem = profile.currentStack.accounting ?? profile.currentStack.erp;
  const scannedTotal = await prisma.product.count();

  const steps: ReasoningStep[] = [];
  const seenStepKeys = new Set<string>();
  const pushStep = (key: string, step: ReasoningStep) => {
    if (seenStepKeys.has(key)) return;
    seenStepKeys.add(key);
    steps.push(step);
    emit({ type: 'reasoning_step', step });
  };

  pushStep('profile', {
    label: 'Read your profile',
    detail: [profile.industry, ...(profile.dataResidencyRequired ?? []).map((r) => `${r} residency`), profile.currentStack.accounting]
      .filter(Boolean).join(' · '),
    state: 'done',
  });

  let finalize: { summary: string; items: { productId: string; reasons?: string[]; tradeoff?: string }[] } | null = null;
  const selectedIds = new Set<string>();

  async function handleTool(name: string, input: any): Promise<any> {
    if (name === 'search_graph') {
      const category = input.category || resolveCategory(input.query ?? query);
      const hits = await vectorSearch(input.query ?? query, { category, limit: input.limit ?? 8 });
      pushStep('search', { label: 'Searched the knowledge graph', detail: 'semantic retrieval + filters', state: 'done', count: hits.length });
      const out = [];
      for (const h of hits) {
        const p = await getProductById(h.id);
        if (!p) continue;
        const required = profile.dataResidencyRequired ?? [];
        out.push({
          productId: p.id, name: shortName(p.name), vendor: p.vendor.name, category: p.category,
          dataResidency: p.technical.dataResidency,
          residencyOkForProfile: required.every((r) => p.technical.dataResidency.includes(r)),
          aiScore: p.aiScore.overall,
          integrations: p.integrations.map((i) => i.name),
          relevance: Number((1 - h.distance).toFixed(3)),
        });
      }
      return out;
    }
    if (name === 'compute_tco') {
      const p = await getProductById(input.productId);
      if (!p) return { error: 'unknown product' };
      pushStep('tco', { label: 'Modeled 5-yr TCO', detail: 'deterministic, auditable calculator', state: 'done' });
      const tco = computeTCO({ product: p, seats, region, horizonYears: 5 }, profile);
      return { total: formatCompact(tco.total), totalMinor: tco.total.amount, licenseSharePct: tco.licenseSharePct };
    }
    if (name === 'compute_migration') {
      const fact = fromSystem ? await getMigrationFact(fromSystem, input.productId) : null;
      pushStep('migration', { label: 'Estimated migration effort', detail: fromSystem ? `from ${fromSystem}` : undefined, state: 'done' });
      if (!fact) return { note: 'no migration model for this pair' };
      const m = computeMigration(fact);
      return { difficulty: m.difficulty, score: m.score, estWeeks: m.estWeeks, downtimeRisk: m.downtimeRisk };
    }
    if (name === 'finalize_brief') {
      finalize = input;
      for (const it of input.items ?? []) selectedIds.add(it.productId);
      pushStep('rank', { label: 'Ranked & assembled the brief', detail: `${region} partners attached`, state: 'done' });
      return { ok: true };
    }
    return { error: `unknown tool ${name}` };
  }

  const messages: any[] = [{ role: 'user', content: userPrompt(profile, query, region) }];
  let guard = 0;
  while (guard++ < 8) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      thinking: { type: 'adaptive' },
      system: SYSTEM,
      tools: TOOLS as any,
      messages,
    } as any);

    messages.push({ role: 'assistant', content: resp.content }); // echo thinking + tool_use back

    if (resp.stop_reason !== 'tool_use') break;
    const results: any[] = [];
    for (const block of resp.content as any[]) {
      if (block.type === 'tool_use') {
        const out = await handleTool(block.name, block.input);
        results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out) });
      }
    }
    messages.push({ role: 'user', content: results });
    if (finalize) break;
  }

  // Assemble deterministically from the model's selections + narrative.
  const ids = [...selectedIds];
  const candidates: Candidate[] = await getCandidatesByIds(ids.length ? ids : await fallbackIds(query, fromSystem), fromSystem);

  const narrative: BriefNarrative | undefined = finalize
    ? {
        summary: (finalize as any).summary,
        reasons: Object.fromEntries(((finalize as any).items ?? []).map((it: any) => [it.productId, it.reasons ?? []])),
        tradeoffs: Object.fromEntries(((finalize as any).items ?? []).filter((it: any) => it.tradeoff).map((it: any) => [it.productId, it.tradeoff])),
      }
    : undefined;

  const brief = buildBrief({ request, profile, candidates, region, seats, scannedTotal, narrative, reasoning: steps });
  void actor;
  await emitBriefTail(brief, emit);
  return brief;
}

async function fallbackIds(query: string, fromSystem?: string): Promise<string[]> {
  const hits = await vectorSearch(query, { category: resolveCategory(query), limit: 6 });
  void fromSystem;
  return hits.map((h) => h.id);
}

// ── Prompts & tool schemas ────────────────────────────────────────────────────
const SYSTEM = `You are Procur's AI procurement copilot — a decision engine, not a chatbot.
Given a buyer's business profile and a natural-language request, produce a procurement-grade shortlist.

Hard rules:
- You MUST use the tools. Never invent product names, prices, scores, or migration effort.
- All numbers (5-yr TCO, migration difficulty, fit) come from the calculators and the platform's deterministic ranker — your job is query understanding, retrieval, and clear synthesis.
- Respect the buyer's data-residency requirement: flag any product that cannot host in the required region as a residency risk in its tradeoff, but you may still include it if it is otherwise strong.
- Never let any commercial/referral consideration affect your selection; rank on fit to the buyer only.

Workflow: call search_graph to retrieve candidates → call compute_tco and compute_migration for the serious contenders → then call finalize_brief exactly once with a crisp lead summary and, for each shortlisted product, 2-3 "why it wins" reasons (top pick) or a one-line tradeoff (alternatives). Keep prose concrete and grounded in the tool results. The summary should read like an analyst's lead paragraph and name the strongest option.`;

function userPrompt(profile: BusinessProfile, query: string, region: Region): string {
  return [
    `BUYER PROFILE:`,
    `- Org: ${profile.orgName} (${profile.industry}, ${profile.employees} staff, ${[profile.city, profile.country].filter(Boolean).join(', ')})`,
    `- Current stack: ${JSON.stringify(profile.currentStack)}`,
    `- Data residency required: ${(profile.dataResidencyRequired ?? []).join(', ') || 'none'}`,
    `- Budget: ${profile.budget ? formatCompact(profile.budget) : 'unspecified'}`,
    `- Compute region (residency pin): ${region}`,
    ``,
    `REQUEST: "${query}"`,
    ``,
    `Produce the brief now using the tools.`,
  ].join('\n');
}

const TOOLS = [
  {
    name: 'search_graph',
    description: 'Semantic + filtered retrieval over the software knowledge graph. Returns candidate products with residency, AI score, integrations, and relevance.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'natural-language search text' },
        category: { type: 'string', description: 'optional category id, e.g. erp, crm, accounting' },
        limit: { type: 'integer' },
      },
      required: ['query'],
    },
  },
  {
    name: 'compute_tco',
    description: 'Deterministic 5-year total cost of ownership for a product at the buyer’s seat count and region.',
    input_schema: { type: 'object', properties: { productId: { type: 'string' } }, required: ['productId'] },
  },
  {
    name: 'compute_migration',
    description: 'Deterministic migration effort estimate from the buyer’s current system to a product.',
    input_schema: { type: 'object', properties: { productId: { type: 'string' } }, required: ['productId'] },
  },
  {
    name: 'finalize_brief',
    description: 'Emit the final brief. Call exactly once after gathering data.',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'analyst lead paragraph naming the strongest option' },
        items: {
          type: 'array',
          description: 'shortlisted products in your preferred order (the platform re-ranks by deterministic fit)',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string' },
              reasons: { type: 'array', items: { type: 'string' }, description: '2-3 why-it-wins bullets (best for the top pick)' },
              tradeoff: { type: 'string', description: 'one-line tradeoff (best for alternatives)' },
            },
            required: ['productId'],
          },
        },
      },
      required: ['summary', 'items'],
    },
  },
];
