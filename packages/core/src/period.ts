/**
 * First day of the calendar month `months - 1` months before `now` (UTC), as ISO `YYYY-MM-DD`:
 * the start of a period covering the last `months` calendar months, the current one included.
 */
export function firstDayOfLastMonths(now: Date, months: number): string {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return start.toISOString().slice(0, 10);
}
