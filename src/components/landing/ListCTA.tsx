'use client';
import { useState } from 'react';

// Pre-Phase-4 vendor-interest capture. The vendor portal lands in Phase 4; for now
// this confirms intent inline (and offers a mailto). No backend dependency.
export function ListCTA({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  if (sent) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-positive-border bg-positive-bg px-4 py-3 text-[14px] text-positive">
        <span>✓</span>
        <span>
          You’re on the early-access list — we’ll reach out to <span className="font-semibold">{email}</span>.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) setSent(true);
      }}
      className={`flex w-full flex-col gap-2 sm:flex-row ${size === 'lg' ? 'max-w-xl' : 'max-w-md'}`}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourcompany.com"
        className="flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-[14px] text-ink-soft outline-none placeholder:text-ink-fainter focus:border-accent"
      />
      <button
        type="submit"
        disabled={!valid}
        className="shrink-0 rounded-lg bg-accent px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
      >
        Get listed →
      </button>
    </form>
  );
}
