import type {ModelSpend} from '@caton-ai/ledger';

import type {CommandContext} from '../context.ts';

const usd = (nano: number): string => `$${(nano / 1e9).toFixed(4)}`;

function spendLine(spend: ModelSpend): string {
  const notes = [
    ...(spend.estimated > 0 ? [`${String(spend.estimated)} estimated`] : []),
    ...(spend.unpriced > 0 ? [`${String(spend.unpriced)} with unknown price`] : []),
  ];
  const suffix = notes.length === 0 ? '' : ` (${notes.join(', ')})`;
  return `  ${spend.provider}/${spend.model}: ${String(spend.calls)} call(s), ${usd(spend.costNanoUsd)}${suffix}`;
}

/**
 * The prices in use and what language model calls cost this month. Prices that could not be
 * refreshed are a failure: estimates would silently age.
 */
export function modelSpendReport(context: CommandContext, spend: readonly ModelSpend[]): boolean {
  const {date, error} = context.prices().state();
  context.output.line(
    date === null
      ? 'Model prices: the ones bundled with Catón AI (not downloaded yet)'
      : `Model prices: downloaded ${date}`,
  );
  if (error !== null) {
    context.output.error(`✗ Model prices could not be refreshed: ${error}`);
  }
  if (spend.length > 0) {
    context.output.line('Language model calls this month:');
    spend.forEach(item => {
      context.output.line(spendLine(item));
    });
  }
  return error === null && spend.every(item => item.unpriced === 0);
}
