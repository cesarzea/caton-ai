import {matchDocuments} from '@caton-ai/core';
import type {Lookup} from '@caton-ai/instances';
import type {Ledger} from '@caton-ai/ledger';
import {syncConnection} from '@caton-ai/sync';
import type {SyncOutcome} from '@caton-ai/sync';

import {connections} from '../context.ts';
import type {CommandContext} from '../context.ts';
import {callRecord} from '../model-calls.ts';
import type {ModelCall} from '../model-calls.ts';
import {storeLookup} from '../secrets.ts';
import {stagedState} from '../state.ts';

const DAY_MS = 86_400_000;

function report(context: CommandContext, outcome: SyncOutcome): boolean {
  if (!outcome.ok) {
    context.output.error(`✗ ${outcome.name}: ${outcome.error}`);
    return false;
  }
  const documents = outcome.documents > 0 ? `, ${String(outcome.documents)} document(s)` : '';
  context.output.line(
    `✓ ${outcome.name}: ${String(outcome.accounts)} account(s), ${String(outcome.transactions)} movement(s)${documents}`,
  );
  return true;
}

/**
 * Links the documents still unlinked to their transactions (ADR 0016). It runs once after every
 * connection synced, because a receipt and its charge usually come through different ones.
 */
function linkDocuments(ledger: Ledger, now: Date): void {
  const unlinked = ledger.unlinkedDocuments();
  const earliest = unlinked.reduce(
    (min, document) => Math.min(min, Date.parse(document.issuedOn)),
    now.getTime(),
  );
  const from = new Date(earliest - 7 * DAY_MS).toISOString().slice(0, 10);
  ledger.linkDocuments(matchDocuments(unlinked, ledger.transactions(from)), now);
}

/**
 * Syncs the connections named, or all of them when null, reading secrets through `lookup`, then
 * links documents across all of them. Each outcome is reported as it happens.
 */
export async function syncConnections(
  context: CommandContext,
  lookup: Lookup,
  names: readonly string[] | null,
  onOutcome: (outcome: SyncOutcome) => void = () => undefined,
): Promise<void> {
  const ledger = context.ledger();
  const prices = context.prices();
  await prices.refresh();
  const onModelCall = (call: ModelCall): void => {
    const at = context.now();
    ledger.recordModelCall(callRecord(call, at, prices.price(call.usage, at)));
  };
  const chosen = connections(context).filter(instance => names?.includes(instance.id) ?? true);
  for (const instance of chosen) {
    const state = stagedState(ledger.connectorState(instance.id));
    onOutcome(
      await syncConnection({
        name: instance.id,
        source: () => context.source(instance, lookup, {onModelCall, state: state.port}),
        ledger,
        now: context.now,
        state: state.staged,
      }),
    );
  }
  linkDocuments(ledger, context.now());
  ledger.close();
}

/** `caton sync [connection…]`: every connection, or the ones named; returns the exit code. */
export async function syncCommand(
  context: CommandContext,
  names: readonly string[],
): Promise<number> {
  const known = connections(context).map(instance => instance.id);
  const unknown = names.filter(name => !known.includes(name));
  if (unknown.length > 0) {
    context.output.error(
      `Unknown connection: ${unknown.join(', ')}. Connections: ${known.join(', ')}`,
    );
    return 2;
  }
  const lookup = await storeLookup(context.config(), context.catalog, context.secrets.open);
  let failures = 0;
  await syncConnections(context, lookup, names.length === 0 ? null : names, outcome => {
    failures += report(context, outcome) ? 0 : 1;
  });
  return failures === 0 ? 0 : 1;
}
