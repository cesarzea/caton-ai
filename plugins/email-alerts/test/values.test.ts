import {describe, expect, it} from 'vitest';

import {currencyOf, normalizeAmount} from '../src/amount.ts';
import {parseDate} from '../src/date.ts';

describe('normalizeAmount', () => {
  it('reads both number conventions exactly', () => {
    expect(normalizeAmount('1.234,56', 'comma-decimal')).toBe('1234.56');
    expect(normalizeAmount('1 234,5', 'comma-decimal')).toBe('1234.5');
    expect(normalizeAmount('1,234.56', 'dot-decimal')).toBe('1234.56');
    expect(normalizeAmount('50', 'dot-decimal')).toBe('50');
  });

  it('refuses anything else instead of guessing', () => {
    expect(normalizeAmount('12,3,4', 'comma-decimal')).toBeNull();
    expect(normalizeAmount('-5,00', 'comma-decimal')).toBeNull();
    expect(normalizeAmount('abc', 'dot-decimal')).toBeNull();
  });
});

describe('currencyOf', () => {
  it('reads codes and common symbols', () => {
    expect([currencyOf(' usd '), currencyOf('€'), currencyOf('£'), currencyOf('¥')]).toEqual([
      'USD',
      'EUR',
      'GBP',
      null,
    ]);
  });
});

describe('parseDate', () => {
  it('reads every supported layout into ISO dates', () => {
    expect(parseDate('19/09/2026', 'DD/MM/YYYY')).toBe('2026-09-19');
    expect(parseDate('9-1-2026', 'DD-MM-YYYY')).toBe('2026-01-09');
    expect(parseDate('19.09.2026', 'DD.MM.YYYY')).toBe('2026-09-19');
    expect(parseDate('09/19/2026', 'MM/DD/YYYY')).toBe('2026-09-19');
    expect(parseDate('2026-09-19', 'YYYY-MM-DD')).toBe('2026-09-19');
  });

  it('rejects impossible dates and other layouts', () => {
    expect(parseDate('31/02/2026', 'DD/MM/YYYY')).toBeNull();
    expect(parseDate('19/09/2026', 'YYYY-MM-DD')).toBeNull();
    expect(parseDate('19x09x2026', 'DD.MM.YYYY')).toBeNull();
  });
});
