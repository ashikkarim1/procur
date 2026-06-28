'use client';

import { useState } from 'react';
import { clsx } from '../clsx';
import { Card, Eyebrow, Chip, Figure, LabeledBar } from '../primitives';
import { Toggle } from '../Toggle';
import { useToast } from '../Toast';
import { formatMoney, formatCompact } from '@/lib/money';
import type {
  BusinessProfile, Member, Role, MemberStatus, SecuritySettings, PrivacySettings, Plan, Usage,
  Invoice, ApiKey, Connector, NotificationSettings, AuditEvent, Region, Session,
} from '@/contracts/types';

const TABS = [
  'Account & profile', 'Team & roles', 'Security', 'Data & privacy',
  'Billing & plan', 'API & connectors', 'Notifications', 'Audit log',
] as const;
type Tab = (typeof TABS)[number];

type ActorLite = { name: string; email: string; role: Role; orgName: string };

export function SettingsClient(props: {
  actor: ActorLite;
  profile: BusinessProfile;
  members: Member[];
  security: SecuritySettings;
  privacy: PrivacySettings;
  plan: Plan;
  usage: Usage;
  invoices: Invoice[];
  apiKeys: ApiKey[];
  connectors: Connector[];
  notifications: NotificationSettings;
  auditEvents: AuditEvent[];
}) {
  const [tab, setTab] = useState<Tab>('Account & profile');
  const canManageMembers = props.actor.role === 'owner' || props.actor.role === 'admin';
  const canManageSecurity = props.actor.role === 'owner' || props.actor.role === 'admin';
  const isOwner = props.actor.role === 'owner';

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[222px_1fr]">
      {/* sticky tab nav */}
      <nav className="flex flex-col gap-1 md:sticky md:top-0 md:self-start">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={clsx(
              'rounded-lg border px-3 py-2 text-left text-[13px] transition',
              t === tab
                ? 'border-line bg-surface font-semibold text-ink shadow-sm'
                : 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink-soft',
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        {tab === 'Account & profile' && <AccountPanel actor={props.actor} profile={props.profile} canEdit={canManageSecurity} />}
        {tab === 'Team & roles' && <TeamPanel members={props.members} plan={props.plan} canManage={canManageMembers} />}
        {tab === 'Security' && <SecurityPanel security={props.security} canManage={canManageSecurity} />}
        {tab === 'Data & privacy' && <PrivacyPanel privacy={props.privacy} canManage={canManageSecurity} isOwner={isOwner} actorName={props.actor.name} orgName={props.actor.orgName} />}
        {tab === 'Billing & plan' && <BillingPanel plan={props.plan} usage={props.usage} invoices={props.invoices} canManage={canManageMembers} />}
        {tab === 'API & connectors' && <ApiPanel apiKeys={props.apiKeys} connectors={props.connectors} canManage={canManageSecurity} />}
        {tab === 'Notifications' && <NotificationsPanel notifications={props.notifications} />}
        {tab === 'Audit log' && <AuditPanel events={props.auditEvents} members={props.members} canManage={canManageSecurity} />}
      </div>
    </div>
  );
}

/* ─────────────────────────── shared bits ─────────────────────────── */

function PanelHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-[19px] font-medium text-ink">{title}</h2>
      <p className="mt-0.5 text-[13px] text-ink-muted">{sub}</p>
    </div>
  );
}

