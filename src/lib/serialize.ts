import type { SavedSearch, WatchItem } from '@/contracts/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function toSavedSearch(r: any): SavedSearch {
  return {
    id: r.id, orgId: r.orgId, createdBy: r.createdBy,
    title: r.title, query: r.query, filters: r.filters,
    lastRunAt: r.lastRunAt?.toISOString(),
    lastResultCount: r.lastResultCount ?? undefined,
    delta: r.delta ?? undefined,
    alertsEnabled: r.alertsEnabled,
  };
}

export function toWatchItem(r: any): WatchItem {
  return {
    id: r.id, orgId: r.orgId, productId: r.productId,
    addedAt: r.addedAt.toISOString(),
    alerts: r.alerts,
    signal: r.signal ?? undefined,
  };
}
