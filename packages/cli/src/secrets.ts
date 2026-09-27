import {storeNeeds} from '@caton-ai/instances';
import type {Catalog, Lookup} from '@caton-ai/instances';
import type {Vault} from '@caton-ai/secrets';

import {ConfigError} from './config.ts';
import type {CatonConfig} from './config.ts';

/**
 * How the instances read the store during one sync. The store is opened, and its passphrase
 * asked, once and only if some instance needs it. If it cannot be opened, only the instances
 * that need it fail.
 */
export async function storeLookup(
  config: CatonConfig,
  catalog: Catalog,
  openVault: () => Promise<Vault>,
): Promise<Lookup> {
  if (storeNeeds(config.instances, catalog).size === 0) {
    return () => undefined;
  }
  const vault = await openVault().catch((error: unknown) =>
    error instanceof Error ? error : new Error(String(error)),
  );
  return key => {
    if (vault instanceof Error) {
      throw vault;
    }
    return vault.get(key);
  };
}

/** Asks for the store passphrase; a new one is typed twice. */
export function passphraseAsker(
  ask: (question: string) => Promise<string>,
): (confirm: boolean) => Promise<string> {
  return async confirm => {
    const passphrase = await ask('Secret store passphrase: ');
    if (!confirm) {
      return passphrase;
    }
    if ((await ask('Repeat the passphrase: ')) !== passphrase) {
      throw new ConfigError('The passphrases do not match');
    }
    return passphrase;
  };
}
