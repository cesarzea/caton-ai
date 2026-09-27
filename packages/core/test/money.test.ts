import {describe, expect, it} from 'vitest';

import {addMoney, currencyCode, formatMoney, money} from '../src/index.ts';

describe('money', () => {
  it('keeps amounts as integer minor units', () => {
    expect(money(10_788, 'USD')).toEqual({minorUnits: 10_788, currency: 'USD'});
  });

  it('rejects fractional or unsafe minor units', () => {
    expect(() => money(10.5, 'USD')).toThrow(RangeError);
    expect(() => money(Number.MAX_SAFE_INTEGER + 1, 'USD')).toThrow(RangeError);
  });

  it('rejects malformed currency codes', () => {
    expect(() => currencyCode('usd')).toThrow(RangeError);
    expect(() => currencyCode('EURO')).toThrow(RangeError);
  });
});

describe('addMoney', () => {
  it('adds amounts in the same currency', () => {
    expect(addMoney(money(6_209, 'USD'), money(4_579, 'USD'))).toEqual(money(10_788, 'USD'));
  });

  it('refuses to mix currencies', () => {
    expect(() => addMoney(money(100, 'USD'), money(100, 'EUR'))).toThrow(TypeError);
  });
});

describe('formatMoney', () => {
  it('uses the currency minor unit digits', () => {
    expect(formatMoney(money(10_788, 'USD'), 'en-US')).toBe('$107.88');
    expect(formatMoney(money(1_500, 'JPY'), 'en-US')).toBe('¥1,500');
  });
});
