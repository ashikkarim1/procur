import Link from 'next/link';
import { Eyebrow, Chip, FitRing, Monogram, LabeledBar } from '@/components/primitives';
import { ListCTA } from '@/components/landing/ListCTA';

export const metadata = {
  title: 'Procur — Get in front of buyers who are ready to buy',
  description:
    'List your software on the AI procurement terminal CFOs and IT leaders use to decide. Qualified lead generation, global visibility, and trust you can’t buy.',
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <Hero />
      <ValueBand />
      <Pillars />
      <HowItWorks />
      <TrustBand />
      <Showcase />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ── Top nav ───────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1140px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-[7px] bg-accent font-mono text-[13px] font-semibold text-white">P</span>
          <span className="font-sans text-[15px] font-semibold tracking-tight text-ink">procur<span className="text-accent">.tech</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-[14px] text-ink-muted md:flex">
          <a href="#pillars" className="transition hover:text-ink">Why Procur</a>
          <a href="#how" className="transition hover:text-ink">How it works</a>
          <a href="#trust" className="transition hover:text-ink">Trust</a>
          <Link href="/copilot/PR-2291" className="transition hover:text-ink">See it live</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/copilot/PR-2291" className="hidden text-[13px] font-semibold text-ink-soft transition hover:text-accent sm:block">
            Enter terminal →
          </Link>
          <a href="#get-listed" className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-accent-dark">
            List your software
          </a>
        </div>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-[0.10] blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent), transparent 70%)' }}
      />
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <div>
          <Eyebrow className="text-accent">For software vendors</Eyebrow>
          <h1 className="mt-4 font-serif text-[44px] font-medium leading-[1.08] tracking-[-0.015em] text-ink sm:text-[56px]">
            Get in front of buyers <span className="italic text-accent">the moment they decide.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-[1.65] text-ink-soft">
            Procur is the AI procurement terminal CFOs, IT and procurement leaders use to choose software — comparing
            true cost, migration effort, compliance and fit. List your product and reach high-intent buyers worldwide,
            with <strong className="font-semibold text-ink">qualified lead generation</strong>,{' '}
            <strong className="font-semibold text-ink">global visibility</strong>, and{' '}
            <strong className="font-semibold text-ink">trust you can’t buy</strong>.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#get-listed" className="rounded-lg bg-accent px-5 py-3 text-[14px] font-semibold text-white shadow-[0_6px_20px_rgba(23,84,94,.18)] transition hover:bg-accent-dark">
              Get listed →
            </a>
            <Link href="/copilot/PR-2291" className="rounded-lg border border-line bg-surface px-5 py-3 text-[14px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-[#f7f5f0]">
              See a live buyer brief
            </Link>
          </div>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
            Ranking is earned, never sold · Every figure is sourced
          </p>
        </div>

        {/* "How buyers see you" preview card */}
        <BuyerPreview />
      </div>
    </section>
  );
}

