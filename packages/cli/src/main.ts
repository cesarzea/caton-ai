import {existsSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {emailAlertsConnector} from '@caton-ai/email-alerts';
import {enableBankingConnector} from '@caton-ai/enable-banking';
import {openLedger, openLedgerReadOnly} from '@caton-ai/ledger';
import {llmProvider} from '@caton-ai/llm';
import {storeNeeds} from '@caton-ai/instances';
import {serveOverStdio} from '@caton-ai/mcp';
import {initVault, openVault, osCredentialStore} from '@caton-ai/secrets';
import {loadAssets, startServer} from '@caton-ai/server';

import {run} from './app.ts';
import {loadConfig} from './config.ts';
import type {CatonConfig} from './config.ts';
import {connectionStatuses} from './connection-status.ts';
import {configFile} from './config-file.ts';
import {editableConfiguration, pluginInfos} from './configuration.ts';
import {catalogOf, modelPluginsOf, sourceFactory} from './connectors.ts';
import {terminalOutput} from './output.ts';
import {configDirectory, dataDirectory} from './paths.ts';
import {priceBook} from './prices.ts';
import type {PriceBook} from './prices.ts';
import {passphraseAsker} from './secrets.ts';
import {terminalInput} from './terminal.ts';

let loadedConfig: CatonConfig | undefined;
const forgetConfig = (): void => {
  loadedConfig = undefined;
};
const config = (): CatonConfig => (loadedConfig ??= loadConfig(configDirectory(process.env)));
const output = terminalOutput(process.stdout, process.stderr);
const ledgerPath = (): string => join(dataDirectory(process.env), 'ledger.sqlite');
let loadedPrices: PriceBook | undefined;
const prices = (): PriceBook =>
  (loadedPrices ??= priceBook(
    join(dataDirectory(process.env), 'prices.json'),
    () => new Date(),
    fetch,
  ));
// Prompts go to stderr: stdout belongs to command output, and to the protocol under `caton mcp`.
const terminal = terminalInput(process.stdin, process.stderr);
const plugins = {
  connectors: [enableBankingConnector, emailAlertsConnector],
  models: [llmProvider],
};
const catalog = catalogOf(plugins);
const modelPlugins = modelPluginsOf(plugins);
const pluginDirectory = (plugin: string): string =>
  join(configDirectory(process.env), 'plugins', plugin);
const file = configFile(configDirectory(process.env), () => new Date());
const webDirectory = fileURLToPath(new URL('../../web/dist', import.meta.url));
const keyDependencies = {
  askPassphrase: passphraseAsker(terminal.hidden),
  credentials: osCredentialStore(),
};

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
    prices,
    source: sourceFactory(plugins, pluginDirectory, () => config().instances),
    catalog,
    modelPlugins,
    configFile: file,
    secrets: {
      init: key => initVault(configDirectory(process.env), key, keyDependencies),
      open: () => openVault(configDirectory(process.env), keyDependencies),
    },
    readSecretValue: terminal.secretValue,
    startWeb: port =>
      startServer({
        port,
        secretsDirectory: configDirectory(process.env),
        credentials: keyDependencies.credentials,
        connections: () =>
          connectionStatuses(
            config().instances.filter(instance => !modelPlugins.has(instance.plugin)),
            () => (existsSync(ledgerPath()) ? openLedgerReadOnly(ledgerPath()) : null),
          ),
        secretNeeds: () => storeNeeds(config().instances, catalog),
        plugins: pluginInfos(plugins),
        configuration: editableConfiguration(config, file, forgetConfig),
        assets: loadAssets(webDirectory),
        log: message => {
          process.stderr.write(`${message}\n`);
        },
      }),
    output,
    now: () => new Date(),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
  });
} catch (error) {
  output.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
