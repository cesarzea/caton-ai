/** How a sender writes numbers: `1.234,56` (comma decimal) or `1,234.56` (dot decimal). */
export type NumberFormat = 'comma-decimal' | 'dot-decimal';

const PLAIN_DECIMAL = /^\d+(?:\.\d+)?$/u;

/**
 * Turns an amount as written in an email into a plain decimal string such as `1234.56`, or
 * `null` when it is not a number in that format. Never guesses.
 */
export function normalizeAmount(written: string, format: NumberFormat): string | null {
  const [groupSeparator, decimalSeparator] = format === 'comma-decimal' ? ['.', ','] : [',', '.'];
  const compact = written.replaceAll(/\s/gu, '').replaceAll(groupSeparator, '');
  const decimal = compact.replace(decimalSeparator, '.');
  return PLAIN_DECIMAL.test(decimal) ? decimal : null;
}

const SYMBOLS: Readonly<Record<string, string>> = {'€': 'EUR', $: 'USD', '£': 'GBP'};

/** ISO 4217 code of a currency written as a code or a common symbol, or `null`. */
export function currencyOf(written: string): string | null {
  const trimmed = written.trim().toUpperCase();
  return /^[A-Z]{3}$/u.test(trimmed) ? trimmed : (SYMBOLS[trimmed] ?? null);
}
