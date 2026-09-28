import {describe, expect, it} from 'vitest';

import {currencyOf, mentionsAmount, parseWrittenAmount} from '../src/amount.ts';
import {parseDate} from '../src/date.ts';

describe('parseWrittenAmount', () => {
  it('reads every common style and the currency written in it', () => {
    expect(parseWrittenAmount('1.234,56 €')).toEqual({decimal: '1234.56', currency: 'EUR'});
    expect(parseWrittenAmount('$1,234.56')).toEqual({decimal: '1234.56', currency: 'USD'});
    expect(parseWrittenAmount('USD 5.5')).toEqual({decimal: '5.5', currency: 'USD'});
    expect(parseWrittenAmount('1.234 €')).toEqual({decimal: '1234', currency: 'EUR'});
    expect(parseWrittenAmount('12,99')).toEqual({decimal: '12.99', currency: null});
  });

  it('refuses what is not an amount', () => {
    expect(parseWrittenAmount('free')).toBeNull();
    expect(parseWrittenAmount('1.2.3,4,5')).toBeNull();
  });
});

describe('currencies and amounts in text', () => {
  it('reads codes and common symbols, and finds amounts next to them', () => {
    expect([currencyOf('eur'), currencyOf('£'), currencyOf('dollars')]).toEqual([
      'EUR',
      'GBP',
      null,
    ]);
    expect(mentionsAmount('Total: 12,99 €')).toBe(true);
    expect(mentionsAmount('EUR 5')).toBe(true);
    expect(mentionsAmount('We accept EUR and $ soon')).toBe(false);
  });
});

describe('parseDate', () => {
  it('reads ISO dates and rejects impossible ones', () => {
    expect(parseDate('2026-09-19', 'YYYY-MM-DD')).toBe('2026-09-19');
    expect(parseDate('19/09/2026', 'DD/MM/YYYY')).toBe('2026-09-19');
    expect(parseDate('2026-02-30', 'YYYY-MM-DD')).toBeNull();
  });
});
