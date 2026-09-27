/** ISO 4217 alphabetic currency code, validated at construction. */
export type CurrencyCode = string & {readonly brand: 'CurrencyCode'};

/**
 * An amount of money held as an integer number of minor units (e.g. cents),
 * so that sums never accumulate floating-point error.
 */
export interface Money {
  readonly minorUnits: number;
  readonly currency: CurrencyCode;
}

const CURRENCY_PATTERN = /^[A-Z]{3}$/u;

export function currencyCode(code: string): CurrencyCode {
  if (!CURRENCY_PATTERN.test(code)) {
    throw new RangeError(`Invalid ISO 4217 currency code: "${code}"`);
  }
  return code as CurrencyCode;
}

export function money(minorUnits: number, currency: string): Money {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new RangeError(`Minor units must be a safe integer, got ${String(minorUnits)}`);
  }
  return {minorUnits, currency: currencyCode(currency)};
}

export function addMoney(left: Money, right: Money): Money {
  if (left.currency !== right.currency) {
    throw new TypeError(`Cannot add ${left.currency} to ${right.currency}`);
  }
  return money(left.minorUnits + right.minorUnits, left.currency);
}

export function formatMoney(amount: Money, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: amount.currency,
  });
  const fraction = formatter.formatToParts(0).find(part => part.type === 'fraction');
  const digits = fraction?.value.length ?? 0;
  return formatter.format(amount.minorUnits / 10 ** digits);
}
