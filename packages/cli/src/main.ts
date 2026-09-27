import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

import {emailAlertsConnector} from '@caton-ai/email-alerts';
import {enableBankingConnector} from '@caton-ai/enable-banking';
import {openLedger, openLedgerReadOnly} from '@caton-ai/ledger';
import {serveOverStdio} from '@caton-ai/mcp';

import {run} from './app.ts';
import {loadConfig} from './config.ts';
import {sourceFactory} from './connectors.ts';
import type {CatonConfig} from './config.ts';
import {terminalOutput} from './output.ts';
import {configDirectory, dataDirectory} from './paths.ts';
import {macOsKeychain} from './keychain.ts';
import {secretReader} from './secrets.ts';

let loadedConfig: CatonConfig | undefined;
const config = (): CatonConfig => (loadedConfig ??= loadConfig(configDirectory(process.env)));
const output = terminalOutput(process.stdout, process.stderr);
const ledgerPath = (): string => join(dataDirectory(process.env), 'ledger.sqlite');

try {
  process.exitCode = await run(process.argv.slice(2), {
    config,
    ledger: () => {
      const directory = dataDirectory(process.env);
      mkdirSync(directory, {recursive: true, mode: 0o700});
      return openLedger(ledgerPath());
    },
    readOnlyLedger: () => openLedgerReadOnly(ledgerPath()),
    serveMcp: serveOverStdio,
    source: sourceFactory([enableBankingConnector, emailAlertsConnector], config, {
      secret: secretReader(macOsKeychain),
    }),
    output,
    now: () => new Date(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
  });
} catch (error) {
  output.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
