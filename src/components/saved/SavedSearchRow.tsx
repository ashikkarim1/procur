'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chip } from '../primitives';
import { Toggle } from '../Toggle';
import { useToast } from '../Toast';
import type { SavedSearch } from '@/contracts/types';
import { formatCompact } from '@/lib/money';

export function SavedSearchRow({ search }: { search: SavedSearch }) {
  const router = useRouter();
  const toast = useToast();
  const [alerts, setAlerts] = useState(search.alertsEnabled);
  const [running, setRunning] = useState(false);

  async function toggleAlerts(next: boolean) {
    setAlerts(next);
    await fetch(`/api/saved-searches/${search.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ alertsEnabled: next }),
    });
    toast(next ? 'Alerts on' : 'Alerts off');
  }

  async function run() {
    setRunning(true);
    try {
      const res = await fetch(`/api/saved-searches/${search.id}/run`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { briefId } = await res.json();
      toast('Re-ran search');
      router.push(`/copilot/${briefId}`);
    } catch {
      toast('Could not run search');
      setRunning(false);
    }
  }

  const delta = search.delta;
  const deltaLabel =
    delta && delta.newSinceLastRun > 0
      ? { text: `${delta.newSinceLastRun} new since last run`, cls: 'text-positive' }
      : delta && delta.priceChanges > 0
        ? { text: `${delta.priceChanges} vendor price change`, cls: 'text-danger' }
        : { text: 'no change', cls: 'text-ink-faint' };

  return (
    <div className="flex items-start gap-4 rounded-xl border border-line bg-surface p-[18px]">
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-[17px] font-medium text-ink">{search.title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {search.filters.category && <Chip mono>{search.filters.category.toUpperCase()}</Chip>}
          {search.filters.budgetMax && <Chip mono>&lt;{formatCompact(search.filters.budgetMax)}</Chip>}
          {search.filters.residency?.map((r) => (
            <Chip key={r} mono tone="accent">{r} residency</Chip>
          ))}
          {search.filters.tags?.map((t) => (
            <Chip key={t} mono>{t}</Chip>
          ))}
        </div>
        <div className="mt-2 text-[12px] text-ink-faint">
          {search.lastRunAt ? `Last run ${relTime(search.lastRunAt)}` : 'Never run'}
          {search.lastResultCount != null && <> · {search.lastResultCount} viable · </>}
          <span className={deltaLabel.cls}>{deltaLabel.text}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] text-ink-faint">Alerts</span>
          <Toggle on={alerts} onChange={toggleAlerts} label="Alerts" />
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-[#f7f5f0] disabled:opacity-50"
        >
          {running ? 'Running…' : 'Run ↻'}
        </button>
      </div>
    </div>
  );
}

function relTime(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}
