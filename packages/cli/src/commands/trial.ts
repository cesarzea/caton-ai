import {PartialReadError} from '@caton-ai/core';
import type {FinancialDocument} from '@caton-ai/core';

import type {CommandContext} from '../context.ts';
import {callRecord} from '../model-calls.ts';
import {table} from '../output.ts';
import {storeLookup} from '../secrets.ts';
import {stagedState} from '../state.ts';
import {agreement, trialRow} from './trial-report.ts';
import type {TrialResult} from './trial-report.ts';

export const TRIAL_USAGE = 'Usage: caton trial <connection> <model> <model>… [--emails N]';

async function documentsOf(
  read: () => Promise<readonly FinancialDocument[]>,
): Promise<{documents: readonly FinancialDocument[]; error: string | null}> {
  try {
    return {documents: await read(), error: null};
  } catch (error) {
    if (error instanceof PartialReadError) {
      return {documents: error.documents, error: error.message};
    }
    return {documents: [], error: error instanceof Error ? error.message : String(error)};
  }
}

type Trial = Readonly<{context: CommandContext; connection: string; emails: number}>;

async function tryModel({context, connection, emails}: Trial, model: string): Promise<TrialResult> {
  const instance = context.config().instances.find(candidate => candidate.id === connection);
  const lookup = await storeLookup(context.config(), context.catalog, context.secrets.open);
  const ledger = context.ledger();
  const prices = context.prices();
  const result = {model, calls: 0, costNanoUsd: 0, unpriced: 0};
  const settings = {...instance?.settings, 'max-per-sync': emails};
  const source = context.source(
    {...(instance ?? {id: connection, title: connection, plugin: ''}), settings},
    lookup,
    {
      modelInstance: model,
      state: stagedState(null).port,
      onModelCall: call => {
        const at = context.now();
        const cost = prices.price(call.usage, at);
        ledger.recordModelCall(callRecord({...call, connection: `${connection}:trial`}, at, cost));
        result.calls += 1;
        result.costNanoUsd += cost.costNanoUsd ?? 0;
        result.unpriced += cost.costNanoUsd === null ? 1 : 0;
      },
    },
  );
  const started = Date.now();
  const read = await documentsOf(() => source.listDocuments?.('') ?? Promise.resolve([]));
  ledger.close();
  return {...result, ...read, seconds: (Date.now() - started) / 1000};
}

function trialArguments(args: readonly string[]): {
  connection: string | undefined;
  models: string[];
  emails: number | null;
} {
  const flag = args.indexOf('--emails');
  const count = flag < 0 ? 20 : Number.parseInt(args[flag + 1] ?? '', 10);
  const rest = args.filter((_, index) => flag < 0 || (index !== flag && index !== flag + 1));
  const [connection, ...models] = rest;
  return {connection, models, emails: Number.isInteger(count) && count > 0 ? count : null};
}

/**
 * Reads the same emails of a connection with each model, saving no document and moving no
 * cursor, and compares what each found and what it cost (every call is still recorded).
 */
export async function trialCommand(
  context: CommandContext,
  args: readonly string[],
): Promise<number> {
  const {connection, models, emails} = trialArguments(args);
  const known = context.config().instances.some(instance => instance.id === connection);
  if (connection === undefined || models.length === 0 || !known || emails === null) {
    context.output.error(TRIAL_USAGE);
    return 2;
  }
  await context.prices().refresh();
  const results: TrialResult[] = [];
  for (const model of models) {
    results.push(await tryModel({context, connection, emails}, model));
  }
  const header = ['Model', 'Emails', 'Documents', 'Verified', 'Cost', 'Seconds', 'Problem'];
  table([header, ...results.map(trialRow)]).forEach(line => {
    context.output.line(line);
  });
  agreement(results).forEach(line => {
    context.output.line(line);
  });
  return results.every(item => item.error === null) ? 0 : 1;
}
