/** Date layouts found in alerts; the separators are part of the layout. */
export type DateFormat = 'DD/MM/YYYY' | 'DD-MM-YYYY' | 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

function pattern(format: DateFormat): RegExp {
  const source = format
    .replaceAll('.', '\\.')
    .replace('DD', '(?<day>\\d{1,2})')
    .replace('MM', '(?<month>\\d{1,2})')
    .replace('YYYY', '(?<year>\\d{4})');
  return new RegExp(`^${source}$`, 'u');
}

/** ISO `YYYY-MM-DD` of a date written in `format`, or `null` when it is not a real date. */
export function parseDate(written: string, format: DateFormat): string | null {
  const groups = pattern(format).exec(written.trim())?.groups;
  if (groups === undefined) {
    return null;
  }
  const [year, month, day] = [groups['year'], groups['month'], groups['day']].map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));
  const iso = date.toISOString().slice(0, 10);
  const expected = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return iso === expected ? iso : null;
}
