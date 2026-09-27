import type {SyncRun} from '@caton-ai/ledger';

/** History fetched the first time a source is synced. */
export const INITIAL_LOOKBACK_DAYS = 90;
/** Days re-fetched on every sync so late bookings and pending changes are picked up. */
export const OVERLAP_DAYS = 10;

const DAY_MS = 86_400_000;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** First date to fetch: an overlap before the last successful sync, or the initial lookback. */
export function syncFromDate(lastSuccess: SyncRun | null, now: Date): string {
  if (lastSuccess === null) {
    return isoDate(new Date(now.getTime() - INITIAL_LOOKBACK_DAYS * DAY_MS));
  }
  return isoDate(new Date(new Date(lastSuccess.finishedAt).getTime() - OVERLAP_DAYS * DAY_MS));
}
