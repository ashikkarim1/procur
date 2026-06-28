'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../Toast';

const SUGGESTIONS = [
  'Best ERP under $150k for our 200-person Dubai construction firm on QuickBooks',
  'Cheapest ERP that still clears UAE residency',
  'Which ERP has the strongest AI & analytics?',
];

export function AskBox() {
  const router = useRouter();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask(query: string) {
    const text = query.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok) throw new Error();
      const { briefId } = await res.json();
      router.push(`/copilot/${briefId}`);
    } catch {
      toast('Could not start the copilot');
      setBusy(false);
    }
  }

  return (
    <div className="mb-7 rounded-xl border border-line bg-surface p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex items-center gap-2"
      >
        <span className="pl-1 text-[16px] text-ink-faint">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask the procurement copilot — e.g. best ERP under $150k for a Dubai construction firm…"
          className="flex-1 bg-transparent py-1.5 font-serif text-[16px] text-ink outline-none placeholder:text-ink-fainter"
        />
        <button
          type="submit"
          disabled={busy || !q.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
        >
          {busy ? 'Asking…' : 'Ask →'}
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={busy}
            className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] text-ink-muted transition hover:border-line-strong hover:text-ink-soft disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
