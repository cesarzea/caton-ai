import type {FinancialDocument} from '@caton-ai/core';

export interface TrialResult {
  readonly model: string;
  readonly calls: number;
  readonly costNanoUsd: number;
  /** Calls whose price is unknown, so the cost shown is a lower bound. */
  readonly unpriced: number;
  readonly documents: readonly FinancialDocument[];
  readonly error: string | null;
  readonly seconds: number;
}

const usd = (nano: number): string => `$${(nano / 1e9).toFixed(4)}`;

export function trialRow(result: TrialResult): string[] {
  const verified = result.documents.filter(document => document.verified).length;
  return [
    result.model,
    String(result.calls),
    String(result.documents.length),
    String(verified),
    usd(result.costNanoUsd) + (result.unpriced > 0 ? ` + ${String(result.unpriced)} unpriced` : ''),
    result.seconds.toFixed(1),
    result.error ?? '',
  ];
}

function reading(document: FinancialDocument | undefined): string {
  if (document === undefined) {
    return 'not money';
  }
  const {amount} = document;
  const written =
    amount === null ? '?' : [String(amount.minorUnits / 100), amount.currency].join(' ');
  return [document.kind, written, ...(document.verified ? [] : ['(to review)'])].join(' ');
}

/** How often the models read an email the same way, and the emails they read differently. */
export function agreement(results: readonly TrialResult[]): string[] {
  const ids = [
    ...new Set(results.flatMap(result => result.documents.map(document => document.id))),
  ];
  const readings = ids.map(id => ({
    id,
    each: results.map(result => reading(result.documents.find(document => document.id === id))),
  }));
  const differing = readings.filter(({each}) => new Set(each).size > 1);
  return [
    `Same reading by every model: ${String(ids.length - differing.length)} of ${String(ids.length)} document(s)`,
    ...differing.slice(0, 15).map(({id, each}) => {
      const byModel = each.map((text, index) => [results[index]?.model ?? '', text].join(' → '));
      return `  ${id}: ${byModel.join(' | ')}`;
    }),
  ];
}
