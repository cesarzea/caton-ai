import type {CommandContext} from '../context.ts';
import {syncConnections} from './sync.ts';

export const DEFAULT_PORT = 7170;

/** Starts the local web interface; the process keeps serving after the command returns. */
export async function serveCommand(context: CommandContext, port: number): Promise<number> {
  const web = await context.startWeb(port, (names, lookup) =>
    syncConnections(context, lookup, names),
  );
  context.output.line(`Catón AI is running at ${web.origin} (this computer only).`);
  context.output.line('Open this one-time link to sign in; it expires in 10 minutes:');
  context.output.line(web.accessLink());
  return 0;
}
