import {describe, expect, it} from 'vitest';

import {money, moneyFromDecimal} from '../src/index.ts';

describe('moneyFromDecimal', () => {
  it('parses decimal strings into exact minor units', () => {
    expect(moneyFromDecimal('180.00', 'EUR')).toEqual(money(18_000, 'EUR'));
    expect(moneyFromDecimal('105.83', 'EUR')).toEqual(money(10_583, 'EUR'));
    expect(moneyFromDecimal('0.1', 'EUR')).toEqual(money(10, 'EUR'));
    expect(moneyFromDecimal('42', 'USD')).toEqual(money(4_200, 'USD'));
  });

  it('keeps the sign and never produces negative zero', () => {
    expect(moneyFromDecimal('-74.17', 'EUR')).toEqual(money(-7_417, 'EUR'));
    expect(Object.is(moneyFromDecimal('-0.00', 'EUR').minorUnits, 0)).toBe(true);
  });

  it('uses the minor-unit digits of each currency', () => {
    expect(moneyFromDecimal('1500', 'JPY')).toEqual(money(1_500, 'JPY'));
    expect(moneyFromDecimal('1.234', 'KWD')).toEqual(money(1_234, 'KWD'));
  });

  it('refuses to round instead of failing', () => {
    expect(() => moneyFromDecimal('0.001', 'EUR')).toThrow(RangeError);
    expect(() => moneyFromDecimal('1.5', 'JPY')).toThrow(RangeError);
  });

  it('rejects anything that is not a plain decimal', () => {
    for (const value of ['', 'abc', '1,50', '1e3', '.5', '1.', '--1']) {
      expect(() => moneyFromDecimal(value, 'EUR')).toThrow(RangeError);
    }
  });
});
