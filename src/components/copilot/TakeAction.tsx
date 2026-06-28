'use client';
import { useRouter } from 'next/navigation';
import { useToast } from '../Toast';
import { Eyebrow } from '../primitives';

// Compare, negotiation and implementation are all live now; export remains a stub.
export function TakeAction({ compareHref }: { compareHref: string }) {
  const router = useRouter();
  const toast = useToast();

  const live = [
    { glyph: '▦', label: 'Compare all three', go: () => router.push(compareHref) },
    { glyph: '◷', label: 'Start AI negotiation', go: () => router.push('/negotiations') },
    { glyph: '◰', label: 'Generate implementation plan', go: () => router.push('/implementation') },
  ];

  return (
    <div className="rounded-xl border border-line bg-surface p-[18px]">
      <Eyebrow className="mb-2.5">Take action</Eyebrow>
      {live.map((b, i) => (
        <button
          key={b.label}
          type="button"
          onClick={b.go}
          className={
            i === 0
              ? 'mb-2 flex w-full items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-left text-[13px] font-semibold text-white transition hover:bg-accent-dark'
              : 'mb-2 flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-left text-[13px] font-medium text-ink-soft transition hover:border-line-strong hover:bg-[#f7f5f0]'
          }
        >
          <span>{b.glyph}</span>
          {b.label}
        </button>
      ))}
      <button
        type="button"
        disabled
        title="Coming soon"
        onClick={() => toast('Export procurement brief — coming soon')}
        className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-left text-[13px] font-medium text-ink-fainter"
      >
        <span>⎙</span>
        Export procurement brief
        <span className="ml-auto rounded-[5px] bg-[#efece5] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-ink-faint">soon</span>
      </button>
    </div>
  );
}
