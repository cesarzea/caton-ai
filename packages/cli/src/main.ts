import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

import {createEnableBankingSource} from '@caton-ai/enable-banking';
import {openLedger} from '@caton-ai/ledger';

import {run} from './app.ts';
import {loadConfig, readPrivateKey} from './config.ts';
import type {CatonConfig} from './config.ts';
import {terminalOutput} from './output.ts';
import {configDirectory, dataDirectory} from './paths.ts';

let loadedConfig: CatonConfig | undefined;
const config = (): CatonConfig => (loadedConfig ??= loadConfig(configDirectory(process.env)));
const output = terminalOutput(process.stdout, process.stderr);

try {
  process.exitCode = await run(process.argv.slice(2), {
    config,
    ledger: () => {
      const directory = dataDirectory(process.env);
      mkdirSync(directory, {recursive: true, mode: 0o700});
      return openLedger(join(directory, 'ledger.sqlite'));
    },
    source: connection => {
      const {enableBanking} = config();
      return createEnableBankingSource({
        appId: enableBanking.appId,
        privateKeyPem: readPrivateKey(config()),
        sessionId: connection.sessionId,
      });
    },
    output,
    now: () => new Date(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
  });
} catch (error) {
  output.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
