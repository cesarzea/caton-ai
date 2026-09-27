import {connections} from '../context.ts';
import type {CommandContext} from '../context.ts';
import {table} from '../output.ts';

/** Shows the latest sync of every connection; a failing one makes the command fail. */
export function statusCommand(context: CommandContext): number {
  const ledger = context.ledger();
  const runs = connections(context).map(instance => ({
    name: instance.id,
    run: ledger.lastRun(instance.id),
  }));
  ledger.close();
  const rows = runs.map(({name, run}) => [
    name,
    run === null ? 'never synced' : run.outcome,
    run?.finishedAt ?? '—',
    run?.error ?? '',
  ]);
  table([['Connection', 'Last sync', 'At', 'Error'], ...rows]).forEach(line => {
    context.output.line(line);
  });
  return runs.every(({run}) => run?.outcome === 'ok') ? 0 : 1;
}