function ToggleRow({
  label, hint, on, onChange, disabled,
}: { label: string; hint: string; on: boolean; onChange: (n: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-soft py-3.5 last:border-0">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-ink-soft">{label}</div>
        <div className="mt-0.5 text-[12.5px] text-ink-muted">{hint}</div>
      </div>
      <Toggle on={on} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

function btnPrimary(extra?: string) {
  return clsx('rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50', extra);
}
function btnGhost(extra?: string) {
  return clsx('rounded-lg border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-surface-2 disabled:opacity-50', extra);
}
function btnDanger(extra?: string) {
  return clsx('rounded-lg border border-[#e8c8be] bg-[#f7e7e2] px-3.5 py-2 text-[13px] font-semibold text-danger transition hover:bg-[#f1d8d0] disabled:opacity-50', extra);
}
const fieldCls = 'w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent';

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '—';
}
function relTime(iso?: string): string {
  if (!iso) return '—';
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─────────────────────── 1 · Account & profile ────────────────────── */

const REGIONS: Region[] = ['UAE', 'EU', 'US', 'UK', 'APAC', 'GLOBAL'];

function AccountPanel({ actor, profile, canEdit }: { actor: ActorLite; profile: BusinessProfile; canEdit: boolean }) {
  const toast = useToast();
  const [country, setCountry] = useState(profile.country);
  const [city, setCity] = useState(profile.city ?? '');
  const [industry, setIndustry] = useState(profile.industry);
  const [employees, setEmployees] = useState(String(profile.employees));
  const [residency, setResidency] = useState<Region[]>(profile.dataResidencyRequired ?? []);
  const [saving, setSaving] = useState(false);

  const stackChips = Object.entries(profile.currentStack)
    .flatMap(([, v]) => (Array.isArray(v) ? v : v ? [v] : []))
    .filter(Boolean) as string[];

  async function save() {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          country, city: city || null, industry, employees: Number(employees) || profile.employees,
          currentStack: profile.currentStack, compliance: profile.compliance,
          dataResidencyRequired: residency, budget: profile.budget ?? null,
          revenue: profile.revenue ?? null, growthPlans: profile.growthPlans ?? null,
        }),
      });
      if (!res.ok) throw new Error();
      toast('Business context saved — cached briefs invalidated');
    } catch {
      toast('Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  function toggleResidency(r: Region) {
    setResidency((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="Account & profile" sub="Your identity and the business context every recommendation is costed against." />

      {/* identity */}
      <Card className="p-[20px]">
        <Eyebrow className="mb-3">Identity</Eyebrow>
        <div className="flex items-center gap-4">
          <div className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-2xl bg-accent-tint font-mono text-[20px] font-semibold text-accent">
            {initials(actor.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[18px] font-medium text-ink">{actor.name}</span>
              <Chip tone="accent" mono>{actor.role}</Chip>
            </div>
            <div className="mt-0.5 text-[13px] text-ink-muted">{actor.email}</div>
            <div className="mt-0.5 text-[12px] text-ink-faint">{actor.orgName}</div>
          </div>
        </div>
        <p className="mt-3 border-t border-line-soft pt-3 text-[12px] text-ink-faint">
          Name and email are managed by your identity provider and are read-only here.
        </p>
      </Card>

      {/* business context */}
      <Card className="p-[20px]">
        <div className="mb-3 flex items-center justify-between">
          <Eyebrow>Business context</Eyebrow>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">Active context</span>
        </div>
        <p className="mb-4 text-[13px] text-ink-muted">
          Editing these invalidates cached briefs — every recommendation is re-filtered and re-costed against them.
        </p>

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Labeled label="Country">
            <input className={fieldCls} value={country} disabled={!canEdit} onChange={(e) => setCountry(e.target.value)} />
          </Labeled>
          <Labeled label="City">
            <input className={fieldCls} value={city} disabled={!canEdit} onChange={(e) => setCity(e.target.value)} />
          </Labeled>
          <Labeled label="Industry">
            <input className={fieldCls} value={industry} disabled={!canEdit} onChange={(e) => setIndustry(e.target.value)} />
          </Labeled>
          <Labeled label="Employees">
            <input className={fieldCls} type="number" value={employees} disabled={!canEdit} onChange={(e) => setEmployees(e.target.value)} />
          </Labeled>
        </div>

        <div className="mt-4">
          <Eyebrow className="mb-2">Data residency</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={!canEdit}
                onClick={() => toggleResidency(r)}
                className={clsx(
                  'rounded-[5px] border px-2.5 py-[5px] font-mono text-[12px] font-medium transition',
                  residency.includes(r) ? 'border-transparent bg-accent-tint text-accent' : 'border-line bg-surface text-ink-muted hover:border-line-strong',
                  !canEdit && 'cursor-not-allowed opacity-60',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-line-soft pt-4">
          <Eyebrow className="mb-2">Current stack & compliance</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {stackChips.map((s) => <Chip key={s} mono>{s}</Chip>)}
            {profile.compliance.map((c) => <Chip key={c} mono tone="accent">{c}</Chip>)}
            {profile.budget && <Chip mono>Budget &lt;{formatCompact(profile.budget)}</Chip>}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className={btnPrimary()} disabled={!canEdit || saving} onClick={save}>
            {saving ? 'Saving…' : 'Save business context'}
          </button>
          {!canEdit && <span className="text-[12px] text-ink-faint">Requires admin to edit.</span>}
        </div>
      </Card>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</span>
      {children}
    </label>
  );
}

/* ──────────────────────── 2 · Team & roles ───────────────────────── */

const ROLE_OPTIONS: Role[] = ['owner', 'admin', 'approver', 'member', 'viewer'];
const statusTone: Record<MemberStatus, 'positive' | 'warning' | 'neutral'> = {
  active: 'positive', invited: 'warning', suspended: 'neutral',
};

const MATRIX_ROWS: { label: string; roles: Role[] }[] = [
  { label: 'Run copilot & compare', roles: ['owner', 'admin', 'approver', 'member', 'viewer'] },
  { label: 'Create / save searches & briefs', roles: ['owner', 'admin', 'approver', 'member'] },
  { label: 'Start negotiations', roles: ['owner', 'admin', 'approver'] },
  { label: 'Approve purchase', roles: ['owner', 'approver'] },
  { label: 'Manage members & billing', roles: ['owner', 'admin'] },
  { label: 'Manage security & privacy', roles: ['owner', 'admin'] },
  { label: 'Transfer ownership / delete org', roles: ['owner'] },
];

function TeamPanel({ members, plan, canManage }: { members: Member[]; plan: Plan; canManage: boolean }) {
  const toast = useToast();
  const [rows, setRows] = useState(members);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [inviting, setInviting] = useState(false);

  const occupied = rows.filter((m) => m.status === 'active' || m.status === 'invited').length;

  async function invite() {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const res = await fetch('/api/org/members/invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      if (res.status === 409) { toast('No free seats — upgrade the plan'); return; }
      if (!res.ok) throw new Error();
      const m: Member = await res.json();
      setRows((cur) => [m, ...cur]);
      setEmail('');
      toast(`Invited ${m.email}`);
    } catch {
      toast('Could not send invite');
    } finally {
      setInviting(false);
    }
  }

  async function changeRole(id: string, role: Role) {
    const prev = rows;
    setRows((cur) => cur.map((m) => (m.id === id ? { ...m, role } : m)));
    const res = await fetch(`/api/org/members/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role }),
    });
    if (!res.ok) { setRows(prev); toast('Could not change role'); return; }
    toast('Role updated');
  }

  async function remove(id: string) {
    const prev = rows;
    setRows((cur) => cur.filter((m) => m.id !== id));
    const res = await fetch(`/api/org/members/${id}`, { method: 'DELETE' });
    if (!res.ok) { setRows(prev); toast('Could not remove member'); return; }
    toast('Member removed');
  }

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="Team & roles" sub="Invite teammates, assign roles, and see exactly what each role can do." />

      {/* seats + invite */}
      <Card className="p-[20px]">
        <div className="mb-4 flex items-baseline justify-between">
          <Eyebrow>Seats</Eyebrow>
          <span className="font-mono text-[13px] font-semibold text-ink-soft tabular-nums">
            {occupied} of {plan.seatsTotal} seats
          </span>
        </div>
        <LabeledBar pct={(occupied / Math.max(1, plan.seatsTotal)) * 100} />
        <div className="mt-4 flex flex-col gap-2 border-t border-line-soft pt-4 sm:flex-row">
          <input
            className={clsx(fieldCls, 'sm:flex-1')}
            placeholder="teammate@company.com"
            value={email}
            disabled={!canManage}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select className={clsx(fieldCls, 'sm:w-[150px]')} value={inviteRole} disabled={!canManage} onChange={(e) => setInviteRole(e.target.value as Role)}>
            {ROLE_OPTIONS.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className={btnPrimary('sm:w-auto')} disabled={!canManage || inviting} onClick={invite}>
            {inviting ? 'Inviting…' : 'Invite'}
          </button>
        </div>
        {!canManage && <p className="mt-2 text-[12px] text-ink-faint">Only owners and admins can manage members.</p>}
      </Card>

      {/* members table */}
      <Card className="overflow-hidden p-0">
        <div className="grid border-b border-line bg-surface-2 px-4 py-2.5" style={{ gridTemplateColumns: '1fr 150px 110px 130px' }}>
          {['Member', 'Role', 'Status', 'Last active'].map((h) => <Eyebrow key={h}>{h}</Eyebrow>)}
        </div>
        {rows.map((m) => (
          <div key={m.id} className="grid items-center border-b border-line-soft px-4 py-3 last:border-0" style={{ gridTemplateColumns: '1fr 150px 110px 130px' }}>
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-tint font-mono text-[12px] font-semibold text-accent">{initials(m.name)}</div>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium text-ink">{m.name}</div>
                <div className="truncate text-[12px] text-ink-faint">{m.email}</div>
              </div>
            </div>
            <div>
              {canManage && m.role !== 'owner' ? (
                <select
                  className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-[12px] text-ink-soft outline-none focus:border-accent"
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as Role)}
                >
                  {ROLE_OPTIONS.filter((r) => r !== 'owner').map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <Chip mono tone={m.role === 'owner' ? 'accent' : 'neutral'}>{m.role}</Chip>
              )}
            </div>
            <Chip tone={statusTone[m.status]} className="w-fit">{m.status}</Chip>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] text-ink-muted tabular-nums">{relTime(m.lastActiveAt)}</span>
              {canManage && m.role !== 'owner' && (
                <button className="text-[12px] font-medium text-ink-faint transition hover:text-danger" onClick={() => remove(m.id)}>Remove</button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* permission matrix */}
      <div>
        <Eyebrow className="mb-2">Permission matrix</Eyebrow>
        <Card className="overflow-hidden p-0">
          <div className="grid border-b border-line bg-surface-2" style={{ gridTemplateColumns: '1.6fr repeat(5, 1fr)' }}>
            <div className="px-4 py-2.5"><Eyebrow>Capability</Eyebrow></div>
            {ROLE_OPTIONS.map((r) => (
              <div key={r} className="px-2 py-2.5 text-center"><Eyebrow className="text-center">{r}</Eyebrow></div>
            ))}
          </div>
          {MATRIX_ROWS.map((row, i) => (
            <div key={row.label} className={clsx('grid items-center border-b border-line-soft last:border-0', i % 2 === 1 && 'bg-surface-2/40')} style={{ gridTemplateColumns: '1.6fr repeat(5, 1fr)' }}>
              <div className="px-4 py-2.5 text-[13px] font-medium text-ink-soft">{row.label}</div>
              {ROLE_OPTIONS.map((r) => (
                <div key={r} className="px-2 py-2.5 text-center">
                  {row.roles.includes(r)
                    ? <span className="font-mono text-[13px] font-semibold text-accent">✓</span>
                    : <span className="font-mono text-[13px] text-ink-fainter">—</span>}
                </div>
              ))}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────── 3 · Security ────────────────────────── */

const SESSION_STUBS: Session[] = [
  { id: 's_cur', device: 'MacBook Pro', location: 'Dubai, UAE', browser: 'Chrome 128', lastSeenAt: new Date().toISOString(), current: true },
  { id: 's_iphone', device: 'iPhone 15', location: 'Dubai, UAE', browser: 'Safari Mobile', lastSeenAt: new Date(Date.now() - 36e5 * 5).toISOString(), current: false },
  { id: 's_win', device: 'Windows Workstation', location: 'Abu Dhabi, UAE', browser: 'Edge 128', lastSeenAt: new Date(Date.now() - 864e5 * 2).toISOString(), current: false },
];

function SecurityPanel({ security, canManage }: { security: SecuritySettings; canManage: boolean }) {
  const toast = useToast();
  const [s, setS] = useState(security);
  const [sessions, setSessions] = useState(SESSION_STUBS);

  async function patch(key: keyof SecuritySettings, val: boolean) {
    const prev = s;
    setS((cur) => ({ ...cur, [key]: val }));
    const res = await fetch('/api/org/security', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ [key]: val }),
    });
    if (!res.ok) { setS(prev); toast('Could not update'); return; }
    toast('Security updated');
  }

  const rows: { key: keyof SecuritySettings; label: string; hint: string }[] = [
    { key: 'twofaEnforced', label: 'Enforce two-factor auth', hint: 'Require 2FA for every member at sign-in.' },
    { key: 'ssoEnforced', label: 'Enforce SSO', hint: 'Members must authenticate via your SAML/OIDC identity provider.' },
    { key: 'scimEnabled', label: 'SCIM provisioning', hint: 'Auto-provision and de-provision members from your IdP.' },
    { key: 'ipAllowlistEnabled', label: 'IP allowlist', hint: 'Restrict access to approved CIDR ranges.' },
    { key: 'shortSessionTimeout', label: 'Short session timeout', hint: 'Sign members out after a short idle period.' },
    { key: 'encryptExports', label: 'Encrypt exports', hint: 'Encrypt all data exports at rest and in transit.' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="Security" sub="Authentication, provisioning, and active sessions for your organisation." />

      <Card className="p-[20px]">
        <Eyebrow className="mb-1">Controls</Eyebrow>
        <div>
          {rows.map((r) => (
            <ToggleRow key={r.key} label={r.label} hint={r.hint} on={Boolean(s[r.key])} disabled={!canManage} onChange={(v) => patch(r.key, v)} />
          ))}
        </div>
        {!canManage && <p className="mt-3 text-[12px] text-ink-faint">Requires admin to change security controls.</p>}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-line bg-surface-2 px-4 py-2.5"><Eyebrow>Active sessions</Eyebrow></div>
        {sessions.map((sess) => (
          <div key={sess.id} className="flex items-center justify-between gap-4 border-b border-line-soft px-4 py-3 last:border-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-medium text-ink">{sess.device}</span>
                {sess.current && <Chip tone="positive">This device</Chip>}
              </div>
              <div className="mt-0.5 text-[12px] text-ink-muted">{sess.browser} · {sess.location} · {relTime(sess.lastSeenAt)}</div>
            </div>
            {!sess.current && (
              <button className={btnGhost()} onClick={() => { setSessions((cur) => cur.filter((x) => x.id !== sess.id)); toast('Session revoked'); }}>Revoke</button>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ──────────────────────── 4 · Data & privacy ─────────────────────── */

function PrivacyPanel({
  privacy, canManage, isOwner, actorName, orgName,
}: { privacy: PrivacySettings; canManage: boolean; isOwner: boolean; actorName: string; orgName: string }) {
  const toast = useToast();
  const [p, setP] = useState(privacy);
  const [confirmErase, setConfirmErase] = useState(false);

  async function patch(body: Partial<PrivacySettings>) {
    const prev = p;
    setP((cur) => ({ ...cur, ...body, consents: { ...cur.consents, ...(body.consents ?? {}) } }));
    const res = await fetch('/api/org/privacy', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!res.ok) { setP(prev); toast('Could not update'); return; }
    toast('Privacy updated');
  }

  async function exportData() {
    const res = await fetch('/api/privacy/export', { method: 'POST' });
    toast(res.ok ? 'Data export request queued' : 'Could not queue export');
  }
  async function erase() {
    const res = await fetch('/api/privacy/erase', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }),
    });
    setConfirmErase(false);
    toast(res.ok ? 'Erasure scheduled' : 'Could not schedule erasure');
  }

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="Data & privacy" sub="Residency, retention, consent, and your data-subject rights (GDPR / PDPL)." />

      <Card className="p-[20px]">
        <Eyebrow className="mb-1">Residency & retention</Eyebrow>
        <ToggleRow label="Residency lock" hint="Pin all compute and storage to the selected region." on={p.residencyLock} disabled={!canManage} onChange={(v) => patch({ residencyLock: v })} />
        <div className="flex items-center justify-between gap-4 border-b border-line-soft py-3.5">
          <div>
            <div className="text-[13.5px] font-medium text-ink-soft">Region</div>
            <div className="mt-0.5 text-[12.5px] text-ink-muted">Where this org&rsquo;s data lives.</div>
          </div>
          <select className={clsx(fieldCls, 'w-[130px]')} value={p.region} disabled={!canManage} onChange={(e) => patch({ region: e.target.value as Region })}>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <ToggleRow label="Auto-delete after retention" hint="Permanently delete records once the retention window elapses." on={p.autoDeleteAfterRetention} disabled={!canManage} onChange={(v) => patch({ autoDeleteAfterRetention: v })} />
        <div className="flex items-center justify-between gap-4 py-3.5">
          <div>
            <div className="text-[13.5px] font-medium text-ink-soft">Retention period</div>
            <div className="mt-0.5 text-[12.5px] text-ink-muted">Months records are kept before deletion.</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" className={clsx(fieldCls, 'w-[80px]')} value={p.retentionMonths} disabled={!canManage}
              onChange={(e) => setP((cur) => ({ ...cur, retentionMonths: Number(e.target.value) }))}
              onBlur={(e) => patch({ retentionMonths: Number(e.target.value) || p.retentionMonths })}
            />
            <span className="text-[12px] text-ink-faint">months</span>
          </div>
        </div>
      </Card>

      <Card className="p-[20px]">
        <Eyebrow className="mb-1">Consent</Eyebrow>
        <ToggleRow label="Analytics" hint="Product usage analytics to improve the service." on={p.consents.analytics} disabled={!canManage} onChange={(v) => patch({ consents: { ...p.consents, analytics: v } })} />
        <ToggleRow label="Marketing" hint="Receive product news and offers." on={p.consents.marketing} disabled={!canManage} onChange={(v) => patch({ consents: { ...p.consents, marketing: v } })} />
        <ToggleRow label="Profiling" hint="Personalised recommendations based on behaviour." on={p.consents.profiling} disabled={!canManage} onChange={(v) => patch({ consents: { ...p.consents, profiling: v } })} />
      </Card>

      <Card className="p-[20px]">
        <Eyebrow className="mb-3">Data-subject rights</Eyebrow>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost()} onClick={exportData}>Export my data</button>
          <button className={btnGhost()} onClick={() => toast('DPA downloaded')}>Download DPA</button>
          <button className={btnGhost()} onClick={() => toast('Sub-processors list opened')}>View sub-processors</button>
        </div>

        <div className="mt-4 rounded-lg border border-[#e8c8be] bg-[#f7e7e2]/50 p-4">
          <div className="text-[13px] font-semibold text-danger">Right to erasure</div>
          <p className="mt-1 text-[12.5px] text-ink-muted">Permanently delete this organisation and all its data. This cannot be undone.</p>
          {!confirmErase ? (
            <button className={btnDanger('mt-3')} disabled={!isOwner} onClick={() => setConfirmErase(true)}>
              Request erasure
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <button className={btnDanger()} onClick={erase}>Confirm erasure</button>
              <button className={btnGhost()} onClick={() => setConfirmErase(false)}>Cancel</button>
            </div>
          )}
          {!isOwner && <p className="mt-2 text-[12px] text-ink-faint">Only the owner can request erasure.</p>}
        </div>

        <p className="mt-4 border-t border-line-soft pt-3 text-[12px] text-ink-faint">
          <span className="font-medium text-ink-muted">{orgName}</span> is the data <span className="font-medium">controller</span>;
          Procur acts as the data <span className="font-medium">processor</span>. Requests are actioned by {actorName} under your DPA.
        </p>
      </Card>
    </div>
  );
}

/* ─────────────────────── 5 · Billing & plan ──────────────────────── */

const invoiceTone: Record<Invoice['status'], 'positive' | 'warning' | 'danger'> = {
  paid: 'positive', due: 'warning', failed: 'danger',
};

function BillingPanel({ plan, usage, invoices, canManage }: { plan: Plan; usage: Usage; invoices: Invoice[]; canManage: boolean }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const perSeat = plan.seatsTotal ? { amount: Math.round(plan.price.amount / plan.seatsTotal), currency: plan.price.currency } : plan.price;

  async function openCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier: plan.tier, seats: plan.seatsTotal }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast('Could not open checkout');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="Billing & plan" sub="Your subscription, live usage against allowances, and invoice history." />

      {/* plan card */}
      <Card className="p-[20px]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Chip tone="accent" mono>{plan.tier}</Chip>
              <Chip mono>{plan.term}</Chip>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <Figure className="text-[28px]" tone="accent">{formatMoney(plan.price)}</Figure>
              <span className="text-[13px] text-ink-muted">/ {plan.term === 'annual' ? 'year' : 'month'}</span>
            </div>
            <div className="mt-1 text-[12px] text-ink-faint">{formatMoney(perSeat)} per seat · renews {fmtDate(plan.renewsAt)}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="font-mono text-[12px] font-semibold text-ink-soft tabular-nums">{plan.seatsUsed} / {plan.seatsTotal} seats</span>
            <button className={btnPrimary()} disabled={!canManage || loading} onClick={openCheckout}>{loading ? 'Opening checkout…' : 'Manage plan'}</button>
          </div>
        </div>
      </Card>

      {/* usage meters */}
      <Card className="p-[20px]">
        <Eyebrow className="mb-4">Usage this period</Eyebrow>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <LabeledBar label="Seats" value={`${usage.seats.used} / ${usage.seats.total}`} pct={(usage.seats.used / Math.max(1, usage.seats.total)) * 100} />
          <LabeledBar label="API calls" value={`${usage.apiCalls.used.toLocaleString()} / ${usage.apiCalls.included.toLocaleString()}`} pct={(usage.apiCalls.used / Math.max(1, usage.apiCalls.included)) * 100} />
          <div className="flex items-center justify-between rounded-lg border border-line-soft bg-surface-2 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Negotiations</span>
            <Figure className="text-[18px]">{usage.negotiations}</Figure>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-line-soft bg-surface-2 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Queries run</span>
            <Figure className="text-[18px]">{usage.queries}</Figure>
          </div>
        </div>
      </Card>

      {/* invoices */}
      <div>
        <Eyebrow className="mb-2">Invoice history</Eyebrow>
        <Card className="overflow-hidden p-0">
          <div className="grid border-b border-line bg-surface-2 px-4 py-2.5" style={{ gridTemplateColumns: '1fr 130px 110px 110px' }}>
            {['Period', 'Amount', 'Status', ''].map((h, i) => <Eyebrow key={i}>{h}</Eyebrow>)}
          </div>
          {invoices.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-ink-faint">No invoices yet.</div>}
          {invoices.map((inv) => (
            <div key={inv.id} className="grid items-center border-b border-line-soft px-4 py-3 last:border-0" style={{ gridTemplateColumns: '1fr 130px 110px 110px' }}>
              <div>
                <div className="text-[13.5px] font-medium text-ink">{inv.period}</div>
                <div className="font-mono text-[11px] text-ink-faint">{inv.id}</div>
              </div>
              <Figure className="text-[14px]">{formatMoney(inv.amount)}</Figure>
              <Chip tone={invoiceTone[inv.status]} className="w-fit">{inv.status}</Chip>
              <a href={inv.pdfUrl} className="text-[12px] font-semibold text-accent transition hover:text-accent-dark">Download PDF</a>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────── 6 · API & connectors ────────────────────── */

const SCOPE_OPTIONS = ['graph.read', 'briefs.read', 'briefs.write', 'negotiations.read', 'billing.read'];
const connectorTone: Record<Connector['status'], 'positive' | 'neutral' | 'danger'> = {
  connected: 'positive', disconnected: 'neutral', error: 'danger',
};

function ApiPanel({ apiKeys, connectors, canManage }: { apiKeys: ApiKey[]; connectors: Connector[]; canManage: boolean }) {
  const toast = useToast();
  const [keys, setKeys] = useState(apiKeys);
  const [conns, setConns] = useState(connectors);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEnv, setNewEnv] = useState<'live' | 'test'>('test');
  const [newScopes, setNewScopes] = useState<string[]>(['graph.read']);
  const [reveal, setReveal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createKey() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName, env: newEnv, scopes: newScopes }),
      });
      if (!res.ok) throw new Error();
      const { key, secretOnce }: { key: ApiKey; secretOnce: string } = await res.json();
      setKeys((cur) => [key, ...cur]);
      setReveal(secretOnce);
      setCreating(false);
      setNewName('');
      toast('API key created');
    } catch {
      toast('Could not create key');
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    const prev = keys;
    setKeys((cur) => cur.filter((k) => k.id !== id));
    const res = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' });
    if (!res.ok) { setKeys(prev); toast('Could not revoke'); return; }
    toast('Key revoked');
  }

  async function toggleConnector(type: string) {
    const res = await fetch(`/api/connectors/${type}/connect`, { method: 'POST' });
    if (!res.ok) { toast('Could not update connector'); return; }
    const updated: Connector = await res.json();
    setConns((cur) => cur.map((c) => (c.type === type ? updated : c)));
    toast(updated.status === 'connected' ? `${updated.name} connected` : `${updated.name} disconnected`);
  }

  function toggleScope(s: string) {
    setNewScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="API & connectors" sub="Programmatic access keys and third-party integrations." />

      {/* one-time secret reveal */}
      {reveal && (
        <Card className="border-accent bg-accent-faint p-[20px]">
          <Eyebrow className="mb-2 text-accent">New secret — shown once</Eyebrow>
          <p className="mb-3 text-[12.5px] text-ink-muted">Copy this now. For your security it will never be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-surface px-3 py-2 font-mono text-[12.5px] text-ink">{reveal}</code>
            <button className={btnGhost()} onClick={() => { navigator.clipboard?.writeText(reveal); toast('Copied'); }}>Copy</button>
            <button className={btnGhost()} onClick={() => setReveal(null)}>Done</button>
          </div>
        </Card>
      )}

      {/* keys */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2.5">
          <Eyebrow>API keys</Eyebrow>
          {canManage && !creating && <button className="text-[12px] font-semibold text-accent hover:text-accent-dark" onClick={() => setCreating(true)}>＋ Create key</button>}
        </div>

        {creating && (
          <div className="border-b border-line-soft bg-accent-faint/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input className={clsx(fieldCls, 'sm:flex-1')} placeholder="Key name, e.g. CI pipeline" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <select className={clsx(fieldCls, 'sm:w-[120px]')} value={newEnv} onChange={(e) => setNewEnv(e.target.value as 'live' | 'test')}>
                <option value="test">test</option>
                <option value="live">live</option>
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SCOPE_OPTIONS.map((sc) => (
                <button key={sc} type="button" onClick={() => toggleScope(sc)}
                  className={clsx('rounded-[5px] border px-2.5 py-[5px] font-mono text-[11.5px] transition',
                    newScopes.includes(sc) ? 'border-transparent bg-accent-tint text-accent' : 'border-line bg-surface text-ink-muted hover:border-line-strong')}>
                  {sc}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button className={btnPrimary()} disabled={busy} onClick={createKey}>{busy ? 'Creating…' : 'Create key'}</button>
              <button className={btnGhost()} onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="grid border-b border-line-soft px-4 py-2" style={{ gridTemplateColumns: '1fr 70px 1.4fr 100px 90px' }}>
          {['Name', 'Env', 'Secret / scopes', 'Last used', ''].map((h, i) => <Eyebrow key={i}>{h}</Eyebrow>)}
        </div>
        {keys.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-ink-faint">No API keys.</div>}
        {keys.map((k) => (
          <div key={k.id} className="grid items-center border-b border-line-soft px-4 py-3 last:border-0" style={{ gridTemplateColumns: '1fr 70px 1.4fr 100px 90px' }}>
            <span className="truncate text-[13.5px] font-medium text-ink">{k.name}</span>
            <Chip tone={k.env === 'live' ? 'warning' : 'neutral'} mono className="w-fit">{k.env}</Chip>
            <div className="min-w-0">
              <code className="block truncate font-mono text-[12px] text-ink-soft">{k.maskedSecret}</code>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {k.scopes.map((s) => <span key={s} className="font-mono text-[10px] text-ink-faint">{s}</span>)}
              </div>
            </div>
            <span className="font-mono text-[12px] text-ink-muted tabular-nums">{relTime(k.lastUsedAt)}</span>
            {canManage && <button className="text-[12px] font-medium text-ink-faint transition hover:text-danger" onClick={() => revokeKey(k.id)}>Revoke</button>}
          </div>
        ))}
      </Card>

      {/* connectors */}
      <div>
        <Eyebrow className="mb-2">Connectors</Eyebrow>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {conns.map((c) => (
            <Card key={c.type} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-tint font-mono text-[13px] font-semibold text-accent">{initials(c.name)}</div>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium text-ink">{c.name}</div>
                  <div className="truncate text-[12px] text-ink-faint">{c.purpose}</div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Chip tone={connectorTone[c.status]}>{c.status === 'connected' ? 'Connected' : c.status === 'error' ? 'Error' : 'Not connected'}</Chip>
                {canManage && (
                  <button className="text-[12px] font-semibold text-accent transition hover:text-accent-dark" onClick={() => toggleConnector(c.type)}>
                    {c.status === 'connected' ? 'Disconnect' : 'Connect'}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── 7 · Notifications ───────────────────────── */

function NotificationsPanel({ notifications }: { notifications: NotificationSettings }) {
  const toast = useToast();
  const [n, setN] = useState(notifications);

  async function patch(next: NotificationSettings) {
    const prev = n;
    setN(next);
    const res = await fetch('/api/notifications/settings', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next),
    });
    if (!res.ok) { setN(prev); toast('Could not update'); return; }
    toast('Notifications updated');
  }

  const typeRows: { key: keyof NotificationSettings['types']; label: string; hint: string }[] = [
    { key: 'priceDrop', label: 'Price drops', hint: 'When a watched vendor lowers their price.' },
    { key: 'newVendor', label: 'New vendor matches', hint: 'When a new vendor matches a saved search.' },
    { key: 'renewal', label: 'Renewal reminders', hint: 'Ahead of contract and subscription renewals.' },
    { key: 'weeklyDigest', label: 'Weekly digest', hint: 'A summary of market movement every Monday.' },
  ];
  const channelRows: { key: keyof NotificationSettings['channels']; label: string; hint: string }[] = [
    { key: 'email', label: 'Email', hint: 'Send to your account email.' },
    { key: 'inApp', label: 'In-app', hint: 'Show in the notification centre.' },
    { key: 'slack', label: 'Slack', hint: 'Post to your connected Slack workspace.' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="Notifications" sub="Choose what you&rsquo;re notified about and where it&rsquo;s delivered." />

      <Card className="p-[20px]">
        <Eyebrow className="mb-1">Notify me about</Eyebrow>
        {typeRows.map((r) => (
          <ToggleRow key={r.key} label={r.label} hint={r.hint} on={n.types[r.key]} onChange={(v) => patch({ ...n, types: { ...n.types, [r.key]: v } })} />
        ))}
      </Card>

      <Card className="p-[20px]">
        <Eyebrow className="mb-1">Channels</Eyebrow>
        {channelRows.map((r) => (
          <ToggleRow key={r.key} label={r.label} hint={r.hint} on={n.channels[r.key]} onChange={(v) => patch({ ...n, channels: { ...n.channels, [r.key]: v } })} />
        ))}
      </Card>
    </div>
  );
}

/* ─────────────────────────── 8 · Audit log ───────────────────────── */

function AuditPanel({ events, members, canManage }: { events: AuditEvent[]; members: Member[]; canManage: boolean }) {
  const toast = useToast();
  const [siem, setSiem] = useState(false);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      <PanelHead title="Audit log" sub="A tamper-evident record of every privileged action in your organisation." />

      <Card className="p-[20px]">
        <ToggleRow label="SIEM auto-export" hint="Stream audit events to your SIEM (Splunk, Datadog) in real time." on={siem} disabled={!canManage} onChange={(v) => { setSiem(v); toast(v ? 'SIEM export on' : 'SIEM export off'); }} />
        <div className="mt-2 flex items-center justify-between gap-4 pt-2">
          <p className="text-[12px] text-ink-faint">Events are retained for 24 months and chained with a tamper-evident SHA-256 hash.</p>
          <a href="/api/audit/export?format=csv" className={btnGhost('shrink-0')}>Export CSV</a>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="grid border-b border-line bg-surface-2 px-4 py-2.5" style={{ gridTemplateColumns: '1fr 1.2fr 1fr 130px 130px' }}>
          {['Actor', 'Action', 'Target', 'IP', 'When'].map((h) => <Eyebrow key={h}>{h}</Eyebrow>)}
        </div>
        {events.length === 0 && <div className="px-4 py-8 text-center text-[13px] text-ink-faint">No audit events yet.</div>}
        {events.map((e) => (
          <div key={e.id} className="grid items-center border-b border-line-soft px-4 py-2.5 last:border-0" style={{ gridTemplateColumns: '1fr 1.2fr 1fr 130px 130px' }}>
            <span className="truncate text-[13px] font-medium text-ink-soft">{nameOf(e.actor)}</span>
            <span className="truncate font-mono text-[12px] text-accent">{e.action}</span>
            <span className="truncate font-mono text-[12px] text-ink-muted">{e.target ?? '—'}</span>
            <span className="font-mono text-[12px] text-ink-faint tabular-nums">{e.ip ?? '—'}</span>
            <span className="font-mono text-[12px] text-ink-muted tabular-nums">{fmtDateTime(e.at)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
