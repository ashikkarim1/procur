'use client';
import { useState } from 'react';
import { useToast } from '../Toast';
import { Eyebrow } from '../primitives';

export function SendShare({
  briefId,
  subject,
  body,
  defaultRecipient = '',
}: {
  briefId: string;
  subject: string;
  body: string;
  defaultRecipient?: string;
}) {
  const toast = useToast();
  const [recipient, setRecipient] = useState(defaultRecipient);

  function emailBrief() {
    const fullBody = `${body}\n\n${typeof window !== 'undefined' ? window.location.href : ''}`;
    const href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    window.location.href = href;
    toast(recipient ? `Opening email to ${recipient}` : 'Opening your mail client');
  }

  async function copyShareLink() {
    try {
      const res = await fetch(`/api/copilot/briefs/${briefId}/share`, { method: 'POST' });
      const link = res.ok ? (await res.json()).url : window.location.href;
      await navigator.clipboard.writeText(link);
      toast('Share link copied to clipboard');
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast('Share link copied to clipboard');
      } catch {
        toast(window.location.href);
      }
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-[18px]">
      <Eyebrow className="mb-2.5">Send &amp; share</Eyebrow>
      <input
        type="email"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="recipient@company.com"
        className="mb-2.5 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink-soft outline-none placeholder:text-ink-fainter focus:border-accent"
      />
      <button
        type="button"
        onClick={emailBrief}
        className="mb-2 w-full rounded-lg bg-accent px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-dark"
      >
        ✉ Email this brief
      </button>
      <button
        type="button"
        onClick={copyShareLink}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-[#f7f5f0]"
      >
        ⧉ Copy share link
      </button>
      <p className="mt-2 text-[11px] text-ink-faint">
        {recipient ? `Sends to ${recipient}` : 'Set a recipient to address the email.'}
      </p>
    </div>
  );
}
