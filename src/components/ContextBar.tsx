import Link from 'next/link';
import type { BusinessProfile } from '@/contracts/types';
import { Chip } from './primitives';
import { formatCompact } from '@/lib/money';

// The persistent ACTIVE CONTEXT chips = the live BusinessProfile. Every
// recommendation is filtered & costed against these (DESIGN_SPEC §2.2).
export function ContextBar({ profile }: { profile: BusinessProfile }) {
  const chips: { label: string; accent?: boolean }[] = [];
  if (profile.city || profile.country) chips.push({ label: [profile.city, country(profile.country)].filter(Boolean).join(', ') });
  chips.push({ label: profile.industry });
  chips.push({ label: `${profile.employees} staff` });
  const s = profile.currentStack;
  if (s.accounting) chips.push({ label: s.accounting });
  if (s.productivity) chips.push({ label: shortStack(s.productivity) });
  for (const r of profile.dataResidencyRequired ?? []) chips.push({ label: `${r} residency`, accent: true });
  if (profile.budget) chips.push({ label: `<${formatCompact(profile.budget)}` });

  return (
    <div className="flex h-[54px] shrink-0 items-center gap-3 border-b border-line bg-surface-2 px-[30px]">
      <span className="font-mono text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-ink-faint">
        Active
        <br />
        context
      </span>
      <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
        {chips.map((c, i) => (
          <Chip key={i} mono tone={c.accent ? 'accent' : 'neutral'} className="whitespace-nowrap">
            {c.label}
          </Chip>
        ))}
      </div>
      <Link href="/settings" className="shrink-0 text-[12px] font-semibold text-accent hover:underline">
        Edit context
      </Link>
    </div>
  );
}

function country(c: string): string {
  return c === 'United Arab Emirates' ? 'UAE' : c === 'United States' ? 'USA' : c === 'United Kingdom' ? 'UK' : c;
}
function shortStack(s: string): string {
  return s === 'Microsoft 365' ? 'M365' : s;
}
