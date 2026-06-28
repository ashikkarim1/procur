'use client';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

export function AddToCompare({ productId, label = '＋ Add to compare' }: { productId: string; label?: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        toast('Added to comparison');
        router.push(`/compare?ids=${productId}`);
      }}
      className="rounded-lg bg-accent px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-accent-dark"
    >
      {label}
    </button>
  );
}
