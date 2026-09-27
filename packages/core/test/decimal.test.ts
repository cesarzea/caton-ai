import {describe, expect, it} from 'vitest';

import {money, moneyFromDecimal, moneyToDecimal} from '../src/index.ts';

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

describe('moneyToDecimal', () => {
  it('writes exact decimals with the minor-unit digits of each currency', () => {
    expect(moneyToDecimal(money(10_583, 'EUR'))).toBe('105.83');
    expect(moneyToDecimal(money(5, 'EUR'))).toBe('0.05');
    expect(moneyToDecimal(money(0, 'EUR'))).toBe('0.00');
    expect(moneyToDecimal(money(-7_417, 'EUR'))).toBe('-74.17');
    expect(moneyToDecimal(money(-3, 'EUR'))).toBe('-0.03');
    expect(moneyToDecimal(money(1_500, 'JPY'))).toBe('1500');
    expect(moneyToDecimal(money(-1_234, 'KWD'))).toBe('-1.234');
  });

  it('round-trips with moneyFromDecimal', () => {
    const cases: [number, string][] = [
      [18_000, 'EUR'],
      [-1, 'EUR'],
      [Number.MAX_SAFE_INTEGER, 'EUR'],
      [-987, 'JPY'],
      [1, 'KWD'],
    ];
    for (const [minorUnits, currency] of cases) {
      const amount = money(minorUnits, currency);
      expect(moneyFromDecimal(moneyToDecimal(amount), currency)).toEqual(amount);
    }
  });
});
