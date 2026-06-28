'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../Toast';

export function SubmitForApproval({ id, approverName }: { id: string; approverName?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch(`/api/negotiations/${id}/submit-for-approval`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      toast(approverName ? `Sent to ${approverName} for approval` : 'Sent for approval');
      router.refresh();
    } catch {
      toast('Could not submit for approval');
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={submit}
      disabled={busy}
      className="w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-dark disabled:opacity-50"
    >
      {busy ? 'Submitting…' : 'Send to CFO for approval →'}
    </button>
  );
}
