import {currencyCode, currencyDigits, money} from './money.ts';
import type {Money} from './money.ts';

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/u;

/**
 * Parses a decimal amount such as "123.45" into exact minor units, without
 * floating-point arithmetic. More fraction digits than the currency allows is
 * an error, never a silent rounding.
 */
export function moneyFromDecimal(value: string, currency: string): Money {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (match === null) {
    throw new RangeError(`Not a decimal amount: "${value}"`);
  }
  const [, sign = '', whole = '0', fraction = ''] = match;
  const code = currencyCode(currency);
  const digits = currencyDigits(code);
  if (fraction.length > digits) {
    throw new RangeError(`"${value}" has more than ${String(digits)} decimals for ${code}`);
  }
  // Adding 0 turns -0 into 0 so that equal amounts compare equal.
  return money(Number(`${sign}${whole}${fraction.padEnd(digits, '0')}`) + 0, code);
}
