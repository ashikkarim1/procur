'use client';
import { useState } from 'react';
import type { ReasoningStep } from '@/contracts/types';

// "Showing the work is the trust mechanism" (DESIGN_SPEC §6). Each step maps to one
// LLM tool-call in Phase 2; in Phase 1 it maps to a ranker stage.
export function ReasoningTrace({ steps }: { steps: ReasoningStep[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-accent hover:underline">
        {open ? 'Hide reasoning trace' : 'View reasoning trace'}
      </button>
      {open && (
        <div className="mt-3 w-full rounded-xl border border-line bg-surface-2 p-4">
          <ol className="flex flex-col gap-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <StepNode state={s.state} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[13.5px] font-medium text-ink-soft">
                    {s.label}
                    {s.count != null && (
                      <span className="font-mono text-[12px] text-accent tabular-nums">{s.count.toLocaleString()}</span>
                    )}
                  </div>
                  {s.detail && <div className="text-[12px] text-ink-faint">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </span>
  );
}

function StepNode({ state }: { state: ReasoningStep['state'] }) {
  if (state === 'done')
    return <span className="mt-0.5 grid h-4 w-4 place-items-center rounded-full bg-positive-bg text-[10px] text-positive">✓</span>;
  if (state === 'active')
    return <span className="mt-0.5 h-4 w-4 rounded-full border-2 border-accent bg-accent-tint" />;
  return <span className="mt-0.5 h-4 w-4 rounded-full border border-line-strong" />;
}
