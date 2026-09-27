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

/**
 * Writes exact minor units as a plain decimal string such as "-123.45", with as many fraction
 * digits as the currency has. The inverse of `moneyFromDecimal`.
 */
export function moneyToDecimal(amount: Money): string {
  const digits = currencyDigits(amount.currency);
  const sign = amount.minorUnits < 0 ? '-' : '';
  const magnitude = String(Math.abs(amount.minorUnits)).padStart(digits + 1, '0');
  if (digits === 0) {
    return `${sign}${magnitude}`;
  }
  return `${sign}${magnitude.slice(0, -digits)}.${magnitude.slice(-digits)}`;
}
