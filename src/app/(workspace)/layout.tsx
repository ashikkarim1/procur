import { CommandRail } from '@/components/CommandRail';
import { ContextBar } from '@/components/ContextBar';
import { ToastProvider } from '@/components/Toast';
import { getOrgContext } from '@/lib/data';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { actor, profile } = await getOrgContext();
  const initials = actor.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <CommandRail user={{ initials, org: profile.orgName, sub: `${jobLine(actor.role)} · ${profile.city ?? profile.country}` }} />
        <div className="flex min-w-0 flex-1 flex-col">
          <ContextBar profile={profile} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1140px] px-[30px] pb-[60px] pt-[30px]">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

function jobLine(role: string): string {
  return role === 'owner' || role === 'admin' ? 'Procurement' : role === 'approver' ? 'Finance' : 'Member';
}
