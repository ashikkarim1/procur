import type { Money } from '@/contracts/types';

// Money is ALWAYS minor units in a stated currency — never floats in storage/transport.
export const money = (amount: number, currency = 'USD'): Money => ({ amount, currency });

export const addMoney = (a: Money, b: Money): Money => {
  if (a.currency !== b.currency) throw new Error(`currency mismatch: ${a.currency} vs ${b.currency}`);
  return { amount: a.amount + b.amount, currency: a.currency };
};

export const sumMoney = (xs: Money[], currency = 'USD'): Money =>
  xs.reduce((acc, m) => addMoney(acc, m), money(0, currency));

export const scaleMoney = (m: Money, factor: number): Money => ({
  amount: Math.round(m.amount * factor),
  currency: m.currency,
});

const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };

// Full precision, e.g. $128,000.00
export function formatMoney(m: Money): string {
  const sym = symbols[m.currency] ?? `${m.currency} `;
  const major = m.amount / 100;
  return `${sym}${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Compact figure for the terminal UI, e.g. $128k, $4.2M.
export function formatCompact(m: Money): string {
  const sym = symbols[m.currency] ?? `${m.currency} `;
  const major = m.amount / 100;
  const abs = Math.abs(major);
  const sign = major < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}${sym}${Math.round(abs / 1_000)}k`;
  return `${sign}${sym}${Math.round(abs)}`;
}
