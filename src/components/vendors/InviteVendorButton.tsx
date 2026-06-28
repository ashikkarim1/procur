'use client';
import { useToast } from '../Toast';

export function InviteVendorButton() {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast('Invite sent (stub)')}
      className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-dark"
    >
      ＋ Invite vendor
    </button>
  );
}
