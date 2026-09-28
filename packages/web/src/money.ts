/** An exact decimal amount of the API, formatted in the page's locale; a dash when unknown. */
export function formatAmount(amount: string | null, currency: string | null): string {
  if (amount === null || currency === null) {
    return '—';
  }
  return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(Number(amount));
}