function BuyerPreview() {
  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between px-1">
        <Eyebrow>How buyers see you</Eyebrow>
        <span className="font-mono text-[10px] text-ink-faint">PR-2291 · live brief</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border-[1.5px] border-accent bg-surface shadow-[0_20px_50px_rgba(23,84,94,.14)]">
        <div className="h-1 w-full bg-accent" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <Monogram letter="B" size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-serif text-[18px] font-medium text-ink">BuildLedger ERP</span>
                <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-white">Top pick</span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-ink-faint">Your product · as ranked for a Dubai buyer</div>
            </div>
            <FitRing score={92} size={56} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip tone="positive">⏱ 14-week go-live</Chip>
            <Chip tone="positive">✓ UAE residency</Chip>
            <Chip tone="accent">⊞ 2 local partners</Chip>
          </div>
          <div className="mt-5 grid grid-cols-[120px_1fr] gap-4 border-t border-line pt-4">
            <div>
              <div className="font-mono text-[24px] font-semibold tracking-[-0.02em] text-ink">$128k</div>
              <Eyebrow className="mt-0.5">5-yr TCO</Eyebrow>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <LabeledBar label="AI readiness" value="88" pct={88} />
              <LabeledBar label="Verified reviews" value="4.4★" pct={88} />
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-muted">
            <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">Why it wins · </span>
            Native QuickBooks migration, in-region hosting, renewal capped at 5%/yr — surfaced from your sourced profile.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Value band ────────────────────────────────────────────────────────────────
function ValueBand() {
  const items = [
    '5-yr TCO modeled on every listing',
    'Region-aware reach · UAE · EU · US · APAC',
    'Provenance on every fact',
    '0 pay-to-win placement',
  ];
  return (
    <div className="border-y border-line bg-surface-2">
      <div className="mx-auto grid max-w-[1140px] grid-cols-2 gap-px px-6 md:grid-cols-4">
        {items.map((t, i) => (
          <div key={i} className="px-2 py-6 text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">{t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Three pillars ─────────────────────────────────────────────────────────────
function Pillars() {
  const pillars = [
    {
      glyph: '◷',
      eyebrow: 'Lead generation',
      title: 'Qualified demand, not cold lists',
      body: 'You appear inside buyers’ procurement briefs and side-by-side comparisons exactly when they’re evaluating your category. Verified, in-market intent — the kind that turns into booked demos, not unsubscribes.',
    },
    {
      glyph: '◳',
      eyebrow: 'Global visibility',
      title: 'Be discoverable everywhere',
      body: 'Procur is region- and residency-aware, so a Dubai CFO or a Berlin controller finds you with the local partners, compliance and hosting they require. One profile, global reach — surfaced in the markets that fit.',
    },
    {
      glyph: '✓',
      eyebrow: 'Trust',
      title: 'Credibility that compounds',
      body: 'Your profile is backed by sourced provenance and a neutral, auditable fit score buyers actually believe. Ranking is earned on merit — never bought — which is exactly why the recommendation carries weight.',
    },
  ];
  return (
    <section id="pillars" className="mx-auto max-w-[1140px] px-6 py-24">
      <div className="max-w-2xl">
        <Eyebrow className="text-accent">Why list on Procur</Eyebrow>
        <h2 className="mt-3 font-serif text-[34px] font-medium leading-tight tracking-[-0.01em] text-ink">
          Grow pipeline where the decision actually happens.
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
          Review sites sell ads. Procur is a decision engine — buyers come to choose, and they act on what they see.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.eyebrow} className="rounded-2xl border border-line bg-surface p-7 transition hover:border-line-strong hover:shadow-[0_10px_30px_rgba(0,0,0,.05)]">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-tint text-[20px] text-accent">{p.glyph}</div>
            <Eyebrow className="mt-5">{p.eyebrow}</Eyebrow>
            <h3 className="mt-2 font-serif text-[21px] font-medium text-ink">{p.title}</h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', t: 'Claim your profile', d: 'Verify your company and own your record — editions, pricing, compliance, integrations. Every fact carries a source.' },
    { n: '02', t: 'Get modeled', d: 'Procur computes your 5-year TCO, migration effort and AI score with deterministic, auditable calculators — the math CFOs trust.' },
    { n: '03', t: 'Appear in briefs & comparisons', d: 'When a buyer’s request matches your category, region and stack, you surface in their ranked shortlist and head-to-head compare.' },
    { n: '04', t: 'Leads & fair agreements', d: 'Qualified leads flow to you. Referral terms are AI policy-reviewed for fairness and reconciled transparently — no surprises.' },
  ];
  return (
    <section id="how" className="border-y border-line bg-surface-2">
      <div className="mx-auto max-w-[1140px] px-6 py-24">
        <Eyebrow className="text-accent">How it works</Eyebrow>
        <h2 className="mt-3 max-w-2xl font-serif text-[34px] font-medium leading-tight tracking-[-0.01em] text-ink">
          From listing to pipeline in four steps.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="bg-surface p-7">
              <span className="font-mono text-[13px] font-semibold text-accent">{s.n}</span>
              <h3 className="mt-3 font-serif text-[18px] font-medium text-ink">{s.t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Trust band (dark, terminal aesthetic) ─────────────────────────────────────
function TrustBand() {
  const points = [
    { t: 'Ranking you can’t buy', d: 'Referral economics never affect fit score or cost ranking. Sponsored placements are always clearly labelled. Buyers know it — that’s why they act on it.' },
    { t: '“Where did this number come from?”', d: 'Every figure on your profile cites its source — vendor docs, public filings, verified reviews, buyer-reported outcomes. Provenance is built in, not bolted on.' },
    { t: 'Verified & residency-aware', d: 'Verified vendor profiles and region-pinned data handling. Buyers in regulated markets can trust what they see — and that they can actually run it where they are.' },
    { t: 'A fair referral marketplace', d: 'Propose terms; an AI policy review flags anything unusual against a clear commercial policy. Approve, counter, e-sign, and reconcile — transparently.' },
  ];
  return (
    <section id="trust" className="bg-rail-bg text-rail-text">
      <div className="mx-auto max-w-[1140px] px-6 py-24">
        <div className="max-w-2xl">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-mark">Trust is the product</div>
          <h2 className="mt-3 font-serif text-[34px] font-medium leading-tight tracking-[-0.01em] text-rail-text-active">
            A recommendation only matters if buyers believe it.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-rail-text">
            Procur’s authority comes from neutrality and transparency. That’s what makes a placement here worth more than
            an ad anywhere else.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
          {points.map((p) => (
            <div key={p.t} className="rounded-2xl border border-rail-border bg-[#211e1a] p-7">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-mark-bg text-[15px] text-brand-mark">✓</div>
              <h3 className="mt-4 font-serif text-[19px] font-medium text-rail-text-active">{p.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-rail-text">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Showcase ──────────────────────────────────────────────────────────────────
function Showcase() {
  return (
    <section className="mx-auto max-w-[1140px] px-6 py-24">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <Eyebrow className="text-accent">Your profile, buyer-grade</Eyebrow>
          <h2 className="mt-3 font-serif text-[32px] font-medium leading-tight tracking-[-0.01em] text-ink">
            Presented like a decision, not a directory entry.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
            No star-rating popularity contest. Your product shows up as a structured, sourced object — compliance,
            integrations, true cost and AI capability — the dimensions a procurement committee actually weighs.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {[
              'AI score with an auditable methodology',
              'Compliance & residency badges, each sourced',
              '5-yr TCO and migration effort, computed',
              'Local implementation partners surfaced',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[14.5px] text-ink-soft">
                <span className="mt-0.5 text-accent">›</span>
                {t}
              </li>
            ))}
          </ul>
          <Link href="/product/buildledger-erp-cloud" className="mt-7 inline-block rounded-lg border border-line bg-surface px-5 py-3 text-[14px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-[#f7f5f0]">
            View a sample profile →
          </Link>
        </div>

        {/* sample profile header card */}
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-[0_10px_30px_rgba(0,0,0,.05)]">
          <div className="flex items-start gap-4">
            <Monogram letter="B" size={56} />
            <div className="flex-1">
              <h3 className="font-serif text-[22px] font-medium text-ink">BuildLedger ERP</h3>
              <div className="mt-1 font-mono text-[11px] text-ink-faint">VendorCo · Public (NYSE) · Founded 2008 · UAE/EU/US</div>
            </div>
            <div className="text-center">
              <div className="font-serif text-[26px] font-medium text-positive">A−</div>
              <Eyebrow>AI score</Eyebrow>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5 border-t border-line pt-5">
            <Chip tone="positive">SOC 2</Chip>
            <Chip tone="positive">ISO 27001</Chip>
            <Chip tone="positive">GDPR</Chip>
            <Chip tone="positive">UAE residency</Chip>
            <Chip>SSO · SCIM</Chip>
            <Chip>REST · GraphQL</Chip>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5">
            {[
              { k: 'Per seat', v: '$65–165/mo' },
              { k: 'Implementation', v: 'from $18k' },
              { k: 'Renewal', v: '5%/yr cap' },
            ].map((x) => (
              <div key={x.k}>
                <Eyebrow>{x.k}</Eyebrow>
                <div className="mt-1 font-mono text-[14px] font-semibold text-ink-soft">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section id="get-listed" className="border-t border-line bg-surface-2">
      <div className="mx-auto max-w-[1140px] px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-accent">Early access</Eyebrow>
          <h2 className="mt-3 font-serif text-[38px] font-medium leading-[1.1] tracking-[-0.01em] text-ink">
            Put your software where buyers decide.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
            Claim your profile, get modeled, and start showing up in the briefs and comparisons your buyers already trust.
          </p>
          <div className="mt-8 flex justify-center">
            <ListCTA />
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
            No pay-to-win · Sponsored placements always labelled
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto flex max-w-[1140px] flex-col items-start justify-between gap-6 px-6 py-12 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-[7px] bg-accent font-mono text-[13px] font-semibold text-white">P</span>
          <div>
            <div className="font-sans text-[14px] font-semibold text-ink">procur.tech</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">The procurement terminal</div>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-muted">
          <a href="#pillars" className="hover:text-ink">Why Procur</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#trust" className="hover:text-ink">Trust</a>
          <Link href="/copilot/PR-2291" className="hover:text-ink">Buyer terminal</Link>
          <a href="#get-listed" className="font-semibold text-accent hover:text-accent-dark">List your software</a>
        </nav>
      </div>
      <div className="border-t border-line/60">
        <div className="mx-auto max-w-[1140px] px-6 py-5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-fainter">
          © procur.tech · Ranking is earned, never sold · Every figure is sourced
        </div>
      </div>
    </footer>
  );
}
