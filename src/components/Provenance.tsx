'use client';
import { useState } from 'react';
import type { Provenance } from '@/contracts/types';

const SOURCE_LABEL: Record<string, string> = {
  vendor_supplied: 'Vendor supplied',
  public_doc: 'Public document',
  verified_review: 'Verified review',
  community: 'Community',
  analyst: 'Analyst',
  buyer_reported: 'Buyer reported',
  inferred: 'Inferred (model)',
};

// The trust affordance: every sourced fact can answer "where did this come from?".
export function ProvenanceMark({ provenance, label }: { provenance: Provenance[]; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!provenance || provenance.length === 0) return null;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        aria-label={`Provenance${label ? ` for ${label}` : ''}`}
        className="ml-1 inline-grid h-[14px] w-[14px] -translate-y-px place-items-center rounded-full border border-line text-[9px] text-ink-faint transition hover:border-accent hover:text-accent"
      >
        i
      </button>
      {open && (
        <span className="absolute left-1/2 top-[20px] z-50 block w-64 -translate-x-1/2 rounded-lg border border-line bg-surface p-3 text-left shadow-[0_10px_30px_rgba(0,0,0,.12)]">
          <span className="mb-1.5 block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Where this came from
          </span>
          {provenance.map((p, i) => (
            <span key={i} className="mb-1.5 block border-t border-line-soft pt-1.5 first:border-0 first:pt-0">
              <span className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink-soft">{SOURCE_LABEL[p.source] ?? p.source}</span>
                <span className="font-mono text-[11px] text-ink-faint">{Math.round(p.confidence * 100)}%</span>
              </span>
              <span className="mt-0.5 flex items-center justify-between">
                <span className="font-mono text-[10px] text-ink-faint">as of {p.asOf}</span>
                {p.url && (
                  <span className="font-mono text-[10px] text-accent">
                    {p.url.startsWith('assumption:') ? p.url : 'source ↗'}
                  </span>
                )}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
