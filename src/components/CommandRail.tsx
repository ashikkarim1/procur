'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from './clsx';

interface RailUser {
  initials: string;
  org: string;
  sub: string;
}

const WORKSPACE = [
  { href: '/copilot/PR-2291', glyph: '⌕', label: 'Copilot', match: '/copilot' },
  { href: '/product', glyph: '◳', label: 'Software profiles', match: '/product' },
  { href: '/compare', glyph: '▦', label: 'Compare & TCO', match: '/compare' },
  { href: '/saved', glyph: '☆', label: 'Saved searches', match: '/saved' },
];

// Lifecycle + seller-side surfaces — now live (DESIGN_SPEC §8).
const LIFECYCLE = [
  { href: '/negotiations', glyph: '◷', label: 'Negotiations', match: '/negotiations', badge: '1' },
  { href: '/implementation', glyph: '◰', label: 'Implementation', match: '/implementation' },
  { href: '/vendors', glyph: '⊞', label: 'Vendor & partners', match: '/vendors' },
];

export function CommandRail({ user }: { user: RailUser }) {
  const pathname = usePathname();
  const isActive = (m: string) => pathname === m || pathname.startsWith(m + '/') || (m === '/compare' && pathname === '/compare');

  return (
    <nav className="flex h-screen w-[236px] shrink-0 flex-col bg-rail-bg text-rail-text">
      {/* Brand block — links home */}
      <Link href="/" className="flex items-center gap-2.5 border-b border-rail-border px-5 py-5 transition hover:bg-rail-hover">
        <div className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-accent font-mono text-[13px] font-semibold text-white">P</div>
        <div className="leading-tight">
          <div className="font-sans text-[14px] font-semibold text-rail-text-active">PROCURE·AI</div>
          <div className="font-mono text-[9px] tracking-[0.18em] text-rail-text-dim">PROCUREMENT TERMINAL</div>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <RailSection label="Workspace" />
        {WORKSPACE.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition',
              isActive(item.match)
                ? 'bg-rail-active text-rail-text-active'
                : 'text-rail-text hover:bg-rail-hover',
            )}
          >
            <span className="w-4 text-center text-[15px] leading-none">{item.glyph}</span>
            {item.label}
          </Link>
        ))}

        <RailSection label="Lifecycle" className="mt-5" />
        {LIFECYCLE.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={clsx(
              'mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition',
              isActive(item.match) ? 'bg-rail-active text-rail-text-active' : 'text-rail-text hover:bg-rail-hover',
            )}
          >
            <span className="w-4 text-center text-[15px] leading-none">{item.glyph}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="rounded-full bg-rail-active px-1.5 py-0.5 font-mono text-[10px] text-rail-text">{item.badge}</span>
            )}
          </Link>
        ))}
      </div>

      <Link
        href="/settings"
        className={clsx(
          'mx-3 mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition',
          isActive('/settings') ? 'bg-rail-active text-rail-text-active' : 'text-rail-text hover:bg-rail-hover',
        )}
      >
        <span className="w-4 text-center text-[15px] leading-none">⚙</span>
        Settings
      </Link>

      {/* User chip */}
      <div className="flex items-center gap-2.5 border-t border-rail-border px-4 py-3.5">
        <div className="grid h-[30px] w-[30px] place-items-center rounded-[8px] bg-rail-active font-mono text-[12px] font-semibold text-rail-text-active">
          {user.initials}
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-medium text-rail-text-active">{user.org}</div>
          <div className="text-[11px] text-rail-text-dim">{user.sub}</div>
        </div>
      </div>
    </nav>
  );
}

function RailSection({ label, className }: { label: string; className?: string }) {
  return (
    <div className={clsx('px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-rail-label', className)}>
      {label}
    </div>
  );
}
