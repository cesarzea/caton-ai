const SYMBOLS: Readonly<Record<string, string>> = {'€': 'EUR', $: 'USD', '£': 'GBP', '¥': 'JPY'};

/** ISO 4217 code of a currency written as a code or a common symbol, or `null`. */
export function currencyOf(written: string): string | null {
  const trimmed = written.trim().toUpperCase();
  return /^[A-Z]{3}$/u.test(trimmed) ? trimmed : (SYMBOLS[trimmed] ?? null);
}

const DIGIT = /\d/u;

/** The currency written inside an amount, such as `€` in `12,99 €` or `USD` in `USD 5.00`. */
function currencyInside(written: string): string | null {
  const symbol = /[€$£¥]/u.exec(written)?.[0];
  if (symbol !== undefined) {
    return SYMBOLS[symbol] ?? null;
  }
  const code = /\b[A-Z]{3}\b/u.exec(written.toUpperCase())?.[0];
  return code === undefined ? null : currencyOf(code);
}

/**
 * The plain decimal of an amount written in any common style: `1.234,56`, `1,234.56`, `12,99`,
 * `12.99` or `1234`. A separator followed by one or two final digits is the decimal one; any
 * other separator groups thousands. `null` when it is not a number.
 */
function decimalOf(written: string): string | null {
  const compact = written.replaceAll(/[^\d.,]/gu, '');
  return DIGIT.test(compact) ? splitDecimal(compact) : null;
}

/** Thousands separators group exactly three digits: `1.234.567`, never `1.2.3`. */
const groupsThousands = (whole: string): boolean =>
  /^\d+$/u.test(whole) || /^\d{1,3}(?:[.,]\d{3})+$/u.test(whole);

function splitDecimal(compact: string): string | null {
  const last = Math.max(compact.lastIndexOf('.'), compact.lastIndexOf(','));
  const tail = last < 0 ? '' : compact.slice(last + 1);
  const hasDecimals = last >= 0 && tail.length >= 1 && tail.length <= 2;
  const whole = hasDecimals ? compact.slice(0, last) : compact;
  if (!groupsThousands(whole)) {
    return null;
  }
  const digits = whole.replaceAll(/[.,]/gu, '');
  return hasDecimals ? `${digits}.${tail}` : digits;
}

/** An amount as an email writes it, read without guessing; the currency when it is written in it. */
export function parseWrittenAmount(
  written: string,
): {readonly decimal: string; readonly currency: string | null} | null {
  const decimal = decimalOf(written);
  return decimal === null ? null : {decimal, currency: currencyInside(written)};
}

const MARKERS = ['€', '$', '£', 'EUR', 'USD', 'GBP', 'CHF'];

/** Whether the text holds a currency marker with a digit right next to it. */
export function mentionsAmount(text: string): boolean {
  return MARKERS.some(marker => {
    for (let at = text.indexOf(marker); at >= 0; at = text.indexOf(marker, at + 1)) {
      const around = text.slice(Math.max(0, at - 3), at + marker.length + 3);
      if (DIGIT.test(around)) {
        return true;
      }
    }
    return false;
  });
}
