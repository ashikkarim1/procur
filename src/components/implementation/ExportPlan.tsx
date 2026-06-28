'use client';
import { useState } from 'react';
import { useToast } from '../Toast';

export function ExportPlan({ id }: { id: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function exportPlan() {
    setBusy(true);
    try {
      const res = await fetch(`/api/implementation/${id}/export`, { method: 'POST' });
      if (!res.ok) throw new Error();
      await res.json();
      toast('Plan exported');
    } catch {
      toast('Could not export plan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportPlan}
      disabled={busy}
      className="shrink-0 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-[#f7f5f0] disabled:opacity-50"
    >
      {busy ? 'Exporting…' : '⎙ Export plan'}
    </button>
  );
}
