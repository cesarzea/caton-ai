import type {CommandContext} from '../context.ts';
import {migrated} from '../migrate.ts';

/** `caton config migrate`: converts the configuration file to instances, keeping a backup. */
export function configCommand(context: CommandContext, args: readonly string[]): number {
  if (args[0] !== 'migrate') {
    context.output.line('Usage: caton config migrate');
    return 2;
  }
  const raw = context.configFile.read();
  if (typeof raw === 'object' && raw !== null && 'instances' in raw) {
    context.output.line('The configuration already uses instances');
    return 0;
  }
  const {config, secretsToEnter} = migrated(raw);
  const backup = context.configFile.replace(config);
  context.output.line(
    `✓ Configuration migrated to ${String(config.instances.length)} instance(s); backup: ${backup}`,
  );
  secretsToEnter.forEach(secret => {
    context.output.line(`  Enter in the web interface (caton serve): ${secret}`);
  });
  return 0;
}
