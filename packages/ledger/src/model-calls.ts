import type {DatabaseSync} from 'node:sqlite';

/** One language model call, priced when it was made. */
export interface ModelCallRecord {
  readonly at: Date;
  /** The connection that made the call, and the model instance it used. */
  readonly connection: string;
  readonly modelInstance: string;
  readonly provider: string;
  readonly model: string;
  readonly outcome: 'ok' | 'failed';
  readonly inputTokens: number | null;
  readonly cacheReadTokens: number | null;
  readonly cacheWriteTokens: number | null;
  readonly outputTokens: number | null;
  /** Billionths of a US dollar, exact to add up; null when the price is unknown. */
  readonly costNanoUsd: number | null;
  /** Reported by the provider, estimated from published prices, or unknown. */
  readonly costSource: 'reported' | 'estimated' | 'unknown';
  /** The date of the price data an estimate used. */
  readonly pricesDate: string | null;
}

/** What calls to one model cost over a period. */
export interface ModelSpend {
  readonly provider: string;
  readonly model: string;
  readonly calls: number;
  readonly costNanoUsd: number;
  /** Calls whose cost is unknown, so the total is a lower bound. */
  readonly unpriced: number;
  readonly estimated: number;
}

export function insertModelCall(database: DatabaseSync, call: ModelCallRecord): void {
  database
    .prepare(
      `INSERT INTO model_calls (at, connection, model_instance, provider, model, outcome,
         input_tokens, cache_read_tokens, cache_write_tokens, output_tokens, cost_nano_usd,
         cost_source, prices_date)
       VALUES ($at, $connection, $modelInstance, $provider, $model, $outcome, $inputTokens,
         $cacheReadTokens, $cacheWriteTokens, $outputTokens, $costNanoUsd, $costSource,
         $pricesDate)`,
    )
    .run({...call, at: call.at.toISOString()});
}

const spendRow = (row: Record<string, unknown>): ModelSpend => ({
  provider: String(row['provider']),
  model: String(row['model']),
  calls: Number(row['calls']),
  costNanoUsd: Number(row['cost']),
  unpriced: Number(row['unpriced']),
  estimated: Number(row['estimated']),
});

/** Spend per model on calls made since `from`, an ISO date or timestamp. */
export function readModelSpend(database: DatabaseSync, from: string): ModelSpend[] {
  return database
    .prepare(
      `SELECT provider, model, COUNT(*) AS calls, COALESCE(SUM(cost_nano_usd), 0) AS cost,
         SUM(cost_source = 'unknown') AS unpriced, SUM(cost_source = 'estimated') AS estimated
       FROM model_calls WHERE at >= $from
       GROUP BY provider, model ORDER BY cost DESC, calls DESC`,
    )
    .all({from})
    .map(spendRow);
}
