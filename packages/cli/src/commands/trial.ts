import {PartialReadError} from '@caton-ai/core';
import type {FinancialDocument} from '@caton-ai/core';

import type {CommandContext} from '../context.ts';
import {callRecord} from '../model-calls.ts';
import type {OnModelCall} from '../model-calls.ts';
import {table} from '../output.ts';
import {storeLookup} from '../secrets.ts';
import {stagedState} from '../state.ts';
import {agreement, trialRow} from './trial-report.ts';
import type {TrialResult} from './trial-report.ts';

const TRIAL_USAGE = 'Usage: caton trial <connection> <model> <model>… [--emails N]';

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
interface Tally {
  model: string;
  calls: number;
  costNanoUsd: number;
  unpriced: number;
}

/** Records each call of a trial, as any other, and adds up what it cost. */
function counting({context, connection}: Trial, tally: Tally): OnModelCall {
  const ledger = context.ledger();
  const prices = context.prices();
  return call => {
    const at = context.now();
    const cost = prices.price(call.usage, at);
    ledger.recordModelCall(callRecord({...call, connection: `${connection}:trial`}, at, cost));
    tally.calls += 1;
    tally.costNanoUsd += cost.costNanoUsd ?? 0;
    tally.unpriced += cost.costNanoUsd === null ? 1 : 0;
  };
}

async function tryModel(trial: Trial, model: string): Promise<TrialResult> {
  const {context, connection, emails} = trial;
  const instance = context.config().instances.find(candidate => candidate.id === connection);
  const lookup = await storeLookup(context.config(), context.catalog, context.secrets.open);
  const tally: Tally = {model, calls: 0, costNanoUsd: 0, unpriced: 0};
  const hooks = {
    modelInstance: model,
    state: stagedState(null).port,
    onModelCall: counting(trial, tally),
  };
  const settings = {...instance?.settings, 'max-per-sync': emails};
  const trialed = {...(instance ?? {id: connection, title: connection, plugin: ''}), settings};
  const started = Date.now();
  const read = await documentsOf(
    () => context.source(trialed, lookup, hooks).listDocuments?.('') ?? Promise.resolve([]),
  );
  return {...tally, ...read, seconds: (Date.now() - started) / 1000};
}

/** Why the models named are not all configured, or null. */
function unknownModels(context: CommandContext, models: readonly string[]): string | null {
  const configured = context
    .config()
    .instances.filter(instance => context.modelPlugins.has(instance.plugin))
    .map(instance => instance.id);
  const unknown = models.filter(model => !configured.includes(model));
  const available = configured.length === 0 ? 'none yet' : configured.join(', ');
  return unknown.length === 0
    ? null
    : `Unknown model(s): ${unknown.join(', ')}. Configured models: ${available}; add them under Language models in caton serve.`;
}

interface TrialRequest {
  readonly connection: string;
  readonly models: readonly string[];
  readonly emails: number;
}

/** The trial asked for; `emails` is 0 when its count is not a positive whole number. */
function trialRequest(args: readonly string[]): TrialRequest {
  const flag = args.indexOf('--emails');
  const count = flag < 0 ? 20 : Number.parseInt(args[flag + 1] ?? '', 10);
  const rest = args.filter((_, index) => flag < 0 || (index !== flag && index !== flag + 1));
  const [connection = '', ...models] = rest;
  return {connection, models, emails: Number.isInteger(count) && count > 0 ? count : 0};
}

/** Why a trial cannot run, or null. */
function trialProblem(context: CommandContext, request: TrialRequest): string | null {
  const known = context.config().instances.some(instance => instance.id === request.connection);
  if (!known || request.models.length === 0 || request.emails === 0) {
    return TRIAL_USAGE;
  }
  return unknownModels(context, request.models);
}

/**
 * Reads the same emails of a connection with each model, saving no document and moving no
 * cursor, and compares what each found and what it cost (every call is still recorded).
 */
export async function trialCommand(
  context: CommandContext,
  args: readonly string[],
): Promise<number> {
  const request = trialRequest(args);
  const problem = trialProblem(context, request);
  if (problem !== null) {
    context.output.error(problem);
    return 2;
  }
  const {connection, models, emails} = request;
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
