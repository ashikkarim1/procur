'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eyebrow, Monogram } from '../primitives';
import type { ReasoningStep } from '@/contracts/types';

interface RecMeta { productId: string; name: string; vendor: string; fitScore: number; isTopPick: boolean }

// Live SSE consumer. Renders the reasoning trace + streaming summary as the brief
// is generated, then refreshes to the full static brief on `done`.
export function StreamingView({ briefId, query }: { briefId: string; query: string }) {
  const router = useRouter();
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [summary, setSummary] = useState('');
  const [recs, setRecs] = useState<RecMeta[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // guard React 18/19 double-invoke in dev
    started.current = true;

    const es = new EventSource(`/api/copilot/briefs/${briefId}/stream`);
    es.addEventListener('reasoning_step', (e) => {
      const { step } = JSON.parse((e as MessageEvent).data);
      setSteps((prev) => [...prev, step]);
    });
    es.addEventListener('summary_token', (e) => {
      const { token } = JSON.parse((e as MessageEvent).data);
      setSummary((prev) => prev + token);
    });
    es.addEventListener('recommendation', (e) => {
      const { rec, meta } = JSON.parse((e as MessageEvent).data);
      setRecs((prev) => [...prev, { productId: rec.productId, name: meta.name, vendor: meta.vendor, fitScore: rec.fitScore, isTopPick: rec.isTopPick }]);
    });
    es.addEventListener('error', (e) => {
      const data = (e as MessageEvent).data;
      if (data) {
        try {
          setError(JSON.parse(data).message ?? 'generation failed');
        } catch {
          setError('generation failed');
        }
      }
    });
    es.addEventListener('done', () => {
      setDone(true);
      es.close();
      // brief is now persisted as ready → re-render the full static view
      setTimeout(() => router.refresh(), 400);
    });
    return () => es.close();
  }, [briefId, router]);

  return (
    <div>
      {/* Question header */}
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-1 shrink-0 rounded-[6px] border border-line bg-surface-2 px-2 py-1 font-mono text-[11px] font-medium text-ink-muted">
          {briefId}
        </span>
        <h1 className="font-serif text-[26px] font-normal leading-[1.32] tracking-[-0.01em] text-ink">&ldquo;{query}&rdquo;</h1>
      </div>

      {/* Live status */}
      <div className="mb-6 flex items-center gap-2 text-[12px] text-ink-faint">
        {!done ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
            <span className="font-mono">Copilot analyzing…</span>
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            <span className="font-mono">Answer ready — loading…</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-[26px] lg:grid-cols-[1fr_312px]">
        <div>
          {/* Streaming summary */}
          {summary && (
            <p className="mb-7 max-w-[760px] font-serif text-[18px] leading-[1.6] text-[#3a362f]">
              {summary}
              {!done && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse-dot bg-accent align-middle" />}
            </p>
          )}

          {/* Shortlist appearing */}
          {recs.length > 0 && (
            <>
              <Eyebrow className="mb-3">Recommended shortlist</Eyebrow>
              <div className="flex flex-col gap-2">
                {recs.map((r) => (
                  <div
                    key={r.productId}
                    className={`flex items-center gap-3 rounded-[11px] border bg-surface p-3.5 ${r.isTopPick ? 'border-accent' : 'border-line'}`}
                  >
                    <Monogram letter={r.name.charAt(0)} size={36} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-[16px] font-medium text-ink">{r.name}</span>
                        {r.isTopPick && (
                          <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-white">Top pick</span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-ink-faint">{r.vendor}</span>
                    </div>
                    <span className="font-mono text-[14px] font-semibold text-accent">{r.fitScore}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="mt-4 text-[13px] text-danger">⚠ {error}</p>}
        </div>

        {/* Reasoning trace (live) */}
        <aside className="lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <Eyebrow className="mb-3">Reasoning trace</Eyebrow>
            <ol className="flex flex-col gap-2.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-4 w-4 place-items-center rounded-full bg-positive-bg text-[10px] text-positive">✓</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-medium text-ink-soft">
                      {s.label}
                      {s.count != null && <span className="font-mono text-[12px] text-accent tabular-nums">{s.count.toLocaleString()}</span>}
                    </div>
                    {s.detail && <div className="text-[12px] text-ink-faint">{s.detail}</div>}
                  </div>
                </li>
              ))}
              {!done && (
                <li className="flex items-center gap-3 text-ink-faint">
                  <span className="h-4 w-4 rounded-full border-2 border-accent bg-accent-tint" />
                  <span className="text-[13px]">working…</span>
                </li>
              )}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
