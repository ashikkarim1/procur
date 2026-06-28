'use client';
import { useState } from 'react';
import { useToast } from '../Toast';
import { clsx } from '../clsx';
import type { ChecklistItem } from '@/contracts/types';

export function GoLiveChecklist({ id, items }: { id: string; items: ChecklistItem[] }) {
  const toast = useToast();
  const [list, setList] = useState<ChecklistItem[]>(items);
  const [pending, setPending] = useState<number | null>(null);

  async function toggle(index: number) {
    const next = !list[index].done;
    const prev = list;
    // optimistic
    setList((cur) => cur.map((c, i) => (i === index ? { ...c, done: next } : c)));
    setPending(index);
    try {
      const res = await fetch(`/api/implementation/${id}/checklist`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itemIndex: index, done: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setList(prev); // rollback
      toast('Could not update checklist');
    } finally {
      setPending(null);
    }
  }

  return (
    <ul className="flex flex-col">
      {list.map((item, i) => (
        <li key={i} className="border-t border-line-soft first:border-0">
          <button
            type="button"
            onClick={() => toggle(i)}
            disabled={pending === i}
            className="flex w-full items-center gap-2.5 py-2 text-left transition disabled:opacity-60"
          >
            <span
              className={clsx(
                'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition',
                item.done
                  ? 'border-positive bg-positive text-white'
                  : 'border-line-strong bg-surface text-transparent',
              )}
            >
              ✓
            </span>
            <span
              className={clsx(
                'text-[13.5px] leading-snug transition',
                item.done ? 'text-ink-faint line-through' : 'text-ink-soft',
              )}
            >
              {item.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
